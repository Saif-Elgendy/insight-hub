
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_courses(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_consultation_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resubmit_consultant_request() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.book_consultation(uuid, uuid, consultation_type, integer, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.book_consultation(uuid, uuid, consultation_type, integer, text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.book_consultation(uuid, consultation_type, integer, uuid, date, time, text, text, text) FROM anon, PUBLIC;
