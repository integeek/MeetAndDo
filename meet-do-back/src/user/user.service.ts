import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);
    constructor(private readonly supabaseService: SupabaseService) {}

  async create(userData: CreateUserDto) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .insert({
        email: userData.email,
        password: userData.password,
        role: userData.role,
        enabled: userData.enabled,
        verification_token: userData.verification_token,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`create user erreur: ${error.message}`);
      throw error;
    }
    return data;
  }

  async getByEmail(email: string) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) {
      this.logger.error(`getByEmail erreur: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!data) {
      throw new HttpException(
        'User with this email does not exist',
        HttpStatus.NOT_FOUND,
      );
    }
    return data;
  }
    
  async getById(id: number) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      this.logger.error(`getById erreur: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!data) {
      throw new HttpException(
        'User with this id does not exist',
        HttpStatus.NOT_FOUND,
      );
    }
    return data;
  }
  async getByVerificationToken(token: string) {
  const { data, error } = await this.supabaseService
    .getAdminClient()
    .from('users')
    .select('*')
    .eq('verification_token', token)
    .maybeSingle();

  if (error) {
    this.logger.error(`getByVerificationToken erreur: ${error.message}`);
    throw new HttpException(
      'Something went wrong',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  if (!data) {
    throw new HttpException(
      'Invalid or expired token',
      HttpStatus.BAD_REQUEST,
    );
  }

  return data;
}

async update(id: number, updateData: Partial<UpdateUserDto>) {
  const { data, error } = await this.supabaseService
    .getAdminClient()
    .from('users')
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
}
