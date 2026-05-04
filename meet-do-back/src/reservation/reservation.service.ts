import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReservationService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async getEventCapacity(eventId: number) {
    const { data: event, error: eventError } = await this.supabaseService
      .getClient()
      .from('event')
      .select('id, date, id_activity')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) throw new Error(eventError.message);
    if (!event) throw new NotFoundException('Event not found');

    const { data: activity, error: activityError } =
      await this.supabaseService
        .getClient()
        .from('activity')
        .select('id, group_size')
        .eq('id', event.id_activity)
        .maybeSingle();

    if (activityError) throw new Error(activityError.message);
    if (!activity) throw new NotFoundException('Activity not found');

    const { data: reservations, error: reservationsError } =
      await this.supabaseService
        .getClient()
        .from('reservation')
        .select('group_size')
        .eq('id_event', eventId);

    if (reservationsError) throw new Error(reservationsError.message);

    const reservedPlaces = (reservations || []).reduce(
      (total, reservation) => total + Number(reservation.group_size || 0),
      0,
    );
    const capacity = Number(activity.group_size || 0);

    return {
      event,
      capacity,
      reservedPlaces,
      availablePlaces: Math.max(capacity - reservedPlaces, 0),
    };
  }

  async create(createReservationDto: CreateReservationDto) {
    if (createReservationDto.group_size <= 0) {
      throw new BadRequestException(
        'Reserved places must be greater than zero',
      );
    }

    const { availablePlaces } = await this.getEventCapacity(
      createReservationDto.id_event,
    );

    if (createReservationDto.group_size > availablePlaces) {
      throw new BadRequestException(
        `Only ${availablePlaces} places are available for this event`,
      );
    }

    const reservationData = {
      date: createReservationDto.date,
      group_size: createReservationDto.group_size,
      id_user: createReservationDto.id_user,
      id_event: createReservationDto.id_event,
    };

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('reservation')
      .insert([reservationData])
      .select('id, date, group_size, id_user, id_event')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservation')
      .select('id, date, group_size, id_user, id_event')
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async findOne(id: number) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservation')
      .select('id, date, group_size, id_user, id_event')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Reservation not found');

    return data;
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('reservation')
      .update(updateReservationDto)
      .eq('id', id)
      .select('id, date, group_size, id_user, id_event')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: number) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('reservation')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true, id };
  }
}
