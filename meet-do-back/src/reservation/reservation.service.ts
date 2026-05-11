import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

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

  private async ensureUserExists(userId: number) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('User not found');
  }

  async create(createReservationDto: CreateReservationDto) {
    if (createReservationDto.group_size <= 0) {
      throw new BadRequestException(
        'Reserved places must be greater than zero',
      );
    }

    await this.ensureUserExists(createReservationDto.id_user);
    const eventId = createReservationDto.id_event;

    const { availablePlaces } = await this.getEventCapacity(eventId);

    if (createReservationDto.group_size > availablePlaces) {
      throw new BadRequestException(
        `Only ${availablePlaces} places are available for this event`,
      );
    }

    const reservationData = {
      date: createReservationDto.date,
      group_size: createReservationDto.group_size,
      id_user: createReservationDto.id_user,
      id_event: eventId,
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
      .getAdminClient()
      .from('reservation')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      this.logger.error(`findAll erreur: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return data;
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

  async findByUserId(id: number) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('reservation')
      .select(
        `
        *,
        event (
          id,
          date,
          id_activity,
          activity (
            id,
            title,
            description,
            address,
            price,
            images
          )
        )
      `,
      )
      .eq('id_user', id)
      .order('date', { ascending: false });

    if (error) {
      this.logger.error(`findByUserId erreur: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

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

  async cancelReservation(id: number, userId: number) {
    const { data: reservation, error: findError } = await this.supabaseService
      .getAdminClient()
      .from('reservation')
      .select('*')
      .eq('id', id)
      .eq('id_user', userId)
      .single();

    if (findError || !reservation) {
      throw new HttpException('Reservation not found', HttpStatus.NOT_FOUND);
    }

    const { error } = await this.supabaseService
      .getAdminClient()
      .from('reservation')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`cancelReservation error: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { message: 'Reservation successfully cancelled' };
  }
}
