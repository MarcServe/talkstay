-- ============================================================================
-- TalkStay — check-in / check-out (stops ex-guests using a saved room link)
--
-- DESIGN: the printed QR encodes a PERMANENT room identity. We never rotate the
-- token on checkout (that would require reprinting every QR). Instead, access is
-- gated on the room being OCCUPIED. Checking out instantly kills every saved
-- link/bookmark from anywhere; checking the next guest in revives the SAME QR.
--
-- Safety net: rooms auto-check-out after N hours of guest inactivity (default 24)
-- so protection holds even if a hotel never touches the dashboard.
-- ADDITIVE, TalkStay tables only.
-- ============================================================================

ALTER TABLE public.ts_rooms
  ADD COLUMN IF NOT EXISTS occupancy_status text NOT NULL DEFAULT 'occupied',
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_guest_activity_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ts_rooms_occupancy_chk') THEN
    ALTER TABLE public.ts_rooms
      ADD CONSTRAINT ts_rooms_occupancy_chk CHECK (occupancy_status IN ('occupied','vacant'));
  END IF;
END $$;

-- Per-hotel inactivity window before a room auto-checks-out.
ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS auto_checkout_hours integer NOT NULL DEFAULT 24;

-- ---------------------------------------------------------------------------
-- Auto check-out: vacate rooms whose guest has been inactive past the window.
-- (Rooms that have never had activity fall back to check-in time.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ts_auto_checkout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.ts_rooms r
  SET occupancy_status = 'vacant',
      checked_out_at = now()
  FROM public.ts_hotels h
  WHERE h.id = r.hotel_id
    AND r.occupancy_status = 'occupied'
    AND COALESCE(r.last_guest_activity_at, r.checked_in_at, r.created_at)
        < now() - make_interval(hours => COALESCE(h.auto_checkout_hours, 24));
END;
$$;

SELECT cron.unschedule('ts-auto-checkout')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ts-auto-checkout');

-- Hourly is plenty for a 24h window.
SELECT cron.schedule('ts-auto-checkout', '7 * * * *', $$SELECT public.ts_auto_checkout();$$);
