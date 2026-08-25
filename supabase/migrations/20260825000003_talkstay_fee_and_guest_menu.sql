-- ============================================================================
-- TalkStay — platform application fee + guest menu support bits
-- ADDITIVE
-- ============================================================================

-- Per-property override (basis points). NULL = use platform default from env
-- TALKSTAY_PLATFORM_FEE_BPS (e.g. 250 = 2.5%).
ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS stripe_platform_fee_bps integer;

COMMENT ON COLUMN public.ts_hotels.stripe_platform_fee_bps IS
  'TalkStay application fee in basis points on guest card Checkout. NULL = platform default.';

ALTER TABLE public.ts_stripe_checkouts
  ADD COLUMN IF NOT EXISTS application_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS platform_fee_bps integer;

-- Guest digital menu orders may be scoped to an outlet (Public QR venue).
-- Catalog already has outlet_room_id; no schema change required for browse.
