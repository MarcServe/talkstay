-- ============================================================================
-- TalkStay — team: staff names + custom departments (Phase: team management)
-- ADDITIVE / RELAXING on TalkStay's own tables only. No TalkWeb object touched.
-- ============================================================================

-- Staff display name (shown on "accepted by …").
ALTER TABLE public.ts_staff ADD COLUMN IF NOT EXISTS name text;

-- Allow hotels to add their own departments beyond the built-in 8: drop the
-- fixed-list CHECK constraints on our department key columns. The app still
-- seeds the standard 8 and validates keys in the UI/edge functions.
ALTER TABLE public.ts_departments        DROP CONSTRAINT IF EXISTS ts_departments_key_check;
ALTER TABLE public.ts_service_requests   DROP CONSTRAINT IF EXISTS ts_service_requests_department_key_check;
