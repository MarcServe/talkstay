-- ============================================================================
-- TalkStay — "Notify me on this device" for guests (real web push)
-- ADDITIVE, TalkStay table only. Zero TalkWeb impact.
--   A SEPARATE table from ts_push_subscriptions (staff devices) — on purpose.
--   Keeping guest and staff subscriptions in different tables means the
--   staff-alert send path (talkstay-notify) can never accidentally reach a
--   guest's phone, and the guest-update send path can never reach staff.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ts_guest_push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  room_id     uuid REFERENCES public.ts_rooms(id) ON DELETE CASCADE,
  session_id  text NOT NULL,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_guest_push_subs_session_idx
  ON public.ts_guest_push_subscriptions (hotel_id, session_id);

ALTER TABLE public.ts_guest_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: guests are never authenticated (room-token access
-- only), so all reads/writes go through talkstay-guest-chat's service-role
-- client. Staff have no dashboard need to see a guest's raw subscription rows.
