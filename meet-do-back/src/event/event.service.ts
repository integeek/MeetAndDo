import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class EventService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createEventDto: CreateEventDto) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('event')
      .insert([createEventDto])
      .select('id, date, id_activity')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  private async getReservedPlacesByEventIds(eventIds: number[]) {
    if (!eventIds.length) return new Map<number, number>();

    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservation')
      .select('id_event, group_size')
      .in('id_event', eventIds);

    if (error) throw new Error(error.message);

    return (data || []).reduce((reservedPlacesByEvent, reservation) => {
      const eventId = Number(reservation.id_event);
      const reservedPlaces =
        reservedPlacesByEvent.get(eventId) || 0;

      reservedPlacesByEvent.set(
        eventId,
        reservedPlaces + Number(reservation.group_size || 0),
      );

      return reservedPlacesByEvent;
    }, new Map<number, number>());
  }

  private async decorateEventsWithAvailability(events: any[]) {
    const activityIds = [
      ...new Set(events.map((event) => Number(event.id_activity))),
    ].filter((activityId) => Number.isInteger(activityId));
    const eventIds = events.map((event) => Number(event.id));

    const { data: activities, error: activitiesError } =
      await this.supabaseService
        .getClient()
        .from('activity')
        .select('id, group_size')
        .in('id', activityIds);

    if (activitiesError) throw new Error(activitiesError.message);

    const groupSizeByActivity = new Map(
      (activities || []).map((activity) => [
        Number(activity.id),
        Number(activity.group_size || 0),
      ]),
    );
    const reservedPlacesByEvent =
      await this.getReservedPlacesByEventIds(eventIds);

    return events.map((event) => {
      const activityGroupSize =
        groupSizeByActivity.get(Number(event.id_activity)) || 0;
      const reservedPlaces =
        reservedPlacesByEvent.get(Number(event.id)) || 0;

      return {
        ...event,
        activity_group_size: activityGroupSize,
        reserved_places: reservedPlaces,
        available_places: Math.max(activityGroupSize - reservedPlaces, 0),
      };
    });
  }

  async findAll(activityId?: number) {
    let query = this.supabaseService
      .getClient()
      .from('event')
      .select('id, date, id_activity')
      .order('date', { ascending: true });

    if (activityId !== undefined) {
      query = query.eq('id_activity', activityId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return this.decorateEventsWithAvailability(data || []);
  }

  async findOne(id: number) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('event')
      .select('id, date, id_activity')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Event not found');

    const [event] = await this.decorateEventsWithAvailability([data]);
    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('event')
      .update(updateEventDto)
      .eq('id', id)
      .select('id, date, id_activity')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: number) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('event')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true, id };
  }
}
