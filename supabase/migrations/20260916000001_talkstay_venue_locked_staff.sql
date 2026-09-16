-- ============================================================================
-- TalkStay — locking a staff member to one venue
--
--   ts_staff.room_id already existed, but it only ever meant "page this person
--   first for that venue". Staff assigned to the Lobby still opened the whole
--   Bar queue. Reading that column as a lock would have silently taken access
--   away from everyone already pinned — three people on this property alone —
--   so the lock is a separate, deliberate flag.
--
--   venue_locked = false (default)
--     Unchanged. The person covers the whole department: every venue, plus the
--     room-service requests that belong to no venue. This is the generic team.
--
--   venue_locked = true
--     They see their venue and nothing else. Not other bars, and not room
--     requests — a room order is the generic department's work, and a pool bar
--     has no business reading what room 418 ordered.
--
--   Alerting is deliberately NOT narrowed to match. talkstay-notify still
--   falls back to the wider department, so when the locked person steps away
--   somebody can still pick the request up. A lock is about what a dashboard
--   shows, not about leaving a guest waiting.
-- ============================================================================

ALTER TABLE public.ts_staff
  ADD COLUMN IF NOT EXISTS venue_locked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ts_staff.venue_locked IS
  'When true and room_id is set, this member only sees requests for that venue '
  '— not other venues, and not room requests. False (default) keeps the '
  'existing behaviour: room_id only prioritises alerts.';

-- Same checks as before, plus the venue rule. Kept as a new 4-argument
-- function rather than a change in place, so the old 3-argument one stays
-- valid for anything still calling it while the policy moves over.
CREATE OR REPLACE FUNCTION public.ts_can_access_request(
  _hotel_id uuid,
  _department_key text,
  _room_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.ts_hotels h
      WHERE h.id = _hotel_id AND h.user_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.ts_staff s
      WHERE s.hotel_id = _hotel_id
        AND s.user_id = _user_id
        AND s.status = 'active'
        AND (
          s.role IN ('owner', 'manager')
          OR s.department_key IS NULL
          OR s.department_key IN ('front_desk', 'duty_manager')
          OR (
            s.department_key = _department_key
            AND (
              -- Not locked: the whole department, exactly as before.
              COALESCE(s.venue_locked, false) = false
              -- Locked: this venue only. A NULL room on the request is a room
              -- request and never matches, which is the isolation we want.
              OR (s.room_id IS NOT NULL AND s.room_id = _room_id)
            )
          )
        )
    );
$$;

-- A user can hold several ts_staff rows: one locked to the Lobby and one
-- covering the department would grant the wider access, which is correct —
-- EXISTS stops at the first row that says yes.

-- Every policy that gates on a request has to move together. Leaving any one
-- of them on the 3-argument call would let a locked member read another
-- venue's work through its events, its reviews or its guest thread.

DROP POLICY IF EXISTS ts_service_requests_access ON public.ts_service_requests;
CREATE POLICY ts_service_requests_access ON public.ts_service_requests
  FOR ALL
  USING (public.ts_can_access_request(hotel_id, department_key, room_id, auth.uid()))
  WITH CHECK (public.ts_can_access_request(hotel_id, department_key, room_id, auth.uid()));

DROP POLICY IF EXISTS ts_request_reviews_access ON public.ts_request_reviews;
CREATE POLICY ts_request_reviews_access ON public.ts_request_reviews
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, r.room_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, r.room_id, auth.uid())
  ));

DROP POLICY IF EXISTS ts_request_events_access ON public.ts_request_events;
CREATE POLICY ts_request_events_access ON public.ts_request_events
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, r.room_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, r.room_id, auth.uid())
  ));

DROP POLICY IF EXISTS ts_request_messages_access ON public.ts_request_messages;
CREATE POLICY ts_request_messages_access ON public.ts_request_messages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, r.room_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, r.room_id, auth.uid())
  ));

-- Pulse is stay feedback, not a venue's work: a department-tagged row keeps
-- following department scope, so a lock does not hide it. Left alone
-- deliberately rather than overlooked.
