-- ============================================================================
-- TalkStay — per-call LLM usage attributed to hotel / room (QR)
-- ADDITIVE: ts_llm_calls for OpenAI COGS rollups (Admin Usage).
-- OpenAI's dashboard cannot break spend down by room; we record it here.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ts_llm_calls (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  room_id          uuid REFERENCES public.ts_rooms(id) ON DELETE SET NULL,
  session_id       text,
  purpose          text NOT NULL DEFAULT 'chat',
  model            text NOT NULL,
  prompt_tokens    int NOT NULL DEFAULT 0,
  completion_tokens int NOT NULL DEFAULT 0,
  total_tokens     int NOT NULL DEFAULT 0,
  cost_usd         numeric(12, 6) NOT NULL DEFAULT 0,
  latency_ms       int,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_llm_calls_hotel_time_idx
  ON public.ts_llm_calls (hotel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ts_llm_calls_hotel_room_time_idx
  ON public.ts_llm_calls (hotel_id, room_id, created_at DESC);

COMMENT ON TABLE public.ts_llm_calls IS
  'Attributed OpenAI (and similar) calls for per-QR / per-room cost. Written by edge functions; Admin Usage aggregates cost_usd.';

ALTER TABLE public.ts_llm_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ts_llm_calls_admin_select ON public.ts_llm_calls;
CREATE POLICY ts_llm_calls_admin_select ON public.ts_llm_calls
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Service role (edge) bypasses RLS for inserts. No anon/authenticated insert.
