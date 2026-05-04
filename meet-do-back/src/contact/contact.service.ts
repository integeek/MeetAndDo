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
        nom:       dto.nom,
        email:     dto.email,
        telephone: dto.telephone ?? null,
        sujet:     dto.sujet,
        message:   dto.message,
        categorie: dto.categorie ?? 'general',
        priorite:  dto.priorite  ?? 'normale',
        lu:        false,
        repondu:   false,
      })
      .select('id, created_at')
      .single();

    if (error) {
      this.logger.error(`contact.create error: ${error.message}`);
      throw new HttpException(
        'Impossible d\'envoyer le message. Réessayez plus tard.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(`Nouveau message de contact de ${dto.email} [${dto.categorie}]`);
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
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

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
      query = query.or(`nom.ilike.%${s}%,email.ilike.%${s}%,sujet.ilike.%${s}%,message.ilike.%${s}%`);
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
      this.logger.warn(`contact.findOne: message ${id} introuvable`);
      throw new HttpException('Message introuvable.', HttpStatus.NOT_FOUND);
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
        reponse:       dto.reponse,
        reponse_date:  new Date().toISOString(),
        repondu:       true,
        lu:            true,
      })
      .eq('id', id);

    if (error) {
      this.logger.error(`contact.reply error: ${error.message}`);
      throw new HttpException(
        'Impossible d\'enregistrer la réponse.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(`Réponse enregistrée pour le message ${id} (${existing.email})`);
    await this.envoyerEmailReponse(existing.email, existing.nom, existing.sujet, dto.reponse);
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
        'Impossible de supprimer le message.',
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

      const total      = data.length;
      const nonLus     = data.filter(m => !m.lu).length;
      const nonRepondu = data.filter(m => !m.repondu).length;
      const urgents    = data.filter(m => m.priorite === 'urgente' && !m.repondu).length;

      const parCategorie: Record<string, number> = {};
      const parPriorite:  Record<string, number> = {};

      for (const msg of data) {
        const cat  = msg.categorie || 'general';
        const prio = msg.priorite  || 'normale';
        parCategorie[cat]  = (parCategorie[cat]  || 0) + 1;
        parPriorite[prio]  = (parPriorite[prio]  || 0) + 1;
      }

      const maintenant     = Date.now();
      const il7jours       = maintenant - 7 * 24 * 60 * 60 * 1000;
      const recents        = data.filter(m => new Date(m.created_at).getTime() > il7jours).length;

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
        'Impossible de mettre à jour les messages.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { updated: data?.length ?? 0 };
  }

  private statsVides() {
    return {
      total: 0, nonLus: 0, nonRepondu: 0,
      urgents: 0, recents7j: 0,
      parCategorie: {}, parPriorite: {},
    };
  }

  /* ------------------------------------------------------------------
     EMAIL — Notification admin à la réception d'un message
     ------------------------------------------------------------------ */

  private async envoyerEmailNotificationAdmin(dto: CreateContactDto, id?: string): Promise<void> {
    try {
      const emoji    = prioriteVersEmoji(dto.priorite as ContactPriorite ?? ContactPriorite.NORMALE);
      const catLabel = LABEL_CATEGORIE[dto.categorie as ContactCategorie] ?? dto.categorie ?? 'Général';
      const prioLabel = LABEL_PRIORITE[dto.priorite as ContactPriorite] ?? dto.priorite ?? 'Normale';
      const ref      = id ? id.slice(0, 8).toUpperCase() : 'N/A';

      await this.mailerService.sendMail({
        to: process.env.ADMIN_EMAIL ?? 'meetdosav@gmail.com',
        subject: `${emoji} [Contact] ${dto.sujet} — ${prioLabel}`,
        html: this.buildAdminEmailHtml({ dto, catLabel, prioLabel, emoji, ref }),
      });

      this.logger.log(`Email admin envoyé pour le message ${ref}`);
    } catch (err) {
      this.logger.warn(`Impossible d'envoyer l'email admin: ${err?.message}`);
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
    const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="UTF-8"/><title>Nouveau message de contact</title></head>
      <body style="font-family:Arial,sans-serif;background:#f8f8f6;padding:24px;margin:0;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e2e0;">
          <div style="background:linear-gradient(135deg,#004AAD,#1a6fd8);padding:24px 28px;color:#fff;">
            <h1 style="margin:0;font-size:1.2rem;font-weight:700;">
              ${emoji} Nouveau message de contact
            </h1>
            <p style="margin:6px 0 0;opacity:0.85;font-size:0.875rem;">Référence : <strong>${ref}</strong> — ${date}</p>
          </div>
          <div style="padding:24px 28px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;font-weight:600;color:#444;width:130px;">Nom</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;color:#1a1a1a;">${this.escapeHtml(dto.nom)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;font-weight:600;color:#444;">Email</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;">
                  <a href="mailto:${this.escapeHtml(dto.email)}" style="color:#004AAD;">${this.escapeHtml(dto.email)}</a>
                </td>
              </tr>
              ${dto.telephone ? `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;font-weight:600;color:#444;">Téléphone</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;color:#1a1a1a;">${this.escapeHtml(dto.telephone)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;font-weight:600;color:#444;">Catégorie</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;color:#1a1a1a;">${catLabel}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;font-weight:600;color:#444;">Priorité</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;color:#1a1a1a;">${emoji} ${prioLabel}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;font-weight:600;color:#444;">Sujet</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0ee;color:#1a1a1a;"><strong>${this.escapeHtml(dto.sujet)}</strong></td>
              </tr>
            </table>
            <div style="margin-top:20px;">
              <p style="font-weight:600;color:#444;margin-bottom:8px;">Message :</p>
              <div style="background:#f8f8f6;border:1px solid #e2e2e0;border-radius:8px;padding:14px 16px;font-size:0.9rem;line-height:1.65;color:#333;white-space:pre-wrap;">${this.escapeHtml(dto.message)}</div>
            </div>
          </div>
          <div style="background:#f8f8f6;border-top:1px solid #e2e2e0;padding:16px 28px;text-align:center;font-size:0.8rem;color:#999;">
            MeetAndDo — Répondez directement à <a href="mailto:${this.escapeHtml(dto.email)}" style="color:#004AAD;">${this.escapeHtml(dto.email)}</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /* ------------------------------------------------------------------
     EMAIL — Confirmation de réception à l'utilisateur
     ------------------------------------------------------------------ */

  private async envoyerEmailConfirmationUser(dto: CreateContactDto): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: dto.email,
        subject: 'Votre message a bien été reçu — MeetAndDo',
        html: this.buildUserConfirmationHtml(dto),
      });
      this.logger.log(`Email de confirmation envoyé à ${dto.email}`);
    } catch (err) {
      this.logger.warn(`Impossible d'envoyer l'email de confirmation: ${err?.message}`);
    }
  }

  private buildUserConfirmationHtml(dto: CreateContactDto): string {
    const prenom = dto.nom.split(' ')[0] || dto.nom;

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="UTF-8"/><title>Message reçu — MeetAndDo</title></head>
      <body style="font-family:Arial,sans-serif;background:#f8f8f6;padding:24px;margin:0;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e2e0;">
          <div style="background:linear-gradient(135deg,#004AAD,#1a6fd8);padding:28px;color:#fff;text-align:center;">
            <h1 style="margin:0;font-size:1.4rem;font-weight:800;">MeetAndDo</h1>
            <p style="margin:6px 0 0;opacity:0.85;font-size:0.9rem;">Nous avons bien reçu votre message</p>
          </div>
          <div style="padding:28px;">
            <p style="color:#1a1a1a;font-size:1rem;margin-bottom:16px;">Bonjour <strong>${this.escapeHtml(prenom)}</strong>,</p>
            <p style="color:#555;line-height:1.7;margin-bottom:20px;">
              Merci de nous avoir contactés. Nous avons bien reçu votre message et y répondrons dans les plus brefs délais, généralement sous 24 heures en jours ouvrés.
            </p>
            <div style="background:#f0f6ff;border:1px solid #c3d8f5;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
              <p style="margin:0 0 6px;font-weight:600;color:#004AAD;font-size:0.875rem;">Récapitulatif de votre message :</p>
              <p style="margin:0;color:#333;font-size:0.875rem;"><strong>Sujet :</strong> ${this.escapeHtml(dto.sujet)}</p>
            </div>
            <p style="color:#555;line-height:1.7;font-size:0.875rem;">
              En attendant, vous pouvez consulter notre <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5500'}/Page/Faq.html" style="color:#004AAD;">FAQ</a> qui répond aux questions les plus courantes.
            </p>
          </div>
          <div style="background:#f8f8f6;border-top:1px solid #e2e2e0;padding:16px 28px;text-align:center;font-size:0.78rem;color:#999;">
            © ${new Date().getFullYear()} MeetAndDo — Vous recevez cet email car vous avez contacté notre équipe.
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
        subject: `Re: ${sujet} — MeetAndDo`,
        html: `
          <!DOCTYPE html>
          <html lang="fr">
          <head><meta charset="UTF-8"/></head>
          <body style="font-family:Arial,sans-serif;background:#f8f8f6;padding:24px;margin:0;">
            <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e2e0;">
              <div style="background:linear-gradient(135deg,#004AAD,#1a6fd8);padding:24px 28px;color:#fff;">
                <h1 style="margin:0;font-size:1.1rem;font-weight:700;">Réponse de l'équipe MeetAndDo</h1>
              </div>
              <div style="padding:24px 28px;">
                <p style="color:#1a1a1a;margin-bottom:12px;">Bonjour <strong>${this.escapeHtml(prenom)}</strong>,</p>
                <p style="color:#555;margin-bottom:8px;">En réponse à votre message : <strong>${this.escapeHtml(sujet)}</strong></p>
                <div style="background:#f8f8f6;border:1px solid #e2e2e0;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:0.9rem;line-height:1.65;color:#333;white-space:pre-wrap;">${this.escapeHtml(reponse)}</div>
                <p style="color:#555;font-size:0.875rem;line-height:1.6;">Cordialement,<br><strong>L'équipe MeetAndDo</strong></p>
              </div>
              <div style="background:#f8f8f6;border-top:1px solid #e2e2e0;padding:14px 28px;text-align:center;font-size:0.78rem;color:#999;">
                © ${new Date().getFullYear()} MeetAndDo
              </div>
            </div>
          </body>
          </html>
        `,
      });
    } catch (err) {
      this.logger.warn(`Impossible d'envoyer l'email de réponse: ${err?.message}`);
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
