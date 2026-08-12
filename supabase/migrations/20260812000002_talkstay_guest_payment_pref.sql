-- Guest stay payment timing preference (cash collection vs checkout).
-- No card processors — staff collect in person when the guest asks to pay now.

ALTER TABLE public.ts_guest_sessions
  ADD COLUMN IF NOT EXISTS payment_timing text;

COMMENT ON COLUMN public.ts_guest_sessions.payment_timing IS
  'Guest preference for unpaid chargeables: pay_now | at_checkout. NULL = unset.';

ALTER TABLE public.ts_guest_sessions
  DROP CONSTRAINT IF EXISTS ts_guest_sessions_payment_timing_check;

ALTER TABLE public.ts_guest_sessions
  ADD CONSTRAINT ts_guest_sessions_payment_timing_check
  CHECK (payment_timing IS NULL OR payment_timing IN ('pay_now', 'at_checkout'));
