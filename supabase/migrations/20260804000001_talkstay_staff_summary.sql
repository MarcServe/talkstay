-- ============================================================================
-- TalkStay — staff-language request summary (B4)
-- ADDITIVE, TalkStay table only. Zero impact on TalkWeb.
--   `summary` stays the English canonical (shown to guests + used as fallback).
--   `summary_staff` holds the summary translated into the hotel's language so
--   staff read requests in their own language. NULL = show `summary` (English).
-- ============================================================================

ALTER TABLE public.ts_service_requests
  ADD COLUMN IF NOT EXISTS summary_staff text;
