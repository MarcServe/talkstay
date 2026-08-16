-- ============================================================================
-- TalkStay — partner referral codes + default commission in platform settings
-- ADDITIVE: seed `partners` key; public SELECT so signup can resolve partner names.
-- ============================================================================

INSERT INTO public.ts_platform_settings (key, value) VALUES
  ('partners', jsonb_build_object(
    'default_commission_pct', 20,
    'codes', '{}'::jsonb
  ))
ON CONFLICT (key) DO NOTHING;

-- Anyone can read partner codes (signup / Support routing). Writes stay admin-only.
DROP POLICY IF EXISTS ts_platform_settings_partners_read ON public.ts_platform_settings;
CREATE POLICY ts_platform_settings_partners_read ON public.ts_platform_settings
  FOR SELECT
  USING (key = 'partners');
