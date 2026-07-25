-- ============================================================================
-- TalkStay by TalkWeb — Core schema (Phase 1)
-- ============================================================================
-- ADDITIVE ONLY. Every object is prefixed `ts_`. Nothing existing in the shared
-- TalkWeb Supabase project is altered or dropped. Reuses two existing objects:
--   * public.update_updated_at_column()  (trigger fn, already present)
--   * public.is_admin(uuid)              (platform admin check, already present)
-- Guests are UNAUTHENTICATED and never touch these tables directly — the
-- talkstay-* edge functions use the service_role key. RLS therefore only grants
-- authenticated hotel owners/staff (and platform admins) access.
-- ============================================================================

-- (The ts_can_access_hotel() access helper is defined AFTER the tables below,
--  because its SQL body references ts_hotels and ts_staff.)

-- ---------------------------------------------------------------------------
-- ts_hotels — tenant root. Linked 1:1 to an existing `assistants` row so the
-- voice + knowledge-base + RAG stack works per-hotel with zero backend changes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_hotels (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,                       -- owner (auth.users)
  assistant_id      uuid,                                -- FK -> assistants.id (voice + KB)
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  timezone          text NOT NULL DEFAULT 'Europe/London',
  default_language  text NOT NULL DEFAULT 'English',
  branding          jsonb NOT NULL DEFAULT '{}'::jsonb,  -- logo_url, colors, etc.
  whatsapp_number   text,
  whatsapp_enabled  boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ts_hotels_user_idx ON public.ts_hotels (user_id);
CREATE INDEX IF NOT EXISTS ts_hotels_assistant_idx ON public.ts_hotels (assistant_id);

-- ---------------------------------------------------------------------------
-- ts_rooms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_rooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  room_number  text NOT NULL,
  floor        text,
  room_type    text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, room_number)
);
CREATE INDEX IF NOT EXISTS ts_rooms_hotel_idx ON public.ts_rooms (hotel_id);

-- ---------------------------------------------------------------------------
-- ts_room_tokens — secure, revocable, rotatable QR token per room.
-- The QR encodes /h/:slug/r/:roomId?token=<token>. Never a predictable URL.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_room_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  room_id     uuid NOT NULL REFERENCES public.ts_rooms(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE
              DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  is_active   boolean NOT NULL DEFAULT true,
  rotated_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ts_room_tokens_room_idx ON public.ts_room_tokens (room_id);
CREATE INDEX IF NOT EXISTS ts_room_tokens_token_idx ON public.ts_room_tokens (token) WHERE is_active;

-- ---------------------------------------------------------------------------
-- ts_departments — per-hotel department config (8 supported department keys).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_departments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  key           text NOT NULL CHECK (key IN (
                  'housekeeping','laundry','kitchen','bar','maintenance',
                  'concierge','front_desk','duty_manager')),
  display_name  text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, key)
);
CREATE INDEX IF NOT EXISTS ts_departments_hotel_idx ON public.ts_departments (hotel_id);

-- ---------------------------------------------------------------------------
-- ts_routing_rules — optional hotel-customizable intent->department overrides.
-- The AI classifier is the default; these keywords force a department.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_routing_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  department_key text NOT NULL,
  keywords       text[] NOT NULL DEFAULT '{}',
  priority       integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ts_routing_rules_hotel_idx ON public.ts_routing_rules (hotel_id);

-- ---------------------------------------------------------------------------
-- ts_service_requests — the routed operational task.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_service_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  room_id           uuid REFERENCES public.ts_rooms(id) ON DELETE SET NULL,
  department_key    text NOT NULL CHECK (department_key IN (
                      'housekeeping','laundry','kitchen','bar','maintenance',
                      'concierge','front_desk','duty_manager')),
  intent            text,
  summary           text NOT NULL,
  status            text NOT NULL DEFAULT 'new' CHECK (status IN (
                      'new','accepted','in_progress','on_the_way',
                      'completed','guest_confirmed','reopened','escalated','cancelled')),
  priority          text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  is_complaint      boolean NOT NULL DEFAULT false,
  is_chargeable     boolean NOT NULL DEFAULT false,
  price             numeric,
  currency          text DEFAULT 'GBP',
  guest_language    text,
  assigned_staff_id uuid,                       -- auth.users id of claiming staff
  session_id        text,                       -- guest device/session correlation
  conversation      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- transcript snapshot
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ts_requests_hotel_status_idx ON public.ts_service_requests (hotel_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ts_requests_dept_idx ON public.ts_service_requests (hotel_id, department_key, status);
CREATE INDEX IF NOT EXISTS ts_requests_room_idx ON public.ts_service_requests (room_id);
CREATE INDEX IF NOT EXISTS ts_requests_session_idx ON public.ts_service_requests (session_id);

-- ---------------------------------------------------------------------------
-- ts_request_events — status timeline / audit trail.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_request_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES public.ts_service_requests(id) ON DELETE CASCADE,
  status      text NOT NULL,
  actor_type  text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('guest','staff','system')),
  actor_id    uuid,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ts_request_events_req_idx ON public.ts_request_events (request_id, created_at);

-- ---------------------------------------------------------------------------
-- ts_request_reviews — one review per completed request.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_request_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL UNIQUE REFERENCES public.ts_service_requests(id) ON DELETE CASCADE,
  hotel_id    uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ts_request_reviews_hotel_idx ON public.ts_request_reviews (hotel_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- ts_guest_sessions — optional server mirror of a guest device session.
-- Primary history lives in the guest's browser localStorage.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_guest_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  room_id     uuid REFERENCES public.ts_rooms(id) ON DELETE SET NULL,
  session_id  text NOT NULL,
  device_hint text,
  language    text,
  started_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ts_guest_sessions_hotel_idx ON public.ts_guest_sessions (hotel_id);

-- ---------------------------------------------------------------------------
-- ts_staff — department-scoped staff access (NULL department_key = all depts).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ts_staff (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL,
  department_key text,
  role           text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','manager','staff')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','disabled')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, user_id, department_key)
);
CREATE INDEX IF NOT EXISTS ts_staff_hotel_idx ON public.ts_staff (hotel_id);
CREATE INDEX IF NOT EXISTS ts_staff_user_idx ON public.ts_staff (user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse existing public.update_updated_at_column())
-- ---------------------------------------------------------------------------
CREATE TRIGGER ts_hotels_set_updated_at BEFORE UPDATE ON public.ts_hotels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ts_rooms_set_updated_at BEFORE UPDATE ON public.ts_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ts_requests_set_updated_at BEFORE UPDATE ON public.ts_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Access helper (defined now that ts_hotels & ts_staff exist):
-- can this user see/act on this hotel? (owner OR active staff OR platform admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ts_can_access_hotel(_hotel_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.ts_hotels h
            WHERE h.id = _hotel_id AND h.user_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.ts_staff s
            WHERE s.hotel_id = _hotel_id AND s.user_id = _user_id AND s.status = 'active')
    OR public.is_admin(_user_id);
$$;

-- ============================================================================
-- Row Level Security — authenticated hotel members + platform admin only.
-- Edge functions use service_role (bypasses RLS). Guests never query directly.
-- ============================================================================
ALTER TABLE public.ts_hotels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_room_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_departments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_routing_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_request_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_request_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_guest_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_staff           ENABLE ROW LEVEL SECURITY;

-- ts_hotels: owner (or admin) manages; members can view.
CREATE POLICY ts_hotels_owner_all ON public.ts_hotels
  FOR ALL USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY ts_hotels_member_select ON public.ts_hotels
  FOR SELECT USING (public.ts_can_access_hotel(id, auth.uid()));

-- Child tables scoped through ts_can_access_hotel(hotel_id).
CREATE POLICY ts_rooms_access ON public.ts_rooms
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
CREATE POLICY ts_room_tokens_access ON public.ts_room_tokens
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
CREATE POLICY ts_departments_access ON public.ts_departments
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
CREATE POLICY ts_routing_rules_access ON public.ts_routing_rules
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
CREATE POLICY ts_service_requests_access ON public.ts_service_requests
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
CREATE POLICY ts_request_reviews_access ON public.ts_request_reviews
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
CREATE POLICY ts_guest_sessions_access ON public.ts_guest_sessions
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));

-- request_events joins to its request's hotel.
CREATE POLICY ts_request_events_access ON public.ts_request_events
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id AND public.ts_can_access_hotel(r.hotel_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ts_service_requests r
    WHERE r.id = request_id AND public.ts_can_access_hotel(r.hotel_id, auth.uid())
  ));

-- ts_staff: hotel owner/admin manages; a user can see their own membership rows.
CREATE POLICY ts_staff_owner_manage ON public.ts_staff
  FOR ALL USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.ts_hotels h WHERE h.id = hotel_id AND h.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.ts_hotels h WHERE h.id = hotel_id AND h.user_id = auth.uid())
  );
CREATE POLICY ts_staff_self_select ON public.ts_staff
  FOR SELECT USING (user_id = auth.uid());
