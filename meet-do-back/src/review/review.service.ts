import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getAdminClient();
  }

  async submitReview(
    dto: { id_activity: number; rating: number; comment: string },
    userId: number,
  ) {
    const { error } = await this.db.from('review').insert({
      id_activity: dto.id_activity,
      id_user: userId,
      rating: dto.rating,
      comment: dto.comment,
    });

    if (error) {
      this.logger.error(`submitReview: ${error.message}`);
      throw new Error("Impossible d'enregistrer l'avis.");
    }

    await this.updateAverageRating(dto.id_activity);
    return { message: 'Avis enregistré.' };
  }

  private async updateAverageRating(activityId: number) {
    const { data } = await this.db
      .from('review')
      .select('rating')
      .eq('id_activity', activityId);

    if (!data?.length) return;

    const avg =
      data.reduce((s: number, r: any) => s + Number(r.rating), 0) / data.length;

    await this.db
      .from('activity')
      .update({ average_rating: Math.round(avg * 10) / 10 })
      .eq('id', activityId);
  }

  async getReviewsByActivity(activityId: number) {
    const { data, error } = await this.db
      .from('review')
      .select('id, rating, comment, created_at, id_user')
      .eq('id_activity', activityId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`getReviewsByActivity: ${error.message}`);
      return [];
    }

    const userIds = [
      ...new Set((data ?? []).map((r: any) => r.id_user).filter(Boolean)),
    ];
    const usersMap: Record<number, any> = {};
    if (userIds.length) {
      const { data: users } = await this.db
        .from('users')
        .select('id, firstname, lastname')
        .in('id', userIds);
      for (const u of users ?? []) usersMap[u.id] = u;
    }

    return (data ?? []).map((r: any) => ({
      id: r.id,
      note: r.rating,
      commentaire: r.comment,
      created_at: r.created_at,
      auteur:
        usersMap[r.id_user]
          ? `${usersMap[r.id_user].firstname || ''} ${usersMap[r.id_user].lastname || ''}`.trim() || 'Anonymous'
          : 'Anonymous',
    }));
  }

  async getReviewsByPublisher(userId: number) {
    const { data: activities } = await this.db
      .from('activity')
      .select('id, title, images, average_rating, theme')
      .eq('id_user', userId);

    const empty = {
      reviews: [],
      stats: { total: 0, average: null, positive: 0, ratedActivities: 0 },
    };

    if (!activities?.length) return empty;

    const activityIds = activities.map((a: any) => a.id);
    const activityMap = Object.fromEntries(
      activities.map((a: any) => [a.id, a]),
    );

    const { data: reviews, error } = await this.db
      .from('review')
      .select('id, rating, comment, created_at, id_activity, id_user')
      .in('id_activity', activityIds)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`getReviewsByPublisher: ${error.message}`);
      return empty;
    }

    const allReviews = reviews ?? [];
    const total = allReviews.length;
    const average = total
      ? allReviews.reduce((s: number, r: any) => s + Number(r.rating), 0) / total
      : null;
    const positive = allReviews.filter((r: any) => Number(r.rating) >= 4).length;
    const ratedActivityIds = new Set(allReviews.map((r: any) => r.id_activity));

    const grouped = activityIds
      .map((id: number) => {
        const act = activityMap[id];
        const actReviews = allReviews.filter((r: any) => r.id_activity === id);
        if (!actReviews.length) return null;
        return {
          id,
          title: act.title,
          images: act.images,
          average_rating: act.average_rating,
          theme: act.theme,
          reviews: actReviews.map((r: any) => ({
            id: r.id,
            note: r.rating,
            commentaire: r.comment,
            created_at: r.created_at,
            id_user: r.id_user,
          })),
        };
      })
      .filter(Boolean);

    return {
      reviews: grouped,
      stats: {
        total,
        average: average != null ? Math.round(average * 100) / 100 : null,
        positive,
        ratedActivities: ratedActivityIds.size,
      },
    };
  }
}
