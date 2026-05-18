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
import { MailerService } from '@nestjs-modules/mailer';
import { EventService } from 'src/event/event.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailerService: MailerService,
    private readonly eventService: EventService,
    private readonly userService: UserService,
  ) {}

  private async getEventCapacity(eventId: number) {
    const { data: event, error: eventError } = await this.supabaseService
      .getClient()
      .from('event')
      .select('id, date, id_activity')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) throw new Error(eventError.message);
    if (!event) throw new NotFoundException('Event not found');

    const { data: activity, error: activityError } = await this.supabaseService
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
    const event = await this.eventService.findOneWithDetails(eventId);
    const activity = event.activity as unknown as { 
      title: string;
      address: string;
      id_user: number;
    };
    const user = await this.userService.getProfile(
      createReservationDto.id_user,
    );
    const activityOwner = await this.userService.getProfile(activity.id_user);

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

    if (error) {
      throw new Error(error.message);
    }
    await this.mailerService.sendMail({
      to: user.email,
      subject: `Booking confirmation for ${activity.title} on Meet&Do !`,
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
                        Your booking is confirmed ! 🎉
                    </h3>

                    <p style="color:#333;">Hello ${user.firstname},</p>
                    <p style="color:#555; line-height:1.6;">Your booking for the event <strong>${activity.title}</strong> has been successfully registered.</p>

                    <div style="background-color:#f0f5ff; border-left:4px solid #004AAD; border-radius:6px; padding:20px 25px; margin:25px 0;">
                        <h4 style="color:#004AAD; margin:0 0 15px 0; font-size:1rem;">Booking details</h4>
                        <p style="margin:6px 0; color:#555;"><strong>Event :</strong> ${activity.title}</p>
                        <p style="margin:6px 0; color:#555;"><strong>Date :</strong> ${new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>                        
                        <p style="margin:6px 0; color:#555;"><strong>Location :</strong> ${activity.address}</p>
                        <p style="margin:6px 0; color:#555;"><strong>Booking reference :</strong> #${data.id}</p>
                    </div>

                    <p style="color:#555; line-height:1.6;">
                        You can view or manage your booking at any time by clicking the button below.
                    </p>

                    <div style="text-align:center; margin:35px 0;">
                        <a href="http://localhost:5500/meet-do-front/Page/MyReservations.html"
                          style="background-color:#004AAD; color:white; padding:14px 32px; border-radius:25px; 
                                  text-decoration:none; font-size:1rem; font-weight:bold; display:inline-block;">
                            View my booking →
                        </a>
                    </div>

                    <p style="color:#999; font-size:0.85rem; text-align:center;">
                        If you did not make this booking, please contact us immediately.
                    </p>

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

    await this.mailerService.sendMail({
      to: activityOwner.email,
      subject: `New booking for ${activity.title} on Meet&Do !`,
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
                      You have a new booking ! 🎉
                  </h3>
                  <p style="color:#333;">Hello ${activityOwner.firstname},</p>
                  <p style="color:#555; line-height:1.6;">
                      A new booking has just been made for your event <strong>${activity.title}</strong>.
                  </p>
                  <div style="background-color:#f0f5ff; border-left:4px solid #004AAD; border-radius:6px; padding:20px 25px; margin:25px 0;">
                      <h4 style="color:#004AAD; margin:0 0 15px 0; font-size:1rem;">📋 Booking details</h4>
                      <p style="margin:6px 0; color:#555;"><strong>Event :</strong> ${activity.title}</p>
                      <p style="margin:6px 0; color:#555;"><strong>Date :</strong> ${new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p style="margin:6px 0; color:#555;"><strong>Location :</strong> ${activity.address}</p>
                      <p style="margin:6px 0; color:#555;"><strong>Booked by :</strong> ${user.firstname} ${user.lastname}</p>
                      <p style="margin:6px 0; color:#555;"><strong>Places reserved :</strong> ${data.group_size}</p>
                      <p style="margin:6px 0; color:#555;"><strong>Booking reference :</strong> #${data.id}</p>
                  </div>
                  <div style="text-align:center; margin:35px 0;">
                      <a href="http://localhost:5500/meet-do-front/Page/MyActivity.html"
                        style="background-color:#004AAD; color:white; padding:14px 32px; border-radius:25px; 
                                text-decoration:none; font-size:1rem; font-weight:bold; display:inline-block;">
                          View my activities →
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

    const user = await this.userService.getProfile(userId);
    const event = await this.eventService.findOneWithDetails(reservation.id_event);
    const activity = (event.activity as unknown) as { 
      title: string;
      address: string;
      id_user: number;
    };
    const activityOwner = await this.userService.getProfile(activity.id_user);

    await this.mailerService.sendMail({
      to: activityOwner.email,
      subject: `A booking has been cancelled for ${activity.title} on Meet&Do`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
            <div style="width:100%; background-color:#004AAD; padding:20px 0; text-align:center;">
                <h1 style="color:white; margin:0; font-size:2rem; letter-spacing:1px;">Meet&Do</h1>
            </div>
            <div style="max-width:600px; margin:30px auto; background-color:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                <div style="padding:40px;">
                    <h3 style="text-align:center; color:#D32F2F; font-size:1.4rem; margin-bottom:30px;">
                        A booking has been cancelled 😔
                    </h3>
                    <p style="color:#333;">Hello ${activityOwner.firstname},</p>
                    <p style="color:#555; line-height:1.6;">
                        A participant has just cancelled their booking for your event <strong>${activity.title}</strong>.
                    </p>
                    <div style="background-color:#fff5f5; border-left:4px solid #D32F2F; border-radius:6px; padding:20px 25px; margin:25px 0;">
                        <h4 style="color:#D32F2F; margin:0 0 15px 0; font-size:1rem;">📋 Cancelled booking details</h4>
                        <p style="margin:6px 0; color:#555;"><strong>Event :</strong> ${activity.title}</p>
                        <p style="margin:6px 0; color:#555;"><strong>Date :</strong> ${new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p style="margin:6px 0; color:#555;"><strong>Location :</strong> ${activity.address}</p>
                        <p style="margin:6px 0; color:#555;"><strong>Cancelled by :</strong> ${user.firstname} ${user.lastname}</p>
                        <p style="margin:6px 0; color:#555;"><strong>Booking reference :</strong> #${id}</p>
                    </div>
                    <div style="text-align:center; margin:35px 0;">
                        <a href="http://localhost:5500/meet-do-front/Page/MyActivities.html"
                          style="background-color:#004AAD; color:white; padding:14px 32px; border-radius:25px; 
                                  text-decoration:none; font-size:1rem; font-weight:bold; display:inline-block;">
                            View my activities →
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
    await this.mailerService.sendMail({
      to: user.email,
      subject: `Booking cancellation for ${activity.title} on Meet&Do`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">

            <div style="width:100%; background-color:#004AAD; padding:20px 0; text-align:center;">
                <h1 style="color:white; margin:0; font-size:2rem; letter-spacing:1px;">Meet&Do</h1>
            </div>

            <div style="max-width:600px; margin:30px auto; background-color:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                <div style="padding:40px;">
                    <h3 style="text-align:center; color:#D32F2F; font-size:1.4rem; margin-bottom:30px;">
                        Your booking has been cancelled 😔
                    </h3>

                    <p style="color:#333;">Hello ${user.firstname},</p>
                    <p style="color:#555; line-height:1.6;">
                        Your booking for the event <strong>${activity.title}</strong> has been successfully cancelled.
                    </p>

                    <div style="background-color:#fff5f5; border-left:4px solid #D32F2F; border-radius:6px; padding:20px 25px; margin:25px 0;">
                        <h4 style="color:#D32F2F; margin:0 0 15px 0; font-size:1rem;">📋 Cancelled booking details</h4>
                        <p style="margin:6px 0; color:#555;"><strong>Event :</strong> ${activity.title}</p>
                        <p style="margin:6px 0; color:#555;"><strong>Date :</strong> ${new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p style="margin:6px 0; color:#555;"><strong>Location :</strong> ${activity.address}</p>
                        <p style="margin:6px 0; color:#555;"><strong>Booking reference :</strong> #${id}</p>
                    </div>

                    <p style="color:#555; line-height:1.6;">
                        We hope to see you again soon on Meet&Do for other events !
                    </p>

                    <div style="text-align:center; margin:35px 0;">
                        <a href="http://localhost:5500/meet-do-front/Page/Home.html"
                          style="background-color:#004AAD; color:white; padding:14px 32px; border-radius:25px; 
                                  text-decoration:none; font-size:1rem; font-weight:bold; display:inline-block;">
                            Discover other events →
                        </a>
                    </div>

                    <p style="color:#999; font-size:0.85rem; text-align:center;">
                        If you did not request this cancellation, please contact us immediately.
                    </p>

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
    return { message: 'Reservation successfully cancelled' };
  }
}
