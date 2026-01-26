import { useState } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SpecialistReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultationId: string;
  specialistId: string;
  specialistName: string;
  onReviewSubmitted?: () => void;
}

export const SpecialistReviewDialog = ({
  open,
  onOpenChange,
  consultationId,
  specialistId,
  specialistName,
  onReviewSubmitted,
}: SpecialistReviewDialogProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول');
      return;
    }

    if (rating === 0) {
      toast.error('يرجى اختيار تقييم');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('specialist_reviews').insert({
        specialist_id: specialistId,
        user_id: user.id,
        consultation_id: consultationId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('لقد قمت بتقييم هذه الاستشارة مسبقاً');
        } else {
          throw error;
        }
      } else {
        toast.success('شكراً لتقييمك!');
        onOpenChange(false);
        onReviewSubmitted?.();
        // Reset form
        setRating(0);
        setComment('');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('حدث خطأ أثناء إرسال التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">تقييم المختص</DialogTitle>
          <DialogDescription>
            شاركنا رأيك في استشارتك مع {specialistName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">كيف كانت تجربتك؟</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`تقييم ${star} نجوم`}
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className="text-sm font-medium text-primary">
                {displayRating === 1 && 'ضعيف'}
                {displayRating === 2 && 'مقبول'}
                {displayRating === 3 && 'جيد'}
                {displayRating === 4 && 'جيد جداً'}
                {displayRating === 5 && 'ممتاز'}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="review-comment" className="text-sm font-medium">
              تعليقك (اختياري)
            </label>
            <Textarea
              id="review-comment"
              placeholder="شاركنا المزيد عن تجربتك..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-left">
              {comment.length}/500
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Send className="w-4 h-4 ml-2" />
            )}
            إرسال التقييم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
