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
    const { error } = await this.db.from('review').upsert(
      {
        id_activity: dto.id_activity,
        id_user: userId,
        rating: dto.rating,
        comment: dto.comment,
      },
      { onConflict: 'id_user,id_activity' },
    );

    if (error) throw new Error(error.message);

    await this.updateAverageRating(dto.id_activity);
    return { success: true };
  }

  private async updateAverageRating(activityId: number) {
    const { data, error } = await this.db
      .from('review')
      .select('rating')
      .eq('id_activity', activityId);

    if (error || !data?.length) return;

    const avg =
      data.reduce((sum: number, r: any) => sum + Number(r.rating), 0) /
      data.length;

    await this.db
      .from('activity')
      .update({ average_rating: parseFloat(avg.toFixed(2)) })
      .eq('id', activityId);
  }

  async getReviewsByActivity(activityId: number) {
    const { data, error } = await this.db
      .from('review')
      .select('id, rating, comment, created_at, id_user')
      .eq('id_activity', activityId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const reviews = await Promise.all(
      (data ?? []).map(async (r: any) => {
        const { data: user } = await this.db
          .from('users')
          .select('firstname, lastname')
          .eq('id', r.id_user)
          .maybeSingle();

        return {
          id: r.id,
          id_user: r.id_user,
          auteur: user
            ? `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim()
            : 'Participant',
          note: r.rating,
          commentaire: r.comment,
          created_at: r.created_at,
        };
      }),
    );

    return reviews;
  }

  async getReviewsByPublisher(userId: number) {
    const { data: activities, error: e1 } = await this.db
      .from('activity')
      .select('id, title, images, theme, average_rating')
      .eq('id_user', userId);

    if (e1 || !activities?.length) {
      return {
        reviews: [],
        stats: { total: 0, average: 0, positive: 0, ratedActivities: 0 },
      };
    }

    const activityIds = activities.map((a: any) => a.id);
    const activityMap: Record<number, any> = Object.fromEntries(
      activities.map((a: any) => [a.id, a]),
    );

    const { data: reviewsData, error: e2 } = await this.db
      .from('review')
      .select('id, rating, comment, created_at, id_user, id_activity')
      .in('id_activity', activityIds)
      .order('created_at', { ascending: false });

    if (e2) throw new Error(e2.message);

    const reviewsList = reviewsData ?? [];
    const total = reviewsList.length;
    const average = total
      ? reviewsList.reduce((s: number, r: any) => s + Number(r.rating), 0) /
        total
      : 0;
    const positive = reviewsList.filter(
      (r: any) => Number(r.rating) >= 4,
    ).length;

    // Fetch user info for all unique user IDs
    const userIds = [...new Set(reviewsList.map((r: any) => r.id_user).filter(Boolean))];
    const { data: usersData } = await this.db
      .from('users')
      .select('id, firstname, lastname, avatar_url')
      .in('id', userIds);
    const userMap: Record<number, any> = Object.fromEntries(
      (usersData ?? []).map((u: any) => [u.id, u]),
    );

    const grouped: Record<number, any> = {};
    reviewsList.forEach((r: any) => {
      const act = activityMap[r.id_activity];
      if (!act) return;
      if (!grouped[r.id_activity]) {
        grouped[r.id_activity] = {
          actId: r.id_activity,
          actTitle: act.title,
          actImg: act.images,
          actTheme: act.theme,
          actAvgRating: act.average_rating,
          reviews: [],
        };
      }
      const user = userMap[r.id_user];
      grouped[r.id_activity].reviews.push({
        id: r.id,
        id_user: r.id_user,
        firstname: user?.firstname ?? null,
        lastname: user?.lastname ?? null,
        avatar_url: user?.avatar_url ?? null,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      });
    });

    return {
      reviews: Object.values(grouped),
      stats: {
        total,
        average: parseFloat(average.toFixed(2)),
        positive,
        ratedActivities: Object.keys(grouped).length,
      },
    };
  }
}
