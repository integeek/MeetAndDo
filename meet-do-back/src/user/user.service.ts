import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

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
    
  async getProfile(id: number) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('id, firstname, lastname, email, role, address, enabled, created_at, publisher_request, avatar_url')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`getProfile: ${error.message}`);
      throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!data) throw new HttpException('Utilisateur introuvable', HttpStatus.NOT_FOUND);
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

  async updateProfile(id: number, data: { firstname?: string; lastname?: string; address?: string }) {
    const { data: updated, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .update(data)
      .eq('id', id)
      .select('id, firstname, lastname, email, role, address, enabled, created_at, publisher_request, avatar_url')
      .single();

    if (error) {
      this.logger.error(`updateProfile: ${error.message}`);
      throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return updated;
  }

  async requestPublisher(id: number) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .update({ publisher_request: true })
      .eq('id', id);

    if (error) {
      this.logger.error(`requestPublisher: ${error.message}`);
      throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { message: 'Demande envoyée avec succès.' };
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

  async changePassword(id: number, currentPassword: string, newPassword: string) {
    const user = await this.getById(id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new HttpException('Mot de passe actuel incorrect.', HttpStatus.BAD_REQUEST);
    const hashed = await bcrypt.hash(newPassword, 10);
    const { error } = await this.supabaseService.getAdminClient()
      .from('users').update({ password: hashed }).eq('id', id);
    if (error) {
      this.logger.error(`changePassword: ${error.message}`);
      throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { message: 'Mot de passe modifié avec succès.' };
  }

  async uploadAvatar(id: number, file: { buffer: Buffer; originalname: string; mimetype: string }) {
    const ext = file.originalname.split('.').pop();
    const path = `avatar/${id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await this.supabaseService.getAdminClient()
      .storage.from('avatar').upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) {
      this.logger.error(`uploadAvatar: ${uploadError.message}`);
      throw new HttpException('Erreur upload avatar.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const { data } = this.supabaseService.getAdminClient()
      .storage.from('avatar').getPublicUrl(path);
    const { error: updateError } = await this.supabaseService.getAdminClient()
      .from('users').update({ avatar_url: data.publicUrl }).eq('id', id);
    if (updateError) {
      this.logger.error(`uploadAvatar update: ${updateError.message}`);
      throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { avatar_url: data.publicUrl };
  }
}
