-- ============================================================================
-- TalkStay — enable realtime on the service-requests queue (Phase 4)
-- ADDITIVE: only touches TalkStay's own ts_service_requests table. Adds it to
-- the supabase_realtime publication so the staff Operations dashboard receives
-- live inserts/updates, and sets REPLICA IDENTITY FULL so update payloads carry
-- the full row. No existing table is affected.
-- ============================================================================

ALTER TABLE public.ts_service_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ts_service_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ts_service_requests;
  END IF;
END $$;
