-- ============================================================================
-- TalkStay — notification config (Phase 5 part 2)
-- ADDITIVE: adds columns to TalkStay's own ts_departments and a new
-- ts_push_subscriptions table. No existing TalkWeb object is touched.
-- ============================================================================

-- Per-department alert routing + escalation threshold.
ALTER TABLE public.ts_departments
  ADD COLUMN IF NOT EXISTS notify_email text,
  ADD COLUMN IF NOT EXISTS escalate_after_minutes integer NOT NULL DEFAULT 5;

-- Web-push subscriptions for staff devices.
CREATE TABLE IF NOT EXISTS public.ts_push_subscriptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL,
  department_key text,
  endpoint       text NOT NULL UNIQUE,
  p256dh         text NOT NULL,
  auth           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ts_push_subs_hotel_idx ON public.ts_push_subscriptions (hotel_id);

ALTER TABLE public.ts_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A staff member manages their own device subscriptions; owners/admin can see all.
CREATE POLICY ts_push_self ON public.ts_push_subscriptions
  FOR ALL USING (user_id = auth.uid() OR public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.ts_can_access_hotel(hotel_id, auth.uid()));
