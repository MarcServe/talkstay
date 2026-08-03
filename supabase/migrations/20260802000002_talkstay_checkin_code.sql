-- ============================================================================
-- TalkStay — OPTIONAL per-hotel check-in code (airtight anti-sharing).
--
-- Layered on top of stay+device binding. When a hotel turns this on, a brand-new
-- device must enter the current stay's code (read out at reception / printed on
-- the key-card sleeve) before it can connect. This closes the last gap: an
-- ex-guest who wipes their browser storage still can't get in, because they don't
-- know the NEW stay's code. Hotels that don't want the friction leave it off.
-- ADDITIVE, TalkStay tables only.
-- ============================================================================

ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS require_checkin_code boolean NOT NULL DEFAULT false;

ALTER TABLE public.ts_rooms
  ADD COLUMN IF NOT EXISTS checkin_code text;

-- Rebuild the claim function to take an optional code. Kept 2-arg-callable via a
-- DEFAULT so anything still passing (room, device) keeps working.
DROP FUNCTION IF EXISTS public.ts_claim_device(uuid, text);

-- Returns: 'ok' | 'ended' | 'full' | 'need_code' | 'bad_code'.
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
  IF p_device IS NULL OR length(trim(p_device)) = 0 THEN RETURN 'ok'; END IF;

  SELECT stay_id INTO v_bound
  FROM public.ts_stay_devices WHERE room_id = p_room AND device_id = p_device;

  IF v_bound IS NOT NULL THEN
    IF v_bound = v_stay THEN
      UPDATE public.ts_stay_devices SET last_seen_at = now()
        WHERE room_id = p_room AND device_id = p_device;
      RETURN 'ok';                       -- already enrolled this stay
    ELSE
      RETURN 'ended';                     -- device from a previous stay
    END IF;
  END IF;

  -- New device this stay. If the hotel requires a code, enforce it before enrol.
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
