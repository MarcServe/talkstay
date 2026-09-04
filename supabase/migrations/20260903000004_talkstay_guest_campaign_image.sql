-- ============================================================================
-- TalkStay — optional image on a guest campaign email
-- ADDITIVE on ts_guest_campaigns.
--
--   A hero photo above the message ("weekend spa offer", "new terrace menu")
--   is the difference between a campaign that reads as a real offer and one
--   that reads as a text alert. NULL = no image, exactly today's behaviour.
-- ============================================================================

ALTER TABLE public.ts_guest_campaigns
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.ts_guest_campaigns.image_url IS
  'Optional hero image shown above the message body. Uploaded to the logos storage bucket.';
