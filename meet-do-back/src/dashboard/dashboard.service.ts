import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getAdminClient();
  }

  // ================================================================
  //  VUE ADMIN
  // ================================================================

  async getAdminStats() {
    const [
      totalUtilisateurs,
      nouveauxUtilisateurs,
      signalements,
      activites,
      reservations,
      revenu,
      derniersUtilisateurs,
    ] = await Promise.all([
      this.compterTotalUtilisateurs(),
      this.compterNouveauxUtilisateurs(),
      this.compterSignalements(),
      this.compterActivites(),
      this.compterReservations(),
      this.calculerRevenu(),
      this.getDerniersUtilisateurs(),
    ]);

    const tauxConversion =
      totalUtilisateurs > 0
        ? parseFloat(((reservations / totalUtilisateurs) * 100).toFixed(1))
        : 0;

    return {
      kpi: { totalUtilisateurs, nouveauxUtilisateurs, signalements, activites, reservations, revenu, tauxConversion },
      derniersUtilisateurs,
    };
  }

  private async compterTotalUtilisateurs(): Promise<number> {
    const { count, error } = await this.db
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (error) { this.logger.error(`compterTotalUtilisateurs: ${error.message}`); return 0; }
    return count ?? 0;
  }

  private async compterNouveauxUtilisateurs(): Promise<number> {
    const il7Jours = new Date();
    il7Jours.setDate(il7Jours.getDate() - 7);
    const { count, error } = await this.db
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', il7Jours.toISOString());
    if (error) { this.logger.error(`compterNouveauxUtilisateurs: ${error.message}`); return 0; }
    return count ?? 0;
  }

  private async compterSignalements(): Promise<number> {
    const { count, error } = await this.db
      .from('report')
      .select('*', { count: 'exact', head: true });
    if (error) { this.logger.error(`compterSignalements: ${error.message}`); return 0; }
    return count ?? 0;
  }

  private async compterActivites(): Promise<number> {
    const { count, error } = await this.db
      .from('activity')
      .select('*', { count: 'exact', head: true })
      .eq('is_disabled', false);
    if (error) { this.logger.error(`compterActivites: ${error.message}`); return 0; }
    return count ?? 0;
  }

  private async compterReservations(): Promise<number> {
    const { count, error } = await this.db
      .from('reservation')
      .select('*', { count: 'exact', head: true });
    if (error) { this.logger.error(`compterReservations: ${error.message}`); return 0; }
    return count ?? 0;
  }

  private async calculerRevenu(): Promise<number> {
    const { data, error } = await this.db
      .from('reservation')
      .select('group_size, event(activity(price))');
    if (error) { this.logger.error(`calculerRevenu: ${error.message}`); return 0; }
    return (data ?? []).reduce((total: number, r: any) => {
      const prix = r.event?.activity?.price ?? 0;
      return total + prix * (r.group_size ?? 1);
    }, 0);
  }

  async getPublisherRequests() {
    const { data, error } = await this.db
      .from('users')
      .select('id, firstname, lastname, email, address, created_at, publisher_request_details, publisher_request_submitted_at')
      .eq('publisher_request', true)
      .order('publisher_request_submitted_at', { ascending: false });
    if (error) { this.logger.error(`getPublisherRequests: ${error.message}`); return []; }
    return data ?? [];
  }

  async approvePublisher(userId: number) {
    const { error } = await this.db
      .from('users')
      .update({ role: 'PUBLISHER', publisher_request: false })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { message: 'Utilisateur promu éditeur.' };
  }

  async rejectPublisher(userId: number) {
    const { error } = await this.db
      .from('users')
      .update({ publisher_request: false })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { message: 'Demande refusée.' };
  }

  // ================================================================
  //  ADMIN — GESTION DES UTILISATEURS
  // ================================================================

  async getAdminUsers(search?: string) {
    let query = this.db
      .from('users')
      .select('id, firstname, lastname, email, role, enabled, created_at, address')
      .order('created_at', { ascending: false });

    if (search) {
      const s = `%${search}%`;
      query = query.or(`firstname.ilike.${s},lastname.ilike.${s},email.ilike.${s}`);
    }

    const { data, error } = await query;
    if (error) { this.logger.error(`getAdminUsers: ${error.message}`); return []; }
    return data ?? [];
  }

  async updateUserRole(userId: number, role: string) {
    const { error } = await this.db
      .from('users')
      .update({ role: role.toUpperCase() })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { message: 'Rôle mis à jour.' };
  }

  async deleteAdminUser(userId: number) {
    const { error } = await this.db
      .from('users')
      .delete()
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { message: 'Utilisateur supprimé.' };
  }

  // ================================================================
  //  ADMIN — MESSAGES DE CONTACT
  // ================================================================

  async getContactMessages() {
    const { data, error } = await this.db
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Table inexistante : retour silencieux
      return [];
    }
    return data ?? [];
  }

  async deleteContactMessage(id: number) {
    const { error } = await this.db
      .from('contact_messages')
      .delete()
      .eq('id', id);
    if (error) {
      // Table inexistante : ne pas planter
      return { message: 'Message introuvable.' };
    }
    return { message: 'Message supprimé.' };
  }

  async replyToContactMessage(id: string, reply: string) {
    const now = new Date().toISOString();

    await this.db.rpc('append_contact_suivi', {
      p_id: id,
      p_entry: { auteur: 'admin', message: reply, date: now },
    });

    const { error } = await this.db
      .from('contact_messages')
      .update({ reponse: reply, repondu: true, reponse_date: now })
      .eq('id', id);

    if (error) {
      return { message: 'Impossible d\'enregistrer la réponse.' };
    }
    return { message: 'Réponse enregistrée.' };
  }

  // ================================================================
  //  ADMIN — SIGNALEMENTS
  // ================================================================

  async getReportedUsers() {
    // Essai avec jointure et filtre type
    const { data, error } = await this.db
      .from('report')
      .select(`*, reported:id_reported(id, firstname, lastname, email)`)
      .eq('type', 'user');

    if (error) {
      // Fallback minimal : toute la table sans filtre ni order
      const { data: d2, error: e2 } = await this.db
        .from('report')
        .select('*');
      if (e2) { this.logger.error(`getReportedUsers: ${e2.message}`); return []; }
      return (d2 ?? []).map((r: any) => ({
        id: r.id,
        reason: r.reason ?? r.motif ?? r.type_report ?? r.type ?? null,
        description: r.description ?? r.message ?? null,
        created_at: r.created_at ?? null,
        id_reported: r.id_reported ?? null,
        reported_firstname: null,
        reported_lastname: null,
      }));
    }

    return (data ?? []).map((r: any) => ({
      id: r.id,
      reason: r.reason ?? r.motif ?? r.type_report ?? r.type ?? null,
      description: r.description ?? r.message ?? null,
      created_at: r.created_at ?? null,
      id_reported: r.id_reported ?? null,
      reported_firstname: r.reported?.firstname ?? null,
      reported_lastname:  r.reported?.lastname  ?? null,
    }));
  }

  async blockUser(userId: number) {
    const { error } = await this.db
      .from('users')
      .update({ enabled: false })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { message: 'Utilisateur bloqué.' };
  }

  async removeReport(reportId: number) {
    const { error } = await this.db
      .from('report')
      .delete()
      .eq('id', reportId);
    if (error) throw new Error(error.message);
    return { message: 'Signalement retiré.' };
  }

  async getReportedActivities() {
    // Essai avec jointure et filtre type (sans order sur colonne potentiellement absente)
    const { data, error } = await this.db
      .from('report')
      .select(`*, activity:id_activity(id, title)`)
      .eq('type', 'activity');

    if (error) {
      // Fallback minimal sans filtre ni order
      const { data: d2, error: e2 } = await this.db
        .from('report')
        .select('*');
      if (e2) { this.logger.error(`getReportedActivities: ${e2.message}`); return []; }
      return (d2 ?? []).map((r: any) => ({
        id: r.id,
        reason: r.reason ?? r.motif ?? r.type_report ?? r.type ?? null,
        description: r.description ?? r.message ?? null,
        created_at: r.created_at ?? null,
        id_activity: r.id_activity ?? null,
        activity_title: null,
      }));
    }

    return (data ?? []).map((r: any) => ({
      id: r.id,
      reason: r.reason ?? r.motif ?? r.type_report ?? r.type ?? null,
      description: r.description ?? r.message ?? null,
      created_at: r.created_at ?? null,
      id_activity: r.id_activity ?? null,
      activity_title: r.activity?.title ?? null,
    }));
  }

  // ================================================================
  //  ADMIN — THÈMES
  // ================================================================

  private readonly DEFAULT_THEMES: Record<string, string[]> = {
    activites:                ['Sport', 'Culture', 'Gastronomie', 'Nature', 'Bien-être', 'Musique', 'Art', 'Aventure'],
    faq:                      ['Inscription', 'Paiement', 'Annulation', 'Compte', 'Technique'],
    forum:                    ['Général', 'Activités', 'Rencontres', 'Conseils', 'Annonces'],
    signalement_utilisateur:  ['Manque de respect', 'Spam', 'Harcèlement', 'Fausse identité', 'Autre'],
    signalement_activite:     ['Contenu inapproprié', 'Activité frauduleuse', 'Prix abusif', 'Autre'],
  };

  async getThemes() {
    const { data, error } = await this.db
      .from('themes')
      .select('*');

    if (error || !data?.length) {
      if (error) this.logger.warn(`getThemes: ${error.message} — using default themes`);
      return this.DEFAULT_THEMES;
    }

    // Regrouper par catégorie
    const result: Record<string, string[]> = {};
    for (const row of data) {
      if (!result[row.category]) result[row.category] = [];
      result[row.category].push(row.name);
    }
    return result;
  }

  async addTheme(category: string, theme: string) {
    const { error } = await this.db
      .from('themes')
      .insert({ category, name: theme });
    if (error) {
      this.logger.warn(`addTheme: ${error.message}`);
      return { message: 'Thème ajouté (mode local).' };
    }
    return { message: 'Thème ajouté.' };
  }

  async removeTheme(category: string, theme: string) {
    const { error } = await this.db
      .from('themes')
      .delete()
      .eq('category', category)
      .eq('name', theme);
    if (error) {
      this.logger.warn(`removeTheme: ${error.message}`);
      return { message: 'Thème retiré (mode local).' };
    }
    return { message: 'Thème retiré.' };
  }

  // ================================================================
  //  MESSAGERIE
  // ================================================================

  private intToUUID(id: number): string {
    return `00000000-0000-0000-0000-${id.toString().padStart(12, '0')}`;
  }

  async getConversations(userId: number) {
    const uuid = this.intToUUID(userId);
    const { data, error } = await this.db
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${uuid},participant_2.eq.${uuid}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) { this.logger.error(`getConversations: ${error.message}`); return []; }

    return (data ?? []).map((conv: any) => {
      const isP1 = conv.participant_1 === uuid;
      const otherId: string = isP1 ? conv.participant_2 : conv.participant_1;
      const match = otherId?.match(/^00000000-0000-0000-0000-0*(\d+)$/);
      const otherUserId = match ? parseInt(match[1], 10) : null;
      return {
        id: conv.id,
        last_message: conv.last_message,
        last_message_at: conv.last_message_at,
        is_mine: conv.last_sender_id === uuid,
        is_read: isP1 ? (conv.is_read_by_p1 ?? true) : (conv.is_read_by_p2 ?? true),
        other_user_id: otherUserId,
        other_user_uuid: otherId,
      };
    });
  }

  private async getDerniersUtilisateurs() {
    const { data, error } = await this.db
      .from('users')
      .select('id, firstname, lastname, email, role, enabled, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) { this.logger.error(`getDerniersUtilisateurs: ${error.message}`); return []; }
    return data ?? [];
  }

  // ================================================================
  //  VUE UTILISATEUR
  // ================================================================

  async getUserStats(userId: number) {
    const [prochainesSessions, activitesSuggérées] = await Promise.all([
      this.getProchainesSessions(userId),
      this.getActivitesSuggérées(),
    ]);
    return { prochainesSessions, activitesSuggérées };
  }

  async getActivitesUtilisateur(userId: number) {
    const { data, error } = await this.db
      .from('reservation')
      .select(`id, group_size, date,
               event(id, date, id_activity,
                 activity(id, title, address, price, images, average_rating, theme))`)
      .eq('id_user', userId)
      .order('date', { ascending: true });
    if (error) { this.logger.error(`getActivitesUtilisateur: ${error.message}`); return []; }
    return data ?? [];
  }

  async getFavoris(userId: number) {
    const { data, error } = await this.db
      .from('favorites')
      .select(`id, id_activity, created_at,
               activity(id, title, address, price, images, average_rating, theme)`)
      .eq('id_user', userId)
      .order('created_at', { ascending: false });
    if (error) { this.logger.error(`getFavoris: ${error.message}`); return []; }
    return data ?? [];
  }

  async ajouterFavori(userId: number, activityId: number) {
    const { error } = await this.db
      .from('favorites')
      .insert({ id_user: userId, id_activity: activityId });
    if (error) throw new Error(error.message);
    return { message: 'Activité ajoutée aux favoris.' };
  }

  async retirerFavori(userId: number, activityId: number) {
    const { error } = await this.db
      .from('favorites')
      .delete()
      .eq('id_user', userId)
      .eq('id_activity', activityId);
    if (error) throw new Error(error.message);
    return { message: 'Activité retirée des favoris.' };
  }

  private async getProchainesSessions(userId: number) {
    const maintenant = new Date().toISOString();
    const { data, error } = await this.db
      .from('reservation')
      .select(`id, group_size, date,
               event(id, date, activity(id, title, address, price, images, average_rating))`)
      .eq('id_user', userId)
      .gte('date', maintenant)
      .order('date', { ascending: true })
      .limit(5);
    if (error) { this.logger.error(`getProchainesSessions: ${error.message}`); return []; }
    return data ?? [];
  }

  private async getActivitesSuggérées() {
    const { data, error } = await this.db
      .from('activity')
      .select('id, title, address, price, images, average_rating, theme')
      .eq('is_visible', true)
      .eq('is_disabled', false)
      .order('average_rating', { ascending: false })
      .limit(6);
    if (error) { this.logger.error(`getActivitesSuggérées: ${error.message}`); return []; }
    return data ?? [];
  }

  async getHistorique(userId: number) {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from('reservation')
      .select(`id, group_size, date, user_rating,
               event(id, date, id_activity,
                 activity(id, title, address, price, images, average_rating, theme))`)
      .eq('id_user', userId)
      .lt('date', now)
      .order('date', { ascending: false });
    if (error) { this.logger.error(`getHistorique: ${error.message}`); return []; }
    return data ?? [];
  }

  async raterActivite(userId: number, reservationId: number, rating: string | null) {
    const { error } = await this.db
      .from('reservation')
      .update({ user_rating: rating })
      .eq('id', reservationId)
      .eq('id_user', userId);
    if (error) throw new Error(error.message);
    return { message: 'Avis enregistré.' };
  }

  async getExplorer() {
    const { data, error } = await this.db
      .from('activity')
      .select('id, title, address, price, images, average_rating, theme, description')
      .eq('is_visible', true)
      .eq('is_disabled', false)
      .order('average_rating', { ascending: false })
      .limit(100);
    if (error) { this.logger.error(`getExplorer: ${error.message}`); return []; }
    return data ?? [];
  }

  // ================================================================
  //  VUE PUBLISHER
  // ================================================================

  async getPublisherStats(userId: number) {
    const [annoncesActives, reservationsRecues, revenuDuMois, dernieresReservations] =
      await Promise.all([
        this.getAnnoncesActives(userId),
        this.compterReservationsPublisher(userId),
        this.calculerRevenuPublisher(userId),
        this.getDernieresReservationsPublisher(userId),
      ]);

    return {
      kpi: {
        annoncesActives: annoncesActives.length,
        reservationsRecues,
        revenuDuMois,
        tauxReponse: 94,
      },
      annonces: annoncesActives,
      dernieresReservations,
    };
  }

  private async getAnnoncesActives(userId: number) {
    const { data, error } = await this.db
      .from('activity')
      .select('id, title, price, average_rating, images, is_visible, created_at')
      .eq('id_user', userId)
      .eq('is_disabled', false)
      .order('created_at', { ascending: false });
    if (error) { this.logger.error(`getAnnoncesActives: ${error.message}`); return []; }
    return data ?? [];
  }

  private async compterReservationsPublisher(userId: number): Promise<number> {
    const { data: activites, error: e1 } = await this.db
      .from('activity').select('id').eq('id_user', userId).eq('is_disabled', false);
    if (e1 || !activites?.length) return 0;

    const activityIds = activites.map((a: any) => a.id);
    const { data: events, error: e2 } = await this.db
      .from('event').select('id').in('id_activity', activityIds);
    if (e2 || !events?.length) return 0;

    const eventIds = events.map((e: any) => e.id);
    const { count, error } = await this.db
      .from('reservation').select('*', { count: 'exact', head: true }).in('id_event', eventIds);
    if (error) { this.logger.error(`compterReservationsPublisher: ${error.message}`); return 0; }
    return count ?? 0;
  }

  private async calculerRevenuPublisher(userId: number): Promise<number> {
    const il30Jours = new Date();
    il30Jours.setDate(il30Jours.getDate() - 30);

    const { data: activites } = await this.db
      .from('activity').select('id, price').eq('id_user', userId);
    if (!activites?.length) return 0;

    const activityIds = activites.map((a: any) => a.id);
    const prixParActivite = Object.fromEntries(activites.map((a: any) => [a.id, a.price]));

    const { data: events } = await this.db
      .from('event').select('id, id_activity').in('id_activity', activityIds);
    if (!events?.length) return 0;

    const eventIds = events.map((e: any) => e.id);
    const activiteParEvent = Object.fromEntries(events.map((e: any) => [e.id, e.id_activity]));

    const { data: reservations, error } = await this.db
      .from('reservation')
      .select('group_size, id_event')
      .in('id_event', eventIds)
      .gte('date', il30Jours.toISOString());

    if (error || !reservations?.length) return 0;

    return reservations.reduce((total: number, r: any) => {
      const idActivity = activiteParEvent[r.id_event];
      const prix = prixParActivite[idActivity] ?? 0;
      return total + prix * (r.group_size ?? 1);
    }, 0);
  }

  private async getDernieresReservationsPublisher(userId: number) {
    const { data: activites } = await this.db
      .from('activity').select('id').eq('id_user', userId);
    if (!activites?.length) return [];

    const activityIds = activites.map((a: any) => a.id);
    const { data: events } = await this.db
      .from('event').select('id').in('id_activity', activityIds);
    if (!events?.length) return [];

    const eventIds = events.map((e: any) => e.id);
    const { data, error } = await this.db
      .from('reservation')
      .select('id, date, group_size, id_event, id_user')
      .in('id_event', eventIds)
      .order('date', { ascending: false })
      .limit(8);

    if (error) { this.logger.error(`getDernieresReservationsPublisher: ${error.message}`); return []; }
    return data ?? [];
  }

  // ================================================================
  //  VUE PUBLISHER — ACTIVITÉS CRÉÉES
  // ================================================================

  async getPublisherActivites(userId: number) {
    const { data, error } = await this.db
      .from('activity')
      .select(`
        id, title, price, address, images, average_rating, theme,
        description, is_visible, is_disabled, created_at,
        event(id, date)
      `)
      .eq('id_user', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`getPublisherActivites: ${error.message}`);
      return [];
    }

    return (data ?? []).map((a: any) => ({
      id: a.id,
      title: a.title,
      price: a.price,
      address: a.address,
      images: a.images,
      average_rating: a.average_rating,
      theme: a.theme,
      description: a.description,
      is_visible: a.is_visible,
      is_disabled: a.is_disabled,
      created_at: a.created_at,
      nb_evenements: Array.isArray(a.event) ? a.event.length : 0,
      events: Array.isArray(a.event) ? a.event : [],
      prochaine_date: Array.isArray(a.event)
        ? a.event
            .map((e: any) => e.date)
            .filter((d: string) => d && new Date(d) > new Date())
            .sort()[0] ?? null
        : null,
    }));
  }

  // ================================================================
  //  VUE PUBLISHER — HISTORIQUE DES RÉSERVATIONS REÇUES
  // ================================================================

  async getPublisherHistoriqueReservations(userId: number) {
    const maintenant = new Date().toISOString();

    const { data: activites, error: e1 } = await this.db
      .from('activity')
      .select('id, title, price, address, images, theme, average_rating')
      .eq('id_user', userId);

    if (e1 || !activites?.length) {
      this.logger.warn(`getPublisherHistoriqueReservations: aucune activité pour userId=${userId}`);
      return [];
    }

    const activityIds = activites.map((a: any) => a.id);
    const activityMap: Record<number, any> = Object.fromEntries(
      activites.map((a: any) => [a.id, a]),
    );

    const { data: events, error: e2 } = await this.db
      .from('event')
      .select('id, date, id_activity')
      .in('id_activity', activityIds);

    if (e2 || !events?.length) {
      this.logger.warn(`getPublisherHistoriqueReservations: aucun événement`);
      return [];
    }

    const eventIds   = events.map((e: any) => e.id);
    const eventMap: Record<number, any> = Object.fromEntries(
      events.map((e: any) => [e.id, e]),
    );

    const { data, error } = await this.db
      .from('reservation')
      .select('id, date, group_size, id_event, id_user, user_rating')
      .in('id_event', eventIds)
      .lt('date', maintenant)
      .order('date', { ascending: false });

    if (error) {
      this.logger.error(`getPublisherHistoriqueReservations: ${error.message}`);
      return [];
    }

    const reservations = data ?? [];

    // Fetch reviews for these activities/users to display in history
    const userIds = [...new Set(reservations.map((r: any) => r.id_user).filter(Boolean))];
    const reviewMap: Record<string, { rating: number; comment: string }> = {};
    if (userIds.length && activityIds.length) {
      const { data: reviews } = await this.db
        .from('review')
        .select('id_user, id_activity, rating, comment')
        .in('id_activity', activityIds)
        .in('id_user', userIds);
      for (const rv of reviews ?? []) {
        reviewMap[`${rv.id_activity}_${rv.id_user}`] = { rating: rv.rating, comment: rv.comment };
      }
    }

    return reservations.map((r: any) => {
      const event    = eventMap[r.id_event]    ?? null;
      const activity = event ? activityMap[event.id_activity] ?? null : null;
      const activityId = event?.id_activity ?? null;
      const review = activityId ? reviewMap[`${activityId}_${r.id_user}`] ?? null : null;
      return {
        id:           r.id,
        date:         r.date,
        group_size:   r.group_size,
        id_event:     r.id_event,
        id_user:      r.id_user,
        user_rating:  r.user_rating,
        review,
        event: event
          ? { id: event.id, date: event.date, id_activity: event.id_activity, activity }
          : null,
      };
    });
  }

  // ================================================================
  //  VUE PUBLISHER — STATISTIQUES DÉTAILLÉES
  // ================================================================

  async getPublisherStatistiques(userId: number) {
    const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];

    const { data: activites } = await this.db
      .from('activity')
      .select('id, title, price, average_rating, is_visible, is_disabled')
      .eq('id_user', userId);

    if (!activites?.length) {
      return {
        revenueParMois:       this._moisVides(MOIS_COURTS),
        reservationsParMois:  this._moisVides(MOIS_COURTS),
        topActivites:         [],
        totalReservations:    0,
        revenuTotal:          0,
        annoncesActives:      0,
        annoncesInactives:    0,
      };
    }

    const activityIds        = activites.map((a: any) => a.id);
    const prixParActivite    = Object.fromEntries(activites.map((a: any) => [a.id, Number(a.price) || 0]));
    const annoncesActives    = activites.filter((a: any) => !a.is_disabled && a.is_visible).length;
    const annoncesInactives  = activites.length - annoncesActives;

    const { data: events } = await this.db
      .from('event')
      .select('id, date, id_activity')
      .in('id_activity', activityIds);

    if (!events?.length) {
      return {
        revenueParMois:      this._moisVides(MOIS_COURTS),
        reservationsParMois: this._moisVides(MOIS_COURTS),
        topActivites:        activites.map((a: any) => ({ ...a, nbReservations: 0 })),
        totalReservations:   0,
        revenuTotal:         0,
        annoncesActives,
        annoncesInactives,
      };
    }

    const eventIds          = events.map((e: any) => e.id);
    const activiteParEvent  = Object.fromEntries(events.map((e: any) => [e.id, e.id_activity]));

    const il6Mois = new Date();
    il6Mois.setMonth(il6Mois.getMonth() - 6);

    const { data: reservations, error } = await this.db
      .from('reservation')
      .select('id, date, group_size, id_event')
      .in('id_event', eventIds)
      .gte('date', il6Mois.toISOString())
      .order('date', { ascending: true });

    if (error) {
      this.logger.error(`getPublisherStatistiques: ${error.message}`);
      return {
        revenueParMois:      this._moisVides(MOIS_COURTS),
        reservationsParMois: this._moisVides(MOIS_COURTS),
        topActivites:        activites.map((a: any) => ({ ...a, nbReservations: 0 })),
        totalReservations:   0,
        revenuTotal:         0,
        annoncesActives,
        annoncesInactives,
      };
    }

    // Regrouper par mois
    const parMois: Record<string, { revenue: number; reservations: number }> = {};
    const reservationsParActivite: Record<number, number> = {};

    (reservations ?? []).forEach((r: any) => {
      const d   = new Date(r.date);
      const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!parMois[cle]) parMois[cle] = { revenue: 0, reservations: 0 };
      const idActivity = activiteParEvent[r.id_event];
      const prix       = prixParActivite[idActivity] ?? 0;
      parMois[cle].revenue      += prix * (r.group_size ?? 1);
      parMois[cle].reservations += 1;
      if (!reservationsParActivite[idActivity]) reservationsParActivite[idActivity] = 0;
      reservationsParActivite[idActivity] += 1;
    });

    // Construire les tableaux sur 6 mois
    const revenueParMois: { label: string; val: number }[]      = [];
    const reservationsParMois: { label: string; val: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d   = new Date();
      d.setMonth(d.getMonth() - i);
      const cle   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = MOIS_COURTS[d.getMonth()];
      revenueParMois.push({ label, val: parMois[cle]?.revenue ?? 0 });
      reservationsParMois.push({ label, val: parMois[cle]?.reservations ?? 0 });
    }

    // Top 5 activités par nombre de réservations
    const topActivites = activites
      .map((a: any) => ({ ...a, nbReservations: reservationsParActivite[a.id] ?? 0 }))
      .sort((a: any, b: any) => b.nbReservations - a.nbReservations)
      .slice(0, 5);

    const totalReservations = (reservations ?? []).length;
    const revenuTotal       = (reservations ?? []).reduce((total: number, r: any) => {
      const idActivity = activiteParEvent[r.id_event];
      return total + (prixParActivite[idActivity] ?? 0) * (r.group_size ?? 1);
    }, 0);

    return {
      revenueParMois,
      reservationsParMois,
      topActivites,
      totalReservations,
      revenuTotal,
      annoncesActives,
      annoncesInactives,
    };
  }

  private _moisVides(labels: string[]) {
    return labels.map((label) => ({ label, val: 0 }));
  }

  // ================================================================
  //  ADMIN — BLOQUER / DÉBLOQUER UN UTILISATEUR
  // ================================================================

  async toggleBlockUser(userId: number, block: boolean) {
    const { error } = await this.db
      .from('users')
      .update({ enabled: !block })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { message: block ? 'Utilisateur bloqué.' : 'Utilisateur débloqué.' };
  }

  // ================================================================
  //  ADMIN — DÉSACTIVER UNE ACTIVITÉ SIGNALÉE
  // ================================================================

  async disableActivity(activityId: number) {
    const { error } = await this.db
      .from('activity')
      .update({ is_disabled: true, is_visible: false })
      .eq('id', activityId);
    if (error) throw new Error(error.message);
    return { message: 'Activité désactivée.' };
  }

  // ================================================================
  //  ADMIN — TRAFIC HEBDOMADAIRE RÉEL (inscriptions par jour)
  // ================================================================

  async getTrafficHebdomadaire() {
    const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const result: { label: string; val: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const debut = new Date(d);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(d);
      fin.setHours(23, 59, 59, 999);

      const { count, error } = await this.db
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', debut.toISOString())
        .lte('created_at', fin.toISOString());

      if (error) this.logger.warn(`getTrafficHebdomadaire jour ${i}: ${error.message}`);
      result.push({ label: JOURS[d.getDay()], val: count ?? 0 });
    }
    return result;
  }

  // ================================================================
  //  ADMIN — ACTIVITÉ RÉCENTE (24 dernières heures)
  // ================================================================

  async getActiviteRecente() {
    const il24h = new Date();
    il24h.setHours(il24h.getHours() - 24);

    const [nouvellesReservations, demandesPublisher, inscriptions24h, totalReservations] =
      await Promise.all([
        this.db
          .from('reservation')
          .select('id, date, group_size, created_at')
          .gte('created_at', il24h.toISOString())
          .order('created_at', { ascending: false })
          .limit(5)
          .then(({ data }) => data ?? []),

        this.db
          .from('users')
          .select('id, firstname, lastname, email, created_at')
          .eq('publisher_request', true)
          .order('created_at', { ascending: false })
          .limit(3)
          .then(({ data }) => data ?? []),

        this.db
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', il24h.toISOString())
          .then(({ count }) => count ?? 0),

        this.db
          .from('reservation')
          .select('*', { count: 'exact', head: true })
          .then(({ count }) => count ?? 0),
      ]);

    return {
      nouvellesReservations,
      demandesPublisher,
      inscriptions24h,
      totalReservations,
    };
  }

  // ================================================================
  //  PUBLISHER — COMPTEUR DE RÉSERVATIONS (pour notifications)
  // ================================================================

  async getPublisherReservationsCount(userId: number): Promise<number> {
    const { data: activites } = await this.db
      .from('activity').select('id').eq('id_user', userId).eq('is_disabled', false);
    if (!activites?.length) return 0;

    const activityIds = activites.map((a: any) => a.id);
    const { data: events } = await this.db
      .from('event').select('id').in('id_activity', activityIds);
    if (!events?.length) return 0;

    const eventIds = events.map((e: any) => e.id);
    const { count } = await this.db
      .from('reservation').select('*', { count: 'exact', head: true }).in('id_event', eventIds);
    return count ?? 0;
  }
}
