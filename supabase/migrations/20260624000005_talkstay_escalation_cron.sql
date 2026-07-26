-- ============================================================================
-- TalkStay — auto-escalation cron (Phase 5 part 2)
-- ADDITIVE: a new function + a named cron job scoped to TalkStay data only.
-- Escalates any 'new' request left past its department's escalate_after_minutes:
-- marks it urgent, writes a system 'escalated' audit event, and re-notifies via
-- talkstay-notify (using the PUBLIC anon key — safe to embed; it is already in
-- the client bundle and the function is deploy-time --no-verify-jwt).
-- Nothing existing in the TalkWeb project is affected.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ts_auto_escalate()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec record;
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg';
BEGIN
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
    -- best-effort re-notification (department email + owner copy)
    PERFORM net.http_post(
      url := 'https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/talkstay-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', anon,
        'Authorization', 'Bearer ' || anon
      ),
      body := jsonb_build_object('requestId', rec.id)
    );
  END LOOP;
END;
$$;

-- (Re)schedule the job to run every minute.
SELECT cron.unschedule('ts-auto-escalate')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ts-auto-escalate');

SELECT cron.schedule('ts-auto-escalate', '* * * * *', $$SELECT public.ts_auto_escalate();$$);
