-- ============================================================================
-- TalkStay — close the check-out re-use hole by binding access to a STAY + DEVICE
--
-- Problem: occupancy gating alone means that after a room is re-checked-in, a
-- PREVIOUS guest who refreshes their saved link would regain access (same printed
-- QR/token). Fix: every check-in mints a fresh `current_stay_id`, and each guest
-- DEVICE is bound to the stay it first connected on. A device from an earlier
-- stay is treated as "checked out"; brand-new devices auto-enrol up to a per-hotel
-- cap (supports families/multiple phones) but a public link-share can't flood it.
-- ADDITIVE, TalkStay tables only.
-- ============================================================================

ALTER TABLE public.ts_rooms
  ADD COLUMN IF NOT EXISTS current_stay_id uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS max_devices_per_room integer NOT NULL DEFAULT 8;

CREATE TABLE IF NOT EXISTS public.ts_stay_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.ts_rooms(id) ON DELETE CASCADE,
  stay_id uuid NOT NULL,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, device_id)
);
CREATE INDEX IF NOT EXISTS ts_stay_devices_stay_idx ON public.ts_stay_devices (room_id, stay_id);

ALTER TABLE public.ts_stay_devices ENABLE ROW LEVEL SECURITY;
-- Only edge functions (service role) touch this; no direct client access.

-- Atomic access decision for a guest device.
-- Returns: 'ok' | 'ended' (vacant OR a device from a previous stay) | 'full'.
-- A missing device id returns 'ok' (occupancy is still enforced by the caller)
-- so older clients keep working.
CREATE OR REPLACE FUNCTION public.ts_claim_device(p_room uuid, p_device text)
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
  v_bound uuid;
  v_count integer;
BEGIN
  SELECT occupancy_status, current_stay_id, hotel_id
    INTO v_status, v_stay, v_hotel
  FROM public.ts_rooms WHERE id = p_room;

  IF v_status IS NULL THEN RETURN 'ended'; END IF;
  IF v_status = 'vacant' THEN RETURN 'ended'; END IF;
  IF p_device IS NULL OR length(trim(p_device)) = 0 THEN RETURN 'ok'; END IF;

  SELECT stay_id INTO v_bound
  FROM public.ts_stay_devices WHERE room_id = p_room AND device_id = p_device;

  IF v_bound IS NOT NULL THEN
    IF v_bound = v_stay THEN
      UPDATE public.ts_stay_devices SET last_seen_at = now()
        WHERE room_id = p_room AND device_id = p_device;
      RETURN 'ok';
    ELSE
      -- Device belonged to an earlier stay of this room → previous guest.
      RETURN 'ended';
    END IF;
  END IF;

  -- New device this stay → enrol if under the hotel's cap.
  SELECT COALESCE(max_devices_per_room, 8) INTO v_cap FROM public.ts_hotels WHERE id = v_hotel;
  SELECT count(*) INTO v_count
  FROM public.ts_stay_devices WHERE room_id = p_room AND stay_id = v_stay;
  IF v_count >= COALESCE(v_cap, 8) THEN RETURN 'full'; END IF;

  INSERT INTO public.ts_stay_devices (room_id, stay_id, device_id)
  VALUES (p_room, v_stay, p_device)
  ON CONFLICT (room_id, device_id) DO UPDATE SET last_seen_at = now();
  RETURN 'ok';
END;
$$;
