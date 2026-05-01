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

  findOne(id: number) {
    return `This action returns a #${id} reservation`;
  }

  update(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }

  remove(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
