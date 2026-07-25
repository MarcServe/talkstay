-- ============================================================================
-- TalkStay — engagement / audit log (Phase 5)
-- ADDITIVE: one new ts_-prefixed table. Captures EVERY guest interaction (not
-- just service requests) — questions, small talk, incomplete conversations — so
-- a hotel can prove engagement and see how many guests are actually using it.
-- Written by the talkstay-guest-chat edge function (service_role). Readable by
-- hotel members via RLS. Nothing existing is touched.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ts_interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  room_id     uuid REFERENCES public.ts_rooms(id) ON DELETE SET NULL,
  session_id  text,
  role        text NOT NULL CHECK (role IN ('guest', 'assistant')),
  content     text,
  -- What the guest turn was about: question (answered from KB), request,
  -- complaint, smalltalk, or other. Set on the guest row; assistant rows use 'reply'.
  intent      text,
  language    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_interactions_hotel_time_idx
  ON public.ts_interactions (hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ts_interactions_session_idx
  ON public.ts_interactions (hotel_id, session_id);

ALTER TABLE public.ts_interactions ENABLE ROW LEVEL SECURITY;

-- Hotel owners/staff/admin can read their hotel's engagement log.
CREATE POLICY ts_interactions_read ON public.ts_interactions
  FOR SELECT USING (public.ts_can_access_hotel(hotel_id, auth.uid()));
