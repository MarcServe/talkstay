-- Settlement flag for chargeable guest orders (separate from fulfillment status).
-- Front desk can mark paid / unpaid / waived before checkout and see room balances.

ALTER TABLE public.ts_service_requests
  ADD COLUMN IF NOT EXISTS payment_status text;

COMMENT ON COLUMN public.ts_service_requests.payment_status IS
  'Settlement for chargeable requests: unpaid | paid | waived. NULL when not chargeable.';

-- Backfill: chargeable rows without a status start as unpaid.
UPDATE public.ts_service_requests
SET payment_status = 'unpaid'
WHERE is_chargeable = true
  AND payment_status IS NULL;

ALTER TABLE public.ts_service_requests
  DROP CONSTRAINT IF EXISTS ts_service_requests_payment_status_check;

ALTER TABLE public.ts_service_requests
  ADD CONSTRAINT ts_service_requests_payment_status_check
  CHECK (payment_status IS NULL OR payment_status IN ('unpaid', 'paid', 'waived'));

CREATE INDEX IF NOT EXISTS ts_requests_hotel_room_unpaid_idx
  ON public.ts_service_requests (hotel_id, room_id)
  WHERE is_chargeable = true AND payment_status = 'unpaid' AND room_id IS NOT NULL;
