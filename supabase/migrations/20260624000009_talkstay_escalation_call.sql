-- ============================================================================
-- TalkStay — phone-call escalation (Phase 5)
-- ADDITIVE: hotel escalation phone + the auto-escalation cron now also rings a
-- manager/front-desk number (via talkstay-call) when a request goes overdue.
-- TalkStay objects only.
-- ============================================================================

ALTER TABLE public.ts_hotels ADD COLUMN IF NOT EXISTS escalation_phone text;

CREATE OR REPLACE FUNCTION public.ts_auto_escalate()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec record;
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg';
  hdrs jsonb;
BEGIN
  hdrs := jsonb_build_object('Content-Type','application/json','apikey',anon,'Authorization','Bearer ' || anon);

  FOR rec IN
    SELECT sr.id
    FROM public.ts_service_requests sr
    JOIN public.ts_departments d
      ON d.hotel_id = sr.hotel_id AND d.key = sr.department_key
    WHERE sr.status = 'new'
      AND sr.priority <> 'urgent'
      AND sr.created_at < now() - make_interval(mins => COALESCE(d.escalate_after_minutes, 5))
    LIMIT 100
  LOOP
    UPDATE public.ts_service_requests SET priority = 'urgent' WHERE id = rec.id;
    INSERT INTO public.ts_request_events(request_id, status, actor_type, note)
      VALUES (rec.id, 'escalated', 'system', 'auto-escalated (overdue)');
    -- re-notify (email/push) …
    PERFORM net.http_post(
      url := 'https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/talkstay-notify',
      headers := hdrs, body := jsonb_build_object('requestId', rec.id));
    -- … and ring the escalation phone (no-op if the hotel has no number / Twilio unset).
    PERFORM net.http_post(
      url := 'https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/talkstay-call',
      headers := hdrs, body := jsonb_build_object('requestId', rec.id));
  END LOOP;
END;
$$;
