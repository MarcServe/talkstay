-- ============================================================================
-- TalkStay — the property's own guest-facing currency
-- ADDITIVE on ts_hotels.
--
--   Does NOT already exist on this table — an earlier pass misread a
--   currency column on ts_service_requests (per-request, defaults 'GBP') as
--   if it were on ts_hotels and built a Branding picker + guest-chat display
--   logic against a column that was never actually here. This is that
--   column, for real this time.
--
--   Display-only: a property with Stripe connected still settles in
--   whatever currency their connected account uses, fixed at Connect
--   onboarding — this cannot and does not change that.
-- ============================================================================

ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP';

COMMENT ON COLUMN public.ts_hotels.currency IS
  'Guest-facing display currency (ISO 4217, e.g. GBP/EUR/USD). Shown on '
  'menus, folios and chargeable requests. Does not change what a connected '
  'Stripe account actually settles in — that is fixed at Connect onboarding.';
