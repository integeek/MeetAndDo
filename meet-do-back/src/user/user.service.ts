import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PublisherApplicationDetailsDto,
  PublisherApplicationDto,
} from './dto/publisher-application.dto';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailerService: MailerService,
  ) {}

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
      .select(
        'id, firstname, lastname, email, role, address, enabled, created_at, publisher_request, publisher_request_details, publisher_request_submitted_at, avatar_url',
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`getProfile: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!data)
      throw new HttpException('Utilisateur introuvable', HttpStatus.NOT_FOUND);
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
  async updateProfile(
    id: number,
    data: { firstname?: string; lastname?: string; address?: string },
  ) {
    const { data: updated, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .update(data)
      .eq('id', id)
      .select(
        'id, firstname, lastname, email, role, address, enabled, created_at, publisher_request, publisher_request_details, publisher_request_submitted_at, avatar_url',
      )
      .single();

    if (error) {
      this.logger.error(`updateProfile: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return updated;
  }

  async requestPublisher(
    id: number,
    data: PublisherApplicationDto = {},
  ) {
    const applicationDetails = this.sanitizePublisherApplication(
      data.application,
    );
    const updateData = {
      publisher_request: true,
      publisher_request_details: applicationDetails,
      publisher_request_submitted_at: new Date().toISOString(),
      ...(data.firstname ? { firstname: data.firstname.trim() } : {}),
      ...(data.lastname ? { lastname: data.lastname.trim() } : {}),
      ...(data.address ? { address: data.address.trim() } : {}),
    };

    const { data: user, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(
        'id, firstname, lastname, email, role, address, enabled, created_at, publisher_request, publisher_request_details, publisher_request_submitted_at, avatar_url',
      )
      .single();

    if (error) {
      this.logger.error(`requestPublisher: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { message: 'Publisher application sent successfully.', user };
  }

  private sanitizePublisherApplication(
    application?: PublisherApplicationDetailsDto,
  ) {
    const safeApplication = application ?? {};
    const fields: Array<keyof PublisherApplicationDetailsDto> = [
      'experienceLevel',
      'activityCategory',
      'motivation',
      'activityPlan',
      'links',
    ];

    return fields.reduce<Record<string, string>>((acc, field) => {
      const value = safeApplication[field];
      if (typeof value === 'string' && value.trim()) {
        acc[field] = value.trim();
      }
      return acc;
    }, {});
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.getById(id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      throw new HttpException(
        'Mot de passe actuel incorrect.',
        HttpStatus.BAD_REQUEST,
      );
    const hashed = await bcrypt.hash(newPassword, 10);
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .update({ password: hashed })
      .eq('id', id);
    if (error) {
      this.logger.error(`changePassword: ${error.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { message: 'Mot de passe modifié avec succès.' };
  }

  async uploadAvatar(
    id: number,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const extensionsByMimeType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    const ext = extensionsByMimeType[file.mimetype];

    if (!ext) {
      throw new HttpException(
        'Format image non autorisé.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { data: currentUser, error: currentUserError } =
      await this.supabaseService
        .getAdminClient()
        .from('users')
        .select('avatar_url')
        .eq('id', id)
        .maybeSingle();

    if (currentUserError) {
      this.logger.error(
        `uploadAvatar current user: ${currentUserError.message}`,
      );
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const path = `avatar/${id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await this.supabaseService
      .getAdminClient()
      .storage.from('avatar')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) {
      this.logger.error(`uploadAvatar: ${uploadError.message}`);
      throw new HttpException(
        'Erreur upload avatar.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const { data } = this.supabaseService
      .getAdminClient()
      .storage.from('avatar')
      .getPublicUrl(path);

    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', id);
    if (updateError) {
      this.logger.error(`uploadAvatar update: ${updateError.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const oldAvatarPath = this.getAvatarStoragePathFromPublicUrl(
      currentUser?.avatar_url,
    );
    if (oldAvatarPath && oldAvatarPath !== path) {
      const { error: removeError } = await this.supabaseService
        .getAdminClient()
        .storage.from('avatar')
        .remove([oldAvatarPath]);

      if (removeError) {
        this.logger.warn(`uploadAvatar remove old: ${removeError.message}`);
      }
    }

    return { avatar_url: publicUrl };
  }

  private getAvatarStoragePathFromPublicUrl(url?: string | null) {
    if (!url) return null;

    try {
      const parsedUrl = new URL(url);
      const marker = '/storage/v1/object/public/avatar/';
      const markerIndex = parsedUrl.pathname.indexOf(marker);

      if (markerIndex === -1) return null;

      return decodeURIComponent(
        parsedUrl.pathname.slice(markerIndex + marker.length),
      );
    } catch (_error) {
      return null;
    }
  }

  async updatePassword(id: number, oldPassword: string, newPassword: string) {
    const { data: user, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('password, email')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new HttpException(
        'Old password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { data, error: updateError } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      this.logger.error(`updatePassword erreur: ${updateError.message}`);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Your password has been changed - Meet&Do',
      html: `
  <!DOCTYPE html>
  <html>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">

      <div style="width:100%; background-color:#004AAD; padding:20px 0; text-align:center;">
          <h1 style="color:white; margin:0; font-size:2rem; letter-spacing:1px;">Meet&Do</h1>
      </div>

      <div style="max-width:600px; margin:30px auto; background-color:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="padding:40px;">
              <h3 style="text-align:center; color:#004AAD; font-size:1.4rem; margin-bottom:30px;">
                  Your password has been updated 🔒
              </h3>

              <p style="color:#333;">Hello,</p>
              <p style="color:#555; line-height:1.6;">
                  Your password on <strong>Meet&Do</strong> has been successfully changed.
                  If you did not make this change, please contact us immediately.
              </p>

              <div style="background-color:#fff3cd; border:1px solid #ffc107; border-radius:8px; padding:16px; margin:25px 0;">
                  <p style="color:#856404; margin:0; font-size:0.95rem;">
                      ⚠️ If you did not request this change, please secure your account immediately by contacting our support team.
                  </p>
              </div>

              <div style="text-align:center; margin:35px 0;">
                  <a href="http://localhost:5500/meet-do-front/Page/Login.html"
                    style="background-color:#004AAD; color:white; padding:14px 32px; border-radius:25px; 
                            text-decoration:none; font-size:1rem; font-weight:bold; display:inline-block;">
                      Go to my account →
                  </a>
              </div>

              <div style="border-top:1px solid #e0e0e0; margin:30px 0;"></div>

              <p style="color:#555; text-align:center; font-size:0.9rem;">
                  Our team remains at your disposal for any questions.<br>
                  <strong>Phone :</strong> +33 6 07 46 76 89 &nbsp;|&nbsp; 
                  <strong>Email :</strong> meetanddosav@gmail.com
              </p>
          </div>

          <div style="background-color:#f9f9f9; padding:20px; text-align:center; border-top:1px solid #e0e0e0;">
              <p style="color:#999; font-size:0.85rem; margin-bottom:15px;">Stay connected !</p>
              <div>
                  <a href="https://www.facebook.com" style="margin:0 10px;">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/960px-2023_Facebook_icon.svg.png" 
                          alt="Facebook" style="width:30px; height:30px;">
                  </a>
                  <a href="https://www.instagram.com" style="margin:0 10px;">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/960px-Instagram_icon.png" 
                          alt="Instagram" style="width:30px; height:30px;">
                  </a>
                  <a href="https://www.linkedin.com" style="margin:0 10px;">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/LinkedIn_logo_initials.png/960px-LinkedIn_logo_initials.png" 
                          alt="LinkedIn" style="width:30px; height:30px;">
                  </a>
              </div>
              <p style="color:#ccc; font-size:0.75rem; margin-top:15px;">© 2026 Meet&Do.</p>
          </div>
      </div>

  </body>
  </html>
  `,
    });

    return { message: 'Mot de passe modifié avec succès.' };
  }
}
