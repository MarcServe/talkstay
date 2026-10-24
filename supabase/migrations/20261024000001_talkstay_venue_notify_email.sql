-- ============================================================================
-- TalkStay — a notification address per venue
--
--   ts_departments.notify_email is one address for a whole department, so the
--   Pool Bar, the Lobby Bar and the Terrace all paged the same inbox — and
--   likewise an indoor and an outdoor kitchen. A venue that runs itself wants
--   its own orders, not every other venue's.
--
--   This is additive and opt-in. A venue with no address of its own behaves
--   exactly as before. The department address keeps receiving everything,
--   which is what makes the common kitchen case work: production is central
--   and sees every order, while each service point is paged only for its own.
--   Venue alerts are a copy to the people on the spot, never a redirect away
--   from the team that owns the department.
--
--   Only meaningful on a public area (is_public = true); a bedroom's requests
--   belong to the department, not to a venue.
-- ============================================================================

ALTER TABLE public.ts_rooms
  ADD COLUMN IF NOT EXISTS notify_email text;

COMMENT ON COLUMN public.ts_rooms.notify_email IS
  'Optional per-venue alert address for a public area (Pool Bar, Lobby Bar). '
  'Alerts for requests from this venue also go here, in addition to the '
  'department address. Ignored for bedrooms.';
