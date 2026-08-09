-- ============================================================================
-- TalkStay — mid-stay pulse checks ("How has your stay been?")
-- ADDITIVE, TalkStay tables only. Zero TalkWeb impact.
--
--   A guest shouldn't have to wait until they're angry enough to leave a 1-star
--   review. The in-room QR asks during the stay, the answer is classified
--   (service · issue · sentiment · severity) and a negative one raises a real
--   service request so the existing routing/notify/reply loop reaches the
--   manager while the guest is still in the building.
--
--   issue_key comes from a FIXED taxonomy on purpose: free text can't be
--   aggregated, and the whole point is trending the same issue over time to
--   show whether the property actually improved.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ts_guest_pulse (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  room_id        uuid REFERENCES public.ts_rooms(id) ON DELETE SET NULL,
  session_id     text,                    -- the stay's chat session (verified by room token)
  body           text NOT NULL,           -- what the guest actually said
  language       text,
  rating         smallint CHECK (rating BETWEEN 1 AND 5),  -- optional quick tap
  sentiment      text NOT NULL DEFAULT 'neutral'
                 CHECK (sentiment IN ('positive','neutral','negative')),
  severity       text NOT NULL DEFAULT 'low'
                 CHECK (severity IN ('low','medium','high')),
  department_key text,                    -- which team the experience is about
  issue_key      text NOT NULL DEFAULT 'other',
  issue_label    text,                    -- human phrasing for the card ("Staff attitude")
  request_id     uuid REFERENCES public.ts_service_requests(id) ON DELETE SET NULL,
  classified_by  text NOT NULL DEFAULT 'llm',  -- llm | keyword | rating
  acknowledged_at timestamptz,
  acknowledged_by uuid,                   -- auth.users id of the staff member
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Trend queries are always "this hotel, this window, grouped by dept/issue".
CREATE INDEX IF NOT EXISTS ts_guest_pulse_hotel_idx
  ON public.ts_guest_pulse (hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ts_guest_pulse_trend_idx
  ON public.ts_guest_pulse (hotel_id, issue_key, created_at DESC);

ALTER TABLE public.ts_guest_pulse ENABLE ROW LEVEL SECURITY;

-- Hotel staff read/manage in the dashboard. Guests never touch this table
-- directly — they submit through the token-validated edge function (service
-- role), which is what makes every row a verified guest of a known room.
DROP POLICY IF EXISTS ts_guest_pulse_access ON public.ts_guest_pulse;
CREATE POLICY ts_guest_pulse_access ON public.ts_guest_pulse
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));

-- Per-property switch: some owners won't want to prompt guests at all.
ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS pulse_enabled boolean NOT NULL DEFAULT true;
