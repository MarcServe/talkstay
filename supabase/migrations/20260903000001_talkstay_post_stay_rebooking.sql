-- ============================================================================
-- TalkStay — post-stay direct rebooking
-- ADDITIVE
-- When a private room goes vacant (staff check-out or auto-checkout), notify
-- guests who left an email so they can book their next stay directly.
-- Booking URL + return offer live in ts_hotels.branding jsonb (no new columns).
-- ============================================================================

ALTER TABLE public.ts_guest_sessions
  ADD COLUMN IF NOT EXISTS post_stay_email_sent_at timestamptz;

COMMENT ON COLUMN public.ts_guest_sessions.post_stay_email_sent_at IS
  'When TalkStay emailed this guest a post-stay direct-rebooking CTA for the stay.';

CREATE OR REPLACE FUNCTION public.ts_notify_post_stay_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg';
BEGIN
  -- Only private rooms flipping occupied → vacant (staff or ts_auto_checkout).
  IF NEW.occupancy_status = 'vacant'
     AND OLD.occupancy_status IS DISTINCT FROM 'vacant'
     AND COALESCE(NEW.is_public, false) = false THEN
    PERFORM net.http_post(
      url := 'https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/talkstay-post-stay',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', anon,
        'Authorization', 'Bearer ' || anon
      ),
      body := jsonb_build_object('roomId', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ts_rooms_post_stay_notify ON public.ts_rooms;
CREATE TRIGGER ts_rooms_post_stay_notify
  AFTER UPDATE OF occupancy_status ON public.ts_rooms
  FOR EACH ROW EXECUTE FUNCTION public.ts_notify_post_stay_on_checkout();
