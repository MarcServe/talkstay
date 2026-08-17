-- ============================================================================
-- TalkStay — where the guest is sitting, for public QR areas
-- ADDITIVE, TalkStay tables only.
--
--   A room number tells staff exactly where to go. "Bar Area" does not — the
--   bar has twenty tables. Public-area guests can give a table / sunbed /
--   seat number so an order can actually be delivered to them.
--
--   Free text on purpose: properties number things differently (Table 12,
--   Cabana 3, Pool bed 7, "by the piano"), and a rigid scheme would fit none
--   of them.
-- ============================================================================

ALTER TABLE public.ts_guest_sessions
  ADD COLUMN IF NOT EXISTS guest_locator text;

COMMENT ON COLUMN public.ts_guest_sessions.guest_locator IS
  'Where the guest is within a public QR area (e.g. "Table 12", "Sunbed 4"). Null for private rooms, where the room number already locates them.';
