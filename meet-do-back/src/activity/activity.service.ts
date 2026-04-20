import { Injectable } from '@nestjs/common';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ActivityService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private formatEventDate(date: string, heure: string) {
    return `${date.split('T')[0]}T${heure}:00`;
  }

  private normalizeEventSlot(event: { date: string }) {
    const eventDate = new Date(event.date);

    return {
      date: eventDate.toISOString().split('T')[0],
      heure: eventDate.toISOString().slice(11, 16),
    };
  }

  async create(createActivityDto: CreateActivityDto) {
    const adminClient = this.supabaseService.getAdminClient();
    const activityData = {
      title: createActivityDto.title,
      description: createActivityDto.description,
      images: createActivityDto.images || [],
      address: createActivityDto.address,
      theme: createActivityDto.theme,
      average_rating: null,
      group_size: createActivityDto.group_size,
      price: createActivityDto.price,
      is_visible: createActivityDto.is_visible ?? true,
      is_disabled: createActivityDto.is_disabled ?? false,
      id_user: createActivityDto.id_user || null,
    };

    const { data, error } = await adminClient
      .from('activity')
      .insert([activityData])
      .select('id, title, description, address, group_size, price, id_user, theme, average_rating, images');

    if (error) throw new Error(error.message);

    const createdActivity = data[0];
    const eventSlots = createActivityDto.eventSlots || [];

    if (eventSlots.length) {
      const eventsData = eventSlots.map((eventSlot) => ({
        date: this.formatEventDate(eventSlot.date, eventSlot.heure),
        id_activity: createdActivity.id,
      }));

      const { error: eventError } = await adminClient.from('event').insert(eventsData);

      if (eventError) {
        await adminClient.from('activity').delete().eq('id', createdActivity.id);
        throw new Error(eventError.message);
      }
    }

    return {
      ...createdActivity,
      eventSlots,
    };
  }

  async findOne(id: number) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('activity')
      .select('id, title, description, address, group_size, price, id_user, theme, average_rating, images')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);

    const { data: eventData, error: eventError } = await client
      .from('event')
      .select('date')
      .eq('id_activity', id)
      .order('date', { ascending: true });

    if (eventError) throw new Error(eventError.message);

    return {
      ...data,
      eventSlots: (eventData || []).map((event) => this.normalizeEventSlot(event)),
    };
  }

  findAll() {
    return `This action returns all activity`;
  }

  async update(id: number, updateActivityDto: UpdateActivityDto) {
    const adminClient = this.supabaseService.getAdminClient();
    const activityData = {
      ...(updateActivityDto.title !== undefined && { title: updateActivityDto.title }),
      ...(updateActivityDto.description !== undefined && {
        description: updateActivityDto.description,
      }),
      ...(updateActivityDto.images !== undefined && { images: updateActivityDto.images }),
      ...(updateActivityDto.address !== undefined && { address: updateActivityDto.address }),
      ...(updateActivityDto.theme !== undefined && { theme: updateActivityDto.theme }),
      ...(updateActivityDto.group_size !== undefined && {
        group_size: updateActivityDto.group_size,
      }),
      ...(updateActivityDto.price !== undefined && { price: updateActivityDto.price }),
      ...(updateActivityDto.is_visible !== undefined && {
        is_visible: updateActivityDto.is_visible,
      }),
      ...(updateActivityDto.is_disabled !== undefined && {
        is_disabled: updateActivityDto.is_disabled,
      }),
      ...(updateActivityDto.id_user !== undefined && { id_user: updateActivityDto.id_user }),
    };

    const { data: updatedActivity, error } = await adminClient
      .from('activity')
      .update(activityData)
      .eq('id', id)
      .select(
        'id, title, description, address, group_size, price, id_user, theme, average_rating, images',
      )
      .single();

    if (error) throw new Error(error.message);

    if (updateActivityDto.eventSlots !== undefined) {
      const { error: deleteError } = await adminClient.from('event').delete().eq('id_activity', id);

      if (deleteError) throw new Error(deleteError.message);

      if (updateActivityDto.eventSlots.length) {
        const eventsData = updateActivityDto.eventSlots.map((eventSlot) => ({
          date: this.formatEventDate(eventSlot.date, eventSlot.heure),
          id_activity: id,
        }));

        const { error: insertError } = await adminClient.from('event').insert(eventsData);

        if (insertError) throw new Error(insertError.message);
      }
    }

    return this.findOne(updatedActivity.id);
  }

  remove(id: number) {
    return `This action removes a #${id} activity`;
  }
}
