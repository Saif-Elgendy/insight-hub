import { useState, useEffect } from 'react';
import { Star, MessageCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface SpecialistReviewsListProps {
  specialistId: string;
}

export const SpecialistReviewsList = ({ specialistId }: SpecialistReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingCounts: [0, 0, 0, 0, 0], // 1-5 stars
  });

  useEffect(() => {
    fetchReviews();
  }, [specialistId]);

  const fetchReviews = async () => {
    setLoading(true);
    
    // Fetch reviews
    const { data: reviewsData, error } = await supabase
      .from('specialist_reviews')
      .select('*')
      .eq('specialist_id', specialistId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for reviewers
    const userIds = reviewsData.map((r) => r.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    // Merge profiles with reviews
    const reviewsWithProfiles = reviewsData.map((review) => ({
      ...review,
      profile: profilesData?.find((p) => p.user_id === review.user_id) || null,
    }));

    setReviews(reviewsWithProfiles);

    // Calculate stats
    if (reviewsData.length > 0) {
      const total = reviewsData.length;
      const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0);
      const ratingCounts = [0, 0, 0, 0, 0];
      reviewsData.forEach((r) => {
        ratingCounts[r.rating - 1]++;
      });

      setStats({
        averageRating: Math.round((sum / total) * 10) / 10,
        totalReviews: total,
        ratingCounts,
      });
    }

    setLoading(false);
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          التقييمات والتعليقات
          {stats.totalReviews > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({stats.totalReviews} تقييم)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <Star className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">لا توجد تقييمات بعد</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              كن أول من يقيّم هذا المختص
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rating Summary */}
            <div className="flex flex-col sm:flex-row gap-6 p-4 bg-muted/50 rounded-xl">
              {/* Average Rating */}
              <div className="text-center sm:text-right">
                <div className="text-4xl font-bold text-primary">
                  {stats.averageRating}
                </div>
                <div className="mt-1">{renderStars(Math.round(stats.averageRating), 'md')}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  من {stats.totalReviews} تقييم
                </p>
              </div>

              {/* Rating Bars */}
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.ratingCounts[star - 1];
                  const percentage =
                    stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-muted-foreground">{star}</span>
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-muted-foreground text-left">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={review.profile?.avatar_url || undefined}
                        alt={review.profile?.full_name || 'مستخدم'}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {review.profile?.full_name || 'مستخدم مجهول'}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            {renderStars(review.rating)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(review.created_at), 'd MMMM yyyy', {
                                locale: ar,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {review.comment && (
                        <p className="mt-2 text-muted-foreground leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
