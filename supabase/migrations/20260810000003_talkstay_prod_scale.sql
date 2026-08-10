-- TalkStay — production scale indexes + device-binding hardening.
-- ADDITIVE. TalkStay tables only.

-- Guest chat / voice always filter hotel + session together.
CREATE INDEX IF NOT EXISTS ts_requests_hotel_session_idx
  ON public.ts_service_requests (hotel_id, session_id, created_at DESC);

-- Pulse rate-limit + "already answered" checks.
CREATE INDEX IF NOT EXISTS ts_guest_pulse_session_idx
  ON public.ts_guest_pulse (hotel_id, session_id);

-- Open-queue scans (ops dashboard).
CREATE INDEX IF NOT EXISTS ts_requests_hotel_status_created_idx
  ON public.ts_service_requests (hotel_id, status, created_at DESC);

-- Require a device id for stay binding. Omitting it previously returned 'ok',
-- which let an ex-guest with a printed QR skip enrolment after checkout.
CREATE OR REPLACE FUNCTION public.ts_claim_device(p_room uuid, p_device text, p_code text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_stay uuid;
  v_hotel uuid;
  v_cap integer;
  v_require boolean;
  v_code text;
  v_bound uuid;
  v_count integer;
BEGIN
  SELECT r.occupancy_status, r.current_stay_id, r.hotel_id, r.checkin_code,
         COALESCE(h.max_devices_per_room, 8), COALESCE(h.require_checkin_code, false)
    INTO v_status, v_stay, v_hotel, v_code, v_cap, v_require
  FROM public.ts_rooms r JOIN public.ts_hotels h ON h.id = r.hotel_id
  WHERE r.id = p_room;

  IF v_status IS NULL THEN RETURN 'ended'; END IF;
  IF v_status = 'vacant' THEN RETURN 'ended'; END IF;
  -- No anonymous bypass — every guest action must carry a stable device id.
  IF p_device IS NULL OR length(trim(p_device)) = 0 THEN RETURN 'ended'; END IF;

  SELECT stay_id INTO v_bound
    FROM public.ts_stay_devices WHERE room_id = p_room AND device_id = p_device;

  IF v_bound IS NOT NULL THEN
    IF v_bound = v_stay THEN
      UPDATE public.ts_stay_devices SET last_seen_at = now()
        WHERE room_id = p_room AND device_id = p_device;
      RETURN 'ok';
    ELSE
      RETURN 'ended';
    END IF;
  END IF;

  IF v_require THEN
    IF p_code IS NULL OR length(trim(p_code)) = 0 THEN RETURN 'need_code'; END IF;
    IF v_code IS NULL OR upper(trim(p_code)) <> upper(trim(v_code)) THEN RETURN 'bad_code'; END IF;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.ts_stay_devices WHERE room_id = p_room AND stay_id = v_stay;
  IF v_count >= v_cap THEN RETURN 'full'; END IF;

  INSERT INTO public.ts_stay_devices (room_id, stay_id, device_id)
  VALUES (p_room, v_stay, p_device)
  ON CONFLICT (room_id, device_id) DO UPDATE SET last_seen_at = now();
  RETURN 'ok';
END;
$$;

-- Department-scoped staff must not read/update other teams' requests via the
-- API. Owners, managers, platform admins, and staff with NULL department keep
-- hotel-wide access (matches dashboard lockedDepartment behaviour).
CREATE OR REPLACE FUNCTION public.ts_can_access_request(
  _hotel_id uuid,
  _department_key text,
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
          OR s.department_key = _department_key
        )
    );
$$;

DROP POLICY IF EXISTS ts_service_requests_access ON public.ts_service_requests;
CREATE POLICY ts_service_requests_access ON public.ts_service_requests
  FOR ALL
  USING (public.ts_can_access_request(hotel_id, department_key, auth.uid()))
  WITH CHECK (public.ts_can_access_request(hotel_id, department_key, auth.uid()));

DROP POLICY IF EXISTS ts_request_reviews_access ON public.ts_request_reviews;
CREATE POLICY ts_request_reviews_access ON public.ts_request_reviews
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, auth.uid())
  ));

DROP POLICY IF EXISTS ts_request_events_access ON public.ts_request_events;
CREATE POLICY ts_request_events_access ON public.ts_request_events
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, auth.uid())
  ));

-- Messages are hotel-scoped today; tighten to the parent request's department.
DROP POLICY IF EXISTS ts_request_messages_access ON public.ts_request_messages;
CREATE POLICY ts_request_messages_access ON public.ts_request_messages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id
      AND public.ts_can_access_request(r.hotel_id, r.department_key, auth.uid())
  ));

-- Pulse rows may be department-null (general stay feedback) — those stay
-- hotel-visible; department-tagged ones follow the same staff scope.
DROP POLICY IF EXISTS ts_guest_pulse_access ON public.ts_guest_pulse;
CREATE POLICY ts_guest_pulse_access ON public.ts_guest_pulse
  FOR ALL
  USING (
    (department_key IS NULL AND public.ts_can_access_hotel(hotel_id, auth.uid()))
    OR public.ts_can_access_request(hotel_id, department_key, auth.uid())
  )
  WITH CHECK (
    (department_key IS NULL AND public.ts_can_access_hotel(hotel_id, auth.uid()))
    OR public.ts_can_access_request(hotel_id, department_key, auth.uid())
  );
