-- Channel / bookkeeping source for each service request.
-- Lets staff log phone/walk-in orders alongside guest-assistant requests so
-- managers have one record, and the room assistant can warn on duplicates.

ALTER TABLE public.ts_service_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'guest_chat';

COMMENT ON COLUMN public.ts_service_requests.source IS
  'How the request entered the system: guest_chat | phone | walk_in | front_desk | repeat | pulse';

CREATE INDEX IF NOT EXISTS ts_requests_hotel_room_open_idx
  ON public.ts_service_requests (hotel_id, room_id, status)
  WHERE room_id IS NOT NULL;
