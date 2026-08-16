-- ============================================================================
-- TalkStay — guest first name on notify opt-in + hotel referral code
-- ADDITIVE, TalkStay tables only.
-- ============================================================================

ALTER TABLE public.ts_guest_sessions
  ADD COLUMN IF NOT EXISTS guest_first_name text;

COMMENT ON COLUMN public.ts_guest_sessions.guest_first_name IS
  'Optional first name collected when the guest opts into request updates.';

ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS referral_code text;

COMMENT ON COLUMN public.ts_hotels.referral_code IS
  'Marketing partner / referral code captured at property create (e.g. from ?ref=).';
