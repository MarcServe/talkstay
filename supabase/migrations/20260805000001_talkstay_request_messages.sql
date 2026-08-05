-- ============================================================================
-- TalkStay — human staff replies into the guest conversation
-- ADDITIVE, TalkStay tables only. Zero TalkWeb impact.
--   A member of staff can answer a guest directly ("no red wine tonight, but we
--   have a lovely white"). The reply lands in the guest's assistant chat,
--   translated into the guest's language. body = what staff typed;
--   body_guest = translated for the guest (falls back to body).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ts_request_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES public.ts_service_requests(id) ON DELETE CASCADE,
  hotel_id    uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  sender      text NOT NULL CHECK (sender IN ('staff','guest')),
  staff_label text,                 -- "Front Desk · Jane" for display to the guest
  body        text NOT NULL,        -- original (as staff typed it)
  body_guest  text,                 -- translated into the guest's language
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_request_messages_request_idx
  ON public.ts_request_messages (request_id, created_at);

ALTER TABLE public.ts_request_messages ENABLE ROW LEVEL SECURITY;

-- Hotel staff (owner / manager / assigned staff) can read the thread in the
-- dashboard. Guests never touch this table directly — they read via the
-- token-validated edge function (service role), so no anon policy is needed.
DROP POLICY IF EXISTS ts_request_messages_access ON public.ts_request_messages;
CREATE POLICY ts_request_messages_access ON public.ts_request_messages
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
