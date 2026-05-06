import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { ReplyContactDto } from './dto/reply-contact.dto';
import {
  LABEL_CATEGORIE,
  LABEL_PRIORITE,
  prioriteVersEmoji,
  ContactCategorie,
  ContactPriorite,
} from './entities/contact.entity';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailerService: MailerService,
  ) {}

  /* ------------------------------------------------------------------
     CREATE — Création d'un nouveau message de contact
     ------------------------------------------------------------------ */

  async create(dto: CreateContactDto) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('contact_messages')
      .insert({
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone ?? null,
        sujet: dto.sujet,
        message: dto.message,
        categorie: dto.categorie ?? 'general',
        priorite: dto.priorite ?? 'normale',
        lu: false,
        repondu: false,
      })
      .select('id, created_at')
      .single();

    if (error) {
      this.logger.error(`contact.create error: ${error.message}`);
      throw new HttpException(
        "Unable to send message. Please try again later.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(`New contact message from ${dto.email} [${dto.categorie}]`);
    await Promise.all([
      this.envoyerEmailNotificationAdmin(dto, data?.id),
      this.envoyerEmailConfirmationUser(dto),
    ]);
    return { success: true, id: data?.id, createdAt: data?.created_at };
  }

  /* ------------------------------------------------------------------
     FIND ALL — Liste paginée avec filtres (admin)
     ------------------------------------------------------------------ */

  async findAll(filters: FilterContactDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabaseService
      .getAdminClient()
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.categorie !== undefined) {
      query = query.eq('categorie', filters.categorie);
    }
    if (filters.priorite !== undefined) {
      query = query.eq('priorite', filters.priorite);
    }
    if (filters.lu !== undefined) {
      query = query.eq('lu', filters.lu);
    }
    if (filters.repondu !== undefined) {
      query = query.eq('repondu', filters.repondu);
    }
    if (filters.search) {
      const s = filters.search.trim();
      query = query.or(
        `nom.ilike.%${s}%,email.ilike.%${s}%,sujet.ilike.%${s}%,message.ilike.%${s}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`contact.findAll error: ${error.message}`);
      return { items: [], total: 0, page, limit };
    }

    return {
      items: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  /* ------------------------------------------------------------------
     FIND ONE — Détail d'un message (marque comme lu)
     ------------------------------------------------------------------ */

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('contact_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.warn(`contact.findOne: message ${id} not found`);
      throw new HttpException('Message not found.', HttpStatus.NOT_FOUND);
    }

    if (!data.lu) {
      await this.marquerLu(id);
    }

    return data;
  }

  /* ------------------------------------------------------------------
     MARK AS READ
     ------------------------------------------------------------------ */

  async marquerLu(id: string) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('contact_messages')
      .update({ lu: true })
      .eq('id', id);

    if (error) {
      this.logger.warn(`contact.marquerLu error: ${error.message}`);
    }
  }

  /* ------------------------------------------------------------------
     REPLY — Enregistre la réponse admin
     ------------------------------------------------------------------ */

  async reply(id: string, dto: ReplyContactDto) {
    const { data: existing, error: fetchErr } = await this.supabaseService
      .getAdminClient()
      .from('contact_messages')
      .select('id, email, nom, sujet')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      throw new HttpException('Message introuvable.', HttpStatus.NOT_FOUND);
    }

    const { error } = await this.supabaseService
      .getAdminClient()
      .from('contact_messages')
      .update({
        reponse: dto.reponse,
        reponse_date: new Date().toISOString(),
        repondu: true,
        lu: true,
      })
      .eq('id', id);

    if (error) {
      this.logger.error(`contact.reply error: ${error.message}`);
      throw new HttpException(
        "Unable to save the response.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(`Recorded reply for the message ${id} (${existing.email})`);
    await this.envoyerEmailReponse(
      existing.email,
      existing.nom,
      existing.sujet,
      dto.reponse,
    );
    return { success: true };
  }

  /* ------------------------------------------------------------------
     DELETE
     ------------------------------------------------------------------ */

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`contact.remove error: ${error.message}`);
      throw new HttpException(
        'Unable to delete the message.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { success: true };
  }

  /* ------------------------------------------------------------------
     STATS — Statistiques pour le dashboard admin
     ------------------------------------------------------------------ */

  async getStats() {
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('contact_messages')
        .select('*');

      if (error || !data) return this.statsVides();

      const total = data.length;
      const nonLus = data.filter((m) => !m.lu).length;
      const nonRepondu = data.filter((m) => !m.repondu).length;
      const urgents = data.filter(
        (m) => m.priorite === 'urgente' && !m.repondu,
      ).length;

      const parCategorie: Record<string, number> = {};
      const parPriorite: Record<string, number> = {};

      for (const msg of data) {
        const cat = msg.categorie || 'general';
        const prio = msg.priorite || 'normale';
        parCategorie[cat] = (parCategorie[cat] || 0) + 1;
        parPriorite[prio] = (parPriorite[prio] || 0) + 1;
      }

      const maintenant = Date.now();
      const il7jours = maintenant - 7 * 24 * 60 * 60 * 1000;
      const recents = data.filter(
        (m) => new Date(m.created_at).getTime() > il7jours,
      ).length;

      return {
        total,
        nonLus,
        nonRepondu,
        urgents,
        recents7j: recents,
        parCategorie,
        parPriorite,
      };
    } catch (_) {
      return this.statsVides();
    }
  }

  /* ------------------------------------------------------------------
     COUNT NON LUS — Nombre de messages non lus (badge sidebar admin)
     ------------------------------------------------------------------ */

  async countNonLus(): Promise<{ count: number }> {
    try {
      const { count, error } = await this.supabaseService
        .getAdminClient()
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('lu', false);

      if (error) {
        this.logger.warn(`contact.countNonLus error: ${error.message}`);
        return { count: 0 };
      }

      return { count: count ?? 0 };
    } catch (_) {
      return { count: 0 };
    }
  }

  /* ------------------------------------------------------------------
     BULK READ — Marquer plusieurs messages comme lus
     ------------------------------------------------------------------ */

  async marquerTousLus(): Promise<{ updated: number }> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('contact_messages')
      .update({ lu: true })
      .eq('lu', false)
      .select('id');

    if (error) {
      this.logger.error(`contact.marquerTousLus error: ${error.message}`);
      throw new HttpException(
        'Unable to update messages.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { updated: data?.length ?? 0 };
  }

  private statsVides() {
    return {
      total: 0,
      nonLus: 0,
      nonRepondu: 0,
      urgents: 0,
      recents7j: 0,
      parCategorie: {},
      parPriorite: {},
    };
  }

  /* ------------------------------------------------------------------
     EMAIL — Notification admin à la réception d'un message
     ------------------------------------------------------------------ */

  private async envoyerEmailNotificationAdmin(
    dto: CreateContactDto,
    id?: string,
  ): Promise<void> {
    try {
      const emoji = prioriteVersEmoji(
        (dto.priorite as ContactPriorite) ?? ContactPriorite.NORMALE,
      );
      const catLabel =
        LABEL_CATEGORIE[dto.categorie as ContactCategorie] ??
        dto.categorie ??
        'Général';
      const prioLabel =
        LABEL_PRIORITE[dto.priorite as ContactPriorite] ??
        dto.priorite ??
        'Normale';
      const ref = id ? id.slice(0, 8).toUpperCase() : 'N/A';

      await this.mailerService.sendMail({
        to: process.env.ADMIN_EMAIL ?? 'meetdosav@gmail.com',
        subject: `${emoji} [Contact] ${dto.sujet} — ${prioLabel}`,
        html: this.buildAdminEmailHtml({
          dto,
          catLabel,
          prioLabel,
          emoji,
          ref,
        }),
      });

      this.logger.log(`Email sent to admin for message ${ref}`);
    } catch (err) {
      this.logger.warn(`Unable to send admin email: ${err?.message}`);
    }
  }

  private buildAdminEmailHtml(params: {
    dto: CreateContactDto;
    catLabel: string;
    prioLabel: string;
    emoji: string;
    ref: string;
  }): string {
    const { dto, catLabel, prioLabel, emoji, ref } = params;
    const date = new Date().toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris',
    });
   return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">

      <div style="width:100%; background-color:#004AAD; padding:20px 0; text-align:center;">
          <h1 style="color:white; margin:0; font-size:2rem; letter-spacing:1px;">Meet&Do</h1>
      </div>

      <div style="max-width:600px; margin:30px auto; background-color:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="padding:40px;">
              <h3 style="text-align:center; color:#004AAD; font-size:1.4rem; margin-bottom:10px;">
                  ${emoji} New contact message
              </h3>
              <p style="text-align:center; color:#999; font-size:0.85rem; margin-bottom:30px;">
                  Reference : <strong>${ref}</strong> — ${date}
              </p>

              <table style="width:100%; border-collapse:collapse;">
                  <tr>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; font-weight:600; color:#444; width:130px;">Name</td>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; color:#1a1a1a;">${this.escapeHtml(dto.nom)}</td>
                  </tr>
                  <tr>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; font-weight:600; color:#444;">Email</td>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee;">
                          <a href="mailto:${this.escapeHtml(dto.email)}" style="color:#004AAD;">${this.escapeHtml(dto.email)}</a>
                      </td>
                  </tr>
                  ${dto.telephone ? `
                  <tr>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; font-weight:600; color:#444;">Phone</td>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; color:#1a1a1a;">${this.escapeHtml(dto.telephone)}</td>
                  </tr>` : ''}
                  <tr>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; font-weight:600; color:#444;">Category</td>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; color:#1a1a1a;">${catLabel}</td>
                  </tr>
                  <tr>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; font-weight:600; color:#444;">Priority</td>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; color:#1a1a1a;">${emoji} ${prioLabel}</td>
                  </tr>
                  <tr>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; font-weight:600; color:#444;">Subject</td>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0ee; color:#1a1a1a;"><strong>${this.escapeHtml(dto.sujet)}</strong></td>
                  </tr>
              </table>

              <div style="margin-top:24px;">
                  <p style="font-weight:600; color:#444; margin-bottom:10px;">Message :</p>
                  <div style="background:#f0f6ff; border:1px solid #c3d8f5; border-radius:8px; padding:14px 16px; font-size:0.9rem; line-height:1.65; color:#333; white-space:pre-wrap;">${this.escapeHtml(dto.message)}</div>
              </div>

              <div style="border-top:1px solid #e0e0e0; margin:30px 0;"></div>

              <p style="color:#555; text-align:center; font-size:0.9rem;">
                  Reply directly to <a href="mailto:${this.escapeHtml(dto.email)}" style="color:#004AAD;">${this.escapeHtml(dto.email)}</a>
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
              <p style="color:#ccc; font-size:0.75rem; margin-top:15px;">© ${new Date().getFullYear()} Meet&Do.</p>
          </div>
      </div>

  </body>
  </html>
`;
  }

  /* ------------------------------------------------------------------
     EMAIL — Confirmation de réception à l'utilisateur
     ------------------------------------------------------------------ */

  private async envoyerEmailConfirmationUser(
    dto: CreateContactDto,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: dto.email,
        subject: 'Your message has been received — MeetAndDo',
        html: this.buildUserConfirmationHtml(dto),
      });
      this.logger.log(`Confirmation email sent to ${dto.email}`);
    } catch (err) {
      this.logger.warn(`Unable to send confirmation email: ${err?.message}`);
    }
  }

  private buildUserConfirmationHtml(dto: CreateContactDto): string {
    const prenom = dto.nom.split(' ')[0] || dto.nom;

    return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">

        <div style="width:100%; background-color:#004AAD; padding:20px 0; text-align:center;">
            <h1 style="color:white; margin:0; font-size:2rem; letter-spacing:1px;">Meet&Do</h1>
        </div>

        <div style="max-width:600px; margin:30px auto; background-color:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <div style="padding:40px;">
                <h3 style="text-align:center; color:#004AAD; font-size:1.4rem; margin-bottom:30px;">
                    We have received your message 📩
                </h3>

                <p style="color:#333;">Hello <strong>${this.escapeHtml(prenom)}</strong>,</p>
                <p style="color:#555; line-height:1.6;">
                    Thank you for contacting us. We have received your message and will get back to you as soon as possible, generally within 24 hours on business days.
                </p>

                <div style="background:#f0f6ff; border:1px solid #c3d8f5; border-radius:8px; padding:14px 16px; margin:25px 0;">
                    <p style="margin:0 0 6px; font-weight:600; color:#004AAD; font-size:0.875rem;">Summary of your message :</p>
                    <p style="margin:0; color:#333; font-size:0.875rem;"><strong>Subject :</strong> ${this.escapeHtml(dto.sujet)}</p>
                </div>

                <p style="color:#555; line-height:1.6; font-size:0.875rem;">
                    In the meantime, you can check our <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5500'}/Page/Faq.html" style="color:#004AAD;">FAQ</a> which answers the most common questions.
                </p>

                <p style="color:#999; font-size:0.85rem; text-align:center;">
                    If you did not send this message, simply ignore this email.
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
                <p style="color:#ccc; font-size:0.75rem; margin-top:15px;">© ${new Date().getFullYear()} Meet&Do.</p>
            </div>
        </div>

    </body>
    </html>
  `;
  }

  /* ------------------------------------------------------------------
     EMAIL — Réponse admin envoyée à l'utilisateur
     ------------------------------------------------------------------ */

  private async envoyerEmailReponse(
    email: string,
    nom: string,
    sujet: string,
    reponse: string,
  ): Promise<void> {
    try {
      const prenom = nom.split(' ')[0] || nom;
      await this.mailerService.sendMail({
        to: email,
        subject: `Re: ${sujet} - MeetAndDo`,
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
                  Response from the MeetAndDo team 💬
              </h3>

              <p style="color:#333;">Hello <strong>${this.escapeHtml(prenom)}</strong>,</p>
              <p style="color:#555; line-height:1.6;">
                  In response to your message : <strong>${this.escapeHtml(sujet)}</strong>
              </p>

              <div style="background:#f0f6ff; border:1px solid #c3d8f5; border-radius:8px; padding:16px; margin:25px 0; font-size:0.9rem; line-height:1.65; color:#333; white-space:pre-wrap;">
                  ${this.escapeHtml(reponse)}
              </div>

              <p style="color:#555; line-height:1.6;">
                  Best regards,<br><strong>The MeetAndDo team</strong>
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
    } catch (err) {
      this.logger.warn(`Unable to send reply email : ${err?.message}`);
    }
  }

  /* ------------------------------------------------------------------
     UTILITAIRE — Échappement HTML
     ------------------------------------------------------------------ */

  private escapeHtml(str: string | undefined | null): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
