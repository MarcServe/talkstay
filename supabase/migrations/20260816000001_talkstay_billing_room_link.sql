-- Secure charge-to-room from public QR: link a guest session to an occupied
-- private room only after the guest proves the stay with that room's check-in code.
-- Location (lobby/bar/…) stays on the request's room_id; billing stay is separate.

ALTER TABLE public.ts_guest_sessions
  ADD COLUMN IF NOT EXISTS billing_room_id uuid REFERENCES public.ts_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_fail_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_fail_at timestamptz;

COMMENT ON COLUMN public.ts_guest_sessions.billing_room_id IS
  'Occupied private room this public-area session may charge to (set only after check-in code verify).';
COMMENT ON COLUMN public.ts_guest_sessions.billing_verified_at IS
  'When billing_room_id was last verified via check-in code.';
COMMENT ON COLUMN public.ts_guest_sessions.billing_fail_count IS
  'Consecutive failed check-in code attempts for charge-to-room (rate limit).';

CREATE INDEX IF NOT EXISTS ts_guest_sessions_billing_room_idx
  ON public.ts_guest_sessions (billing_room_id)
  WHERE billing_room_id IS NOT NULL;

-- Allow charge_to_room alongside pay_now / at_checkout.
ALTER TABLE public.ts_guest_sessions
  DROP CONSTRAINT IF EXISTS ts_guest_sessions_payment_timing_check;

ALTER TABLE public.ts_guest_sessions
  ADD CONSTRAINT ts_guest_sessions_payment_timing_check
  CHECK (
    payment_timing IS NULL
    OR payment_timing IN ('pay_now', 'at_checkout', 'charge_to_room')
  );
