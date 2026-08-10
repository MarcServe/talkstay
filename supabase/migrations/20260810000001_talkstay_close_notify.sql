-- ============================================================================
-- TalkStay — notify guests when a request is cancelled (staff or guest close).
-- Completes the close-loop: accepted / on_the_way / completed / cancelled.
-- ============================================================================

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
     AND NEW.status IN ('accepted','on_the_way','completed','cancelled') THEN
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
