-- ============================================================================
-- TalkStay — guest update contact (low-friction email first) + auto guest notify
-- ADDITIVE, TalkStay tables only.
--  * ts_guest_sessions gains the contact the guest chose for updates.
--  * A trigger on ts_service_requests fires talkstay-guest-notify whenever a
--    request's STATUS changes, so guests are told when work is accepted /
--    on the way / completed — regardless of who moved it (staff UI, cron, API).
-- ============================================================================

ALTER TABLE public.ts_guest_sessions
  ADD COLUMN IF NOT EXISTS notify_channel text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- One row per device session so contact details can be upserted.
CREATE UNIQUE INDEX IF NOT EXISTS ts_guest_sessions_session_uniq
  ON public.ts_guest_sessions (hotel_id, session_id);

CREATE OR REPLACE FUNCTION public.ts_notify_guest_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg';
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('accepted','on_the_way','completed') THEN
    PERFORM net.http_post(
      url := 'https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/talkstay-guest-notify',
      headers := jsonb_build_object(
        'Content-Type','application/json','apikey',anon,'Authorization','Bearer ' || anon),
      body := jsonb_build_object('requestId', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ts_requests_guest_notify ON public.ts_service_requests;
CREATE TRIGGER ts_requests_guest_notify
  AFTER UPDATE ON public.ts_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.ts_notify_guest_on_status();
