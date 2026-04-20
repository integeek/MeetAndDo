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
      .select('id, firstname, lastname, email, created_at')
      .eq('publisher_request', true)
      .order('created_at', { ascending: false });
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
      const match = otherId.match(/^00000000-0000-0000-0000-0*(\d+)$/);
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
}
