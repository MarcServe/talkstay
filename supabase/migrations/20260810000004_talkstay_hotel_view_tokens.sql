-- Read-only campaign / marketing live-view links for a hotel ops queue.
-- Recipients open /live/<token> with no signup. Owner can revoke anytime.

CREATE TABLE IF NOT EXISTS public.ts_hotel_view_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE
              DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  label       text,
  is_active   boolean NOT NULL DEFAULT true,
  expires_at  timestamptz,
  created_by  uuid,
  last_seen_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_hotel_view_tokens_hotel_idx
  ON public.ts_hotel_view_tokens (hotel_id);
CREATE INDEX IF NOT EXISTS ts_hotel_view_tokens_token_idx
  ON public.ts_hotel_view_tokens (token) WHERE is_active;

ALTER TABLE public.ts_hotel_view_tokens ENABLE ROW LEVEL SECURITY;

-- Owners / managers manage tokens for their hotel; anon never reads tokens via RLS.
DROP POLICY IF EXISTS ts_hotel_view_tokens_access ON public.ts_hotel_view_tokens;
CREATE POLICY ts_hotel_view_tokens_access ON public.ts_hotel_view_tokens
  FOR ALL TO authenticated
  USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
