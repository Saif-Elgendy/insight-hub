
-- Drop all existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS notify_specialist_on_new_consultation ON public.consultations;
DROP TRIGGER IF EXISTS notify_student_on_consultation_update ON public.consultations;
DROP TRIGGER IF EXISTS notify_students_on_new_course ON public.courses;
DROP TRIGGER IF EXISTS notify_admin_on_new_enrollment ON public.enrollments;
DROP TRIGGER IF EXISTS notify_student_on_enrollment_update ON public.enrollments;
DROP TRIGGER IF EXISTS check_and_ban_user ON public.violations;
DROP TRIGGER IF EXISTS update_specialist_rating ON public.specialist_reviews;
DROP TRIGGER IF EXISTS protect_super_admin_role ON public.user_roles;
DROP TRIGGER IF EXISTS prevent_super_admin_delete ON public.user_roles;
DROP TRIGGER IF EXISTS update_consultations_updated_at ON public.consultations;
DROP TRIGGER IF EXISTS update_consultant_requests_updated_at ON public.consultant_requests;
DROP TRIGGER IF EXISTS update_enrollments_updated_at ON public.enrollments;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate all triggers
CREATE TRIGGER notify_specialist_on_new_consultation
AFTER INSERT ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.notify_specialist_on_new_consultation();

CREATE TRIGGER notify_student_on_consultation_update
AFTER UPDATE ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_consultation_update();

CREATE TRIGGER notify_students_on_new_course
AFTER INSERT ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.notify_students_on_new_course();

CREATE TRIGGER notify_admin_on_new_enrollment
AFTER INSERT ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_enrollment();

CREATE TRIGGER notify_student_on_enrollment_update
AFTER INSERT OR UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_enrollment_update();

CREATE TRIGGER check_and_ban_user
AFTER INSERT ON public.violations
FOR EACH ROW EXECUTE FUNCTION public.check_and_ban_user();

CREATE TRIGGER update_specialist_rating
AFTER INSERT OR UPDATE OR DELETE ON public.specialist_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_specialist_rating();

CREATE TRIGGER protect_super_admin_role
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_role();

CREATE TRIGGER prevent_super_admin_delete
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_super_admin_delete();

CREATE TRIGGER update_consultations_updated_at
BEFORE UPDATE ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultant_requests_updated_at
BEFORE UPDATE ON public.consultant_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
