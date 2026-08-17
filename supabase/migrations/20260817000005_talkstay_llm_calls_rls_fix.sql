-- ============================================================================
-- TalkStay — SECURITY FIX: ts_llm_calls was readable and writable by anon
--
--   The table exists in production but without RLS: an anonymous caller (the
--   anon key ships in the frontend bundle by design) could SELECT every row
--   and INSERT new ones. That exposes per-property usage and AI cost, and lets
--   anyone poison the numbers the Usage/billing screens are built on.
--
--   20260816000004 declared the right policy, so the DDL below simply never
--   reached the database — the table half of that migration ran and the RLS
--   half didn't. Re-asserted here, idempotently, so it can be applied safely
--   whatever state the database is in.
--
--   Writes come from edge functions using the service role, which bypasses RLS
--   entirely — so no INSERT policy is needed, and its absence is the point.
-- ============================================================================

ALTER TABLE public.ts_llm_calls ENABLE ROW LEVEL SECURITY;
-- Belt and braces: without FORCE, a future table owner could read around RLS.
ALTER TABLE public.ts_llm_calls FORCE ROW LEVEL SECURITY;

-- Drop anything permissive that may have been created along the way.
DROP POLICY IF EXISTS ts_llm_calls_admin_select ON public.ts_llm_calls;
DROP POLICY IF EXISTS ts_llm_calls_anon_select ON public.ts_llm_calls;
DROP POLICY IF EXISTS ts_llm_calls_all ON public.ts_llm_calls;
DROP POLICY IF EXISTS ts_llm_calls_insert ON public.ts_llm_calls;

-- Platform admins read; nobody else reads, and nobody writes except service role.
CREATE POLICY ts_llm_calls_admin_select ON public.ts_llm_calls
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- PostgREST honours table grants before RLS; revoke so the API can't even try.
REVOKE ALL ON public.ts_llm_calls FROM anon;
REVOKE ALL ON public.ts_llm_calls FROM authenticated;
GRANT SELECT ON public.ts_llm_calls TO authenticated;
