-- Fix device re-claim when a room is re-let to a new guest on the same phone/browser.
-- Previous behaviour returned 'ended' forever if device_id was bound to an old stay_id.

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
  IF p_device IS NULL OR length(trim(p_device)) = 0 THEN RETURN 'ended'; END IF;
  IF v_stay IS NULL THEN RETURN 'ended'; END IF;

  SELECT stay_id INTO v_bound
    FROM public.ts_stay_devices WHERE room_id = p_room AND device_id = p_device;

  IF v_bound IS NOT NULL THEN
    IF v_bound = v_stay THEN
      UPDATE public.ts_stay_devices SET last_seen_at = now()
        WHERE room_id = p_room AND device_id = p_device;
      RETURN 'ok';
    END IF;

    -- Same phone, NEW stay (checked out then checked back in, or new guest).
    -- Require the current check-in code when the hotel uses codes; otherwise
    -- rotate the binding onto the new stay so the QR works again.
    IF v_require THEN
      IF p_code IS NULL OR length(trim(p_code)) = 0 THEN RETURN 'need_code'; END IF;
      IF v_code IS NULL OR upper(trim(p_code)) <> upper(trim(v_code)) THEN RETURN 'bad_code'; END IF;
    END IF;

    SELECT count(*) INTO v_count
    FROM public.ts_stay_devices WHERE room_id = p_room AND stay_id = v_stay;
    -- Count excludes this device's old-stay row once we update it.
    IF v_count >= v_cap THEN RETURN 'full'; END IF;

    UPDATE public.ts_stay_devices
      SET stay_id = v_stay, last_seen_at = now()
      WHERE room_id = p_room AND device_id = p_device;
    RETURN 'ok';
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
  ON CONFLICT (room_id, device_id) DO UPDATE
    SET stay_id = EXCLUDED.stay_id, last_seen_at = now();
  RETURN 'ok';
END;
$$;
