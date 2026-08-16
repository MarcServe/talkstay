-- ============================================================================
-- TalkStay — platform settings + usage rollups for pilot / per-QR billing
-- ADDITIVE: ts_platform_settings, hotel billing columns, admin usage RPC.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ts_platform_settings — key/value JSON for TalkStay platform admin controls
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_platform_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);

ALTER TABLE public.ts_platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ts_platform_settings_admin ON public.ts_platform_settings;
CREATE POLICY ts_platform_settings_admin ON public.ts_platform_settings
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed defaults (idempotent)
INSERT INTO public.ts_platform_settings (key, value) VALUES
  ('billing', jsonb_build_object(
    'currency', 'GBP',
    'default_mode', 'pilot',
    'primary_meter', 'active_qr',
    'rate_active_qr', 15,
    'rate_session', 0.5,
    'rate_guest_turn', 0.05,
    'rate_request', 0.25,
    'include_inactive_hotels', false
  )),
  ('defaults', jsonb_build_object(
    'pulse_enabled', true,
    'require_checkin_code', false,
    'max_devices_per_room', 8,
    'default_language', 'English',
    'timezone', 'Europe/London'
  )),
  ('features', jsonb_build_object(
    'guest_pulse', true,
    'live_ops_share', true,
    'portfolio_insights', true,
    'location_orders', true
  )),
  ('support', jsonb_build_object(
    'support_email', 'support@talkstay.talkweb.io',
    'sales_email', 'hello@talkstay.talkweb.io',
    'public_base_url', 'https://talkstay.talkweb.io'
  ))
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Per-hotel commercial / pilot billing fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS billing_notes text,
  ADD COLUMN IF NOT EXISTS billing_rates jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ts_hotels_billing_mode_check'
  ) THEN
    ALTER TABLE public.ts_hotels
      ADD CONSTRAINT ts_hotels_billing_mode_check
      CHECK (billing_mode IN ('subscription', 'usage', 'pilot', 'complimentary'));
  END IF;
END $$;

COMMENT ON COLUMN public.ts_hotels.billing_mode IS
  'Commercial model: subscription (bulk), usage (metered), pilot (usage during trial), complimentary.';
COMMENT ON COLUMN public.ts_hotels.billing_rates IS
  'Optional rate overrides vs platform billing settings: {currency, rate_active_qr, rate_session, rate_guest_turn, rate_request}.';

CREATE INDEX IF NOT EXISTS ts_interactions_hotel_room_time_idx
  ON public.ts_interactions (hotel_id, room_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Usage rollup — per hotel + room (QR) for a time window
-- Called by talkstay-admin (service_role). Not exposed to anon clients.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ts_usage_rollup(
  _since timestamptz,
  _until timestamptz DEFAULT now(),
  _hotel_id uuid DEFAULT NULL
)
RETURNS TABLE (
  hotel_id uuid,
  room_id uuid,
  guest_turns bigint,
  sessions bigint,
  requests bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ix AS (
    SELECT
      i.hotel_id,
      i.room_id,
      count(*) FILTER (WHERE i.role = 'guest')::bigint AS guest_turns,
      count(DISTINCT i.session_id) FILTER (
        WHERE i.role = 'guest' AND i.session_id IS NOT NULL
      )::bigint AS sessions
    FROM public.ts_interactions i
    WHERE i.created_at >= _since
      AND i.created_at < _until
      AND (_hotel_id IS NULL OR i.hotel_id = _hotel_id)
    GROUP BY i.hotel_id, i.room_id
  ),
  rq AS (
    SELECT
      r.hotel_id,
      r.room_id,
      count(*)::bigint AS requests
    FROM public.ts_service_requests r
    WHERE r.created_at >= _since
      AND r.created_at < _until
      AND (_hotel_id IS NULL OR r.hotel_id = _hotel_id)
    GROUP BY r.hotel_id, r.room_id
  )
  SELECT
    COALESCE(ix.hotel_id, rq.hotel_id) AS hotel_id,
    COALESCE(ix.room_id, rq.room_id) AS room_id,
    COALESCE(ix.guest_turns, 0) AS guest_turns,
    COALESCE(ix.sessions, 0) AS sessions,
    COALESCE(rq.requests, 0) AS requests
  FROM ix
  FULL OUTER JOIN rq
    ON rq.hotel_id = ix.hotel_id
   AND rq.room_id IS NOT DISTINCT FROM ix.room_id;
$$;

REVOKE ALL ON FUNCTION public.ts_usage_rollup(timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ts_usage_rollup(timestamptz, timestamptz, uuid) TO service_role;
