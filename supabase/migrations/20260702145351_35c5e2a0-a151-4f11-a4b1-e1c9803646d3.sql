
REVOKE EXECUTE ON FUNCTION public.book_consultation(uuid, consultation_type, integer, uuid, date, time without time zone, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.book_consultation(uuid, uuid, consultation_type, integer, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_consultation(uuid, consultation_type, integer, uuid, date, time without time zone, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_consultation(uuid, uuid, consultation_type, integer, text, text, text) TO authenticated;
