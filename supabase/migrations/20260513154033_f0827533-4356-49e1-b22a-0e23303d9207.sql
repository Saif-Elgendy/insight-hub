-- 1. Strip public storage prefix from lesson video URLs (player resolves via signed URL)
UPDATE public.lessons
SET video_url = regexp_replace(video_url, '^https?://[^/]+/storage/v1/object/(public|sign)/lesson-videos/', '')
WHERE video_url ~ '/storage/v1/object/(public|sign)/lesson-videos/';

-- Strip query string (signed token leftovers) if any
UPDATE public.lessons
SET video_url = split_part(video_url, '?', 1)
WHERE video_url LIKE '%?%' AND video_url NOT LIKE 'http%';

-- 2. Tighten specialist_reviews SELECT: drop broad authenticated read, add owner + admin
DROP POLICY IF EXISTS "Anyone authenticated can view reviews" ON public.specialist_reviews;

CREATE POLICY "Users can view their own reviews"
  ON public.specialist_reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reviews"
  ON public.specialist_reviews
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure public-safe view exists with safe columns and is queryable by authenticated users
CREATE OR REPLACE VIEW public.specialist_reviews_public
WITH (security_invoker = true) AS
SELECT id, specialist_id, user_id, consultation_id, rating, comment, created_at
FROM public.specialist_reviews;

GRANT SELECT ON public.specialist_reviews_public TO authenticated;