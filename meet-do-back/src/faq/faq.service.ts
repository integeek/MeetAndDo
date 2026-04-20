import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { Faq } from './entities/faq.entity';

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);
  constructor(private readonly supabaseService: SupabaseService) {}


  async getAll(): Promise<Faq[]> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('faq')
      .select('id, question, answer')

    if (error) {
      this.logger.error(`getAll erreur: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return data;
  }

  async create(dto: CreateFaqDto): Promise<Faq> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('faq')
      .insert({
        question: dto.question,
        answer: dto.answer
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`create erreur: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return data;
  }

  async update(id: number, updateData: Partial<UpdateFaqDto>) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('faq')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
  
    if (error) {
      this.logger.error(`update erreur: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return data;
  }

  async delete(id: number) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('faq')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`delete erreur: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
