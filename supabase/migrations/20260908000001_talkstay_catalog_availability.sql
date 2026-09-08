-- ============================================================================
-- TalkStay — where a menu item is actually offered
-- ADDITIVE on ts_catalog_items.
--
--   The catalogue could already say WHO fulfils an item (department_key) and,
--   for a named venue, WHERE (outlet_room_id). What it could not say is the
--   distinction properties actually run their pricing on: in the ROOM versus
--   out in the PUBLIC areas.
--
--   So every department-wide item — everything added on the Departments page —
--   was offered to every guest everywhere. A pool-bar cocktail list appeared on
--   an in-room guest's menu, and a property charging £10 at the pool bar and
--   £12 on room service had no way to express it: the old unique index allowed
--   exactly one shared row per name per department.
--
--   availability:
--     'everywhere' (default) — rooms and public areas alike. What every
--                              existing row becomes, so nothing changes for
--                              anyone until they deliberately narrow an item.
--     'rooms'                — in-room guests only (room service, minibar).
--     'public'               — public areas only (bar, poolside, restaurant).
--
--   Resolution for one guest, most specific wins, by item name:
--     1. a row pinned to this exact outlet   (outlet_room_id = their room)
--     2. a row scoped to their kind          ('rooms' or 'public')
--     3. an 'everywhere' row
-- ============================================================================

ALTER TABLE public.ts_catalog_items
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'everywhere';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ts_catalog_items_availability_check'
  ) THEN
    ALTER TABLE public.ts_catalog_items
      ADD CONSTRAINT ts_catalog_items_availability_check
      CHECK (availability IN ('everywhere', 'rooms', 'public'));
  END IF;
END $$;

COMMENT ON COLUMN public.ts_catalog_items.availability IS
  'Where guests may order this: everywhere | rooms | public. Narrower than the '
  'department, orthogonal to outlet_room_id (which names one specific venue).';

-- The shared-name index must now include availability, or the same drink can
-- not exist at a room price and a public-areas price at the same time — which
-- is the whole reason this column exists.
DROP INDEX IF EXISTS public.ts_catalog_items_unique_shared_name;

CREATE UNIQUE INDEX IF NOT EXISTS ts_catalog_items_unique_shared_name
  ON public.ts_catalog_items (hotel_id, department_key, availability, lower(name))
  WHERE outlet_room_id IS NULL;

-- Guest menu lookups filter on exactly this shape.
CREATE INDEX IF NOT EXISTS ts_catalog_items_availability_idx
  ON public.ts_catalog_items (hotel_id, is_active, availability, outlet_room_id);
