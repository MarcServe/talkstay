-- ============================================================================
-- TalkStay — guest communications (contacts + occasional campaigns)
-- ADDITIVE
-- Manual campaigns only — no automatic newsletter cron.
-- ============================================================================

-- Property-level marketing unsubscribe (survives across stays/sessions).
CREATE TABLE IF NOT EXISTS public.ts_guest_marketing_unsubscribes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  email           text NOT NULL,
  unsubscribed_at timestamptz NOT NULL DEFAULT now(),
  source          text NOT NULL DEFAULT 'link'
    CHECK (source IN ('link', 'staff', 'bounce')),
  UNIQUE (hotel_id, email)
);

CREATE INDEX IF NOT EXISTS ts_guest_mkt_unsub_hotel_idx
  ON public.ts_guest_marketing_unsubscribes (hotel_id);

COMMENT ON TABLE public.ts_guest_marketing_unsubscribes IS
  'Emails that opted out of hotel marketing / return offers. Operational stay emails may still send.';

ALTER TABLE public.ts_guest_marketing_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ts_guest_mkt_unsub_access ON public.ts_guest_marketing_unsubscribes;
CREATE POLICY ts_guest_mkt_unsub_access ON public.ts_guest_marketing_unsubscribes
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));

-- Campaign log (who sent what).
CREATE TABLE IF NOT EXISTS public.ts_guest_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  subject          text NOT NULL,
  body_text        text NOT NULL,
  cta_label        text,
  cta_url          text,
  recipient_count  integer NOT NULL DEFAULT 0,
  sent_count       integer NOT NULL DEFAULT 0,
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_guest_campaigns_hotel_idx
  ON public.ts_guest_campaigns (hotel_id, created_at DESC);

ALTER TABLE public.ts_guest_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ts_guest_campaigns_access ON public.ts_guest_campaigns;
CREATE POLICY ts_guest_campaigns_access ON public.ts_guest_campaigns
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.ts_guest_campaign_sends (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES public.ts_guest_campaigns(id) ON DELETE CASCADE,
  hotel_id     uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  email        text NOT NULL,
  status       text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'skipped', 'failed')),
  error        text,
  sent_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_guest_campaign_sends_campaign_idx
  ON public.ts_guest_campaign_sends (campaign_id);
CREATE INDEX IF NOT EXISTS ts_guest_campaign_sends_hotel_email_idx
  ON public.ts_guest_campaign_sends (hotel_id, email);

ALTER TABLE public.ts_guest_campaign_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ts_guest_campaign_sends_access ON public.ts_guest_campaign_sends;
CREATE POLICY ts_guest_campaign_sends_access ON public.ts_guest_campaign_sends
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
