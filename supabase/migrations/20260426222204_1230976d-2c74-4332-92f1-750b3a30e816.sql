
ALTER TABLE public.course_progress
  ADD COLUMN IF NOT EXISTS last_lesson_id uuid,
  ADD COLUMN IF NOT EXISTS completed_lesson_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE OR REPLACE FUNCTION public.sync_course_progress_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
BEGIN
  SELECT COUNT(*) INTO total FROM public.lessons WHERE course_id = NEW.course_id;
  NEW.total_lessons := total;
  NEW.completed_lessons := COALESCE(array_length(NEW.completed_lesson_ids, 1), 0);
  IF total > 0 AND NEW.completed_lessons >= total THEN
    NEW.is_completed := true;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  ELSE
    NEW.is_completed := false;
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_course_progress_counts_trigger ON public.course_progress;
CREATE TRIGGER sync_course_progress_counts_trigger
BEFORE INSERT OR UPDATE ON public.course_progress
FOR EACH ROW EXECUTE FUNCTION public.sync_course_progress_counts();
