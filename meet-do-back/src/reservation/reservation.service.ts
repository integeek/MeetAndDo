import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  constructor(private readonly supabaseService: SupabaseService) {}
  create(createReservationDto: CreateReservationDto) {
    return 'This action adds a new reservation';
  }

   async findAll() {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('reservation')
      .select('*')
      .order('date', { ascending: false })
   
    if (error) {
      this.logger.error(`findAll erreur: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  
    return data;
  }

  async findByUserId(id: number) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('reservation')
    .select(`
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
          price
        )
      )
    `)
    .eq('id_user', id)
    .order('date', { ascending: false });

    if (error) {
      this.logger.error(`findByUserId erreur: ${error.message}`);
      throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data;
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
      throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { message: 'Reservation successfully cancelled' };
  }
}
