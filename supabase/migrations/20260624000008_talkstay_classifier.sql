-- ============================================================================
-- TalkStay — reliable hybrid classifier support (observability + triage)
-- ADDITIVE on ts_service_requests only. Lets the router record HOW a request was
-- classified (rule / llm / keyword / fallback) and flag ones that need a human
-- to double-check the routing (guaranteed no lost/mis-routed request at scale).
-- ============================================================================

ALTER TABLE public.ts_service_requests
  ADD COLUMN IF NOT EXISTS needs_triage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS classification_method text;
