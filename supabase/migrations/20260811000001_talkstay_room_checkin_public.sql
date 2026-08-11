-- Per-room check-in code override + public QR areas (lobby / bar / shared spaces).
--
-- ts_rooms.require_checkin_code:
--   NULL  = inherit hotel default (ts_hotels.require_checkin_code)
--   true  = always require a code for this unit
--   false = never require a code for this unit
--
-- ts_rooms.is_public:
--   true  = shared/public QR (lobby, restaurant, spa). Always reachable (even if
--           marked vacant) and never asks for a check-in code — safe to paste
--           where guests/visitors can scan freely.

ALTER TABLE public.ts_rooms
  ADD COLUMN IF NOT EXISTS require_checkin_code boolean,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ts_rooms.require_checkin_code IS
  'NULL=inherit hotel default; true=always require; false=never require (e.g. public QR).';
COMMENT ON COLUMN public.ts_rooms.is_public IS
  'Public/shared QR area — no check-in code, accessible without an occupied stay.';

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
  v_public boolean;
  v_room_req boolean;
  v_hotel_req boolean;
BEGIN
  SELECT r.occupancy_status, r.current_stay_id, r.hotel_id, r.checkin_code,
         COALESCE(h.max_devices_per_room, 8),
         COALESCE(r.is_public, false),
         r.require_checkin_code,
         COALESCE(h.require_checkin_code, false)
    INTO v_status, v_stay, v_hotel, v_code, v_cap, v_public, v_room_req, v_hotel_req
  FROM public.ts_rooms r JOIN public.ts_hotels h ON h.id = r.hotel_id
  WHERE r.id = p_room;

  IF v_status IS NULL THEN RETURN 'ended'; END IF;
  -- Public QR areas stay reachable even when marked vacant.
  IF v_status = 'vacant' AND NOT v_public THEN RETURN 'ended'; END IF;
  IF p_device IS NULL OR length(trim(p_device)) = 0 THEN RETURN 'ended'; END IF;

  -- Ensure a stay id exists for public vacant units so device binding still works.
  IF v_stay IS NULL THEN
    IF v_public THEN
      v_stay := gen_random_uuid();
      UPDATE public.ts_rooms
        SET current_stay_id = v_stay,
            checked_in_at = COALESCE(checked_in_at, now())
        WHERE id = p_room;
    ELSE
      RETURN 'ended';
    END IF;
  END IF;

  -- Effective code policy: public never requires; else room override or hotel default.
  v_require := CASE
    WHEN v_public THEN false
    WHEN v_room_req IS NOT NULL THEN v_room_req
    ELSE v_hotel_req
  END;

  SELECT stay_id INTO v_bound
    FROM public.ts_stay_devices WHERE room_id = p_room AND device_id = p_device;

  IF v_bound IS NOT NULL THEN
    IF v_bound = v_stay THEN
      UPDATE public.ts_stay_devices SET last_seen_at = now()
        WHERE room_id = p_room AND device_id = p_device;
      RETURN 'ok';
    END IF;

    -- Same phone, NEW stay.
    IF v_require THEN
      IF p_code IS NULL OR length(trim(p_code)) = 0 THEN RETURN 'need_code'; END IF;
      IF v_code IS NULL OR upper(trim(p_code)) <> upper(trim(v_code)) THEN RETURN 'bad_code'; END IF;
    END IF;

    SELECT count(*) INTO v_count
    FROM public.ts_stay_devices WHERE room_id = p_room AND stay_id = v_stay;
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
