-- ============================================================================
-- TalkStay — "Book a live demo" requests from the marketing site
-- ADDITIVE, TalkStay tables only.
--
--   An interested owner leaves their details; the platform admin confirms and
--   sends the meeting link. No calendar integration yet — the confirm step is
--   deliberately manual so this works before any scheduling tool exists.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ts_demo_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  email          text NOT NULL,
  company        text,
  phone          text,
  property_count text,                     -- free text: "1", "2-5", "a group"
  preferred_time text,                     -- what they wrote, not a parsed slot
  message        text,
  status         text NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new','confirmed','declined','done')),
  meeting_url    text,                     -- link actually sent, kept for the record
  confirmed_at   timestamptz,
  handled_by     uuid,                     -- auth.users id of the admin who confirmed
  source         text,                     -- referral code / campaign, when known
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_demo_requests_status_idx
  ON public.ts_demo_requests (status, created_at DESC);

ALTER TABLE public.ts_demo_requests ENABLE ROW LEVEL SECURITY;

-- Platform admins only. The public form submits through the edge function
-- (service role), so no anon INSERT policy exists — that keeps the table from
-- being writable straight from a browser console.
DROP POLICY IF EXISTS ts_demo_requests_admin ON public.ts_demo_requests;
CREATE POLICY ts_demo_requests_admin ON public.ts_demo_requests
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Where the meeting link lives until there's a real scheduling integration.
INSERT INTO public.ts_platform_settings (key, value) VALUES
  ('demo', jsonb_build_object(
    'meeting_url', '',
    'notify_email', ''
  ))
ON CONFLICT (key) DO NOTHING;
