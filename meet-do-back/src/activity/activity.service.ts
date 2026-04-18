import { Injectable } from '@nestjs/common';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ActivityService {
  constructor(private readonly supabaseService: SupabaseService) {}

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
        date: `${eventSlot.date.split('T')[0]}T${eventSlot.heure}:00`,
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
    const { data, error } = await this.supabaseService
      .getClient()
      .from('activity')
      .select('id, title, description, address, group_size, price, id_user, theme, average_rating, images')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  findAll() {
    return `This action returns all activity`;
  }

  update(id: number, updateActivityDto: UpdateActivityDto) {
    return `This action updates a #${id} activity`;
  }

  remove(id: number) {
    return `This action removes a #${id} activity`;
  }
}
