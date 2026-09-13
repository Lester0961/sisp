-- Lock down legacy public tables that are only accessed through the server API.
-- Prisma connects with the server-side database role; PostgREST anon/authenticated
-- roles receive no implicit table access until explicit policies are authored.

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_catalog_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_request_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_daily_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_semesters" ENABLE ROW LEVEL SECURITY;

ALTER FUNCTION public.get_user_role() SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.is_service_role() SET search_path = public, pg_temp;
