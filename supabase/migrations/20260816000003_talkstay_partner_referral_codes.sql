-- ============================================================================
-- TalkStay — partner referral codes in platform settings (public read)
-- ADDITIVE: seed `partners` key + SELECT policy for signup resolution.
-- ============================================================================

INSERT INTO public.ts_platform_settings (key, value) VALUES
  ('partners', jsonb_build_object('codes', '{}'::jsonb))
ON CONFLICT (key) DO NOTHING;

-- Anyone (incl. anon during signup) can read partner codes so CreateHotel
-- can show the partner name and Support routing. Writes stay admin-only.
DROP POLICY IF EXISTS ts_platform_settings_partners_read ON public.ts_platform_settings;
CREATE POLICY ts_platform_settings_partners_read ON public.ts_platform_settings
  FOR SELECT
  USING (key = 'partners');
