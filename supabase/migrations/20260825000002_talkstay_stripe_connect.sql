-- ============================================================================
-- TalkStay — Stripe Connect for property guest payments
-- ADDITIVE, TalkStay tables only.
--
--   Each property connects its own Stripe account (Express). Guests pay unpaid
--   chargeable orders via Checkout; webhooks mark ts_service_requests paid.
--   Platform never stores property card numbers — Stripe holds the money path.
-- ============================================================================

ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connected_at timestamptz;

COMMENT ON COLUMN public.ts_hotels.stripe_account_id IS
  'Stripe Connect Express account id (acct_…) for this property.';
COMMENT ON COLUMN public.ts_hotels.stripe_charges_enabled IS
  'True when the connected account can accept charges (from Stripe account.updated).';
COMMENT ON COLUMN public.ts_hotels.stripe_details_submitted IS
  'True after the property finished Stripe onboarding details.';

CREATE UNIQUE INDEX IF NOT EXISTS ts_hotels_stripe_account_uidx
  ON public.ts_hotels (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- Ledger of Checkout sessions so webhooks can settle the right tickets.
CREATE TABLE IF NOT EXISTS public.ts_stripe_checkouts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                  uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  guest_session_id          text,
  room_id                   uuid REFERENCES public.ts_rooms(id) ON DELETE SET NULL,
  stripe_checkout_session_id text NOT NULL,
  stripe_payment_intent_id  text,
  request_ids               uuid[] NOT NULL DEFAULT '{}',
  amount_total              numeric,
  currency                  text NOT NULL DEFAULT 'GBP',
  status                    text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'complete', 'expired')),
  created_at                timestamptz NOT NULL DEFAULT now(),
  completed_at              timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ts_stripe_checkouts_session_uidx
  ON public.ts_stripe_checkouts (stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS ts_stripe_checkouts_hotel_idx
  ON public.ts_stripe_checkouts (hotel_id, created_at DESC);

ALTER TABLE public.ts_stripe_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ts_stripe_checkouts_access ON public.ts_stripe_checkouts;
CREATE POLICY ts_stripe_checkouts_access ON public.ts_stripe_checkouts
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));

-- Optional: which Checkout settled a ticket (audit).
ALTER TABLE public.ts_service_requests
  ADD COLUMN IF NOT EXISTS stripe_checkout_id uuid REFERENCES public.ts_stripe_checkouts(id) ON DELETE SET NULL;
