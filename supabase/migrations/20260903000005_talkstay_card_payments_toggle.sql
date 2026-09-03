-- ============================================================================
-- TalkStay — per-property switch for guest card payments
-- ADDITIVE on ts_hotels.
--
--   Distinct from stripe_charges_enabled, which mirrors what STRIPE says the
--   connected account can do. This is what the PROPERTY wants: somewhere with
--   a POS they already trust, or a house rule that everything settles at the
--   desk, can connect Stripe (or not) and still keep the card button off the
--   guest's screen.
--
--   Defaults true so nothing changes for anyone already live — the option only
--   matters once a property deliberately turns it off.
-- ============================================================================

ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS card_payments_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ts_hotels.card_payments_enabled IS
  'Property''s own choice to offer guests card payment. Card pay requires BOTH '
  'this and stripe_charges_enabled (Stripe''s verdict on the connected account).';
