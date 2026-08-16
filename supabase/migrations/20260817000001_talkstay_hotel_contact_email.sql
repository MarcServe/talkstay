-- ============================================================================
-- TalkStay — per-property contact email (ops / guest-facing), separate from login
-- ADDITIVE: ts_hotels.contact_email
-- Login remains account-level (auth.users); this is property-level contact only.
-- ============================================================================

ALTER TABLE public.ts_hotels
  ADD COLUMN IF NOT EXISTS contact_email text;

COMMENT ON COLUMN public.ts_hotels.contact_email IS
  'Property contact / ops email (not the owner login). Optional; one owner account can still manage many hotels.';
