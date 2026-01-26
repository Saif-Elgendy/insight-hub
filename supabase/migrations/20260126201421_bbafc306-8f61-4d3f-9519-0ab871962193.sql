-- Create specialist reviews table
CREATE TABLE public.specialist_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (consultation_id) -- One review per consultation
);

-- Enable RLS
ALTER TABLE public.specialist_reviews ENABLE ROW LEVEL SECURITY;

-- Users can view all reviews (for transparency)
CREATE POLICY "Anyone authenticated can view reviews"
ON public.specialist_reviews
FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can only create reviews for their own completed consultations
CREATE POLICY "Users can create reviews for their completed consultations"
ON public.specialist_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.consultations
    WHERE id = consultation_id
    AND user_id = auth.uid()
    AND status = 'completed'
  )
);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.specialist_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON public.specialist_reviews
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update specialist rating after review
CREATE OR REPLACE FUNCTION public.update_specialist_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  -- Calculate new average rating
  SELECT COALESCE(AVG(rating), 5.0) INTO avg_rating
  FROM public.specialist_reviews
  WHERE specialist_id = COALESCE(NEW.specialist_id, OLD.specialist_id);
  
  -- Update specialist rating
  UPDATE public.specialists
  SET rating = ROUND(avg_rating, 1)
  WHERE id = COALESCE(NEW.specialist_id, OLD.specialist_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to update rating on insert, update, delete
CREATE TRIGGER update_rating_on_review_insert
AFTER INSERT ON public.specialist_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_specialist_rating();

CREATE TRIGGER update_rating_on_review_update
AFTER UPDATE ON public.specialist_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_specialist_rating();

CREATE TRIGGER update_rating_on_review_delete
AFTER DELETE ON public.specialist_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_specialist_rating();