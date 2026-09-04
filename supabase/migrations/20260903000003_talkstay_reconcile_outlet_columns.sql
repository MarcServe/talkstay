-- ============================================================================
-- TalkStay — reconcile the two per-outlet menu implementations
--
--   Two branches shipped the same feature under different column names and both
--   migrations were applied to this database:
--
--     20260817000007  ts_catalog_items.room_id         (+ 2 partial unique idx)
--     20260825000001  ts_catalog_items.outlet_room_id  (+ 2 partial unique idx)
--
--   So the table now carries BOTH columns and FOUR overlapping unique indexes.
--   An item written by one code path is invisible to the other, silently.
--
--   outlet_room_id wins: it is what production (main) runs, what the venue
--   model in 20260825000001 builds on via ts_rooms.department_key, and what
--   talkstay-guest-chat on main already reads.
--
--   This migration is idempotent and NON-DESTRUCTIVE: it copies orphaned rows
--   across, removes only the indexes that would now enforce the wrong rule, and
--   leaves room_id in place, deprecated. Dropping the column is a separate,
--   irreversible step to take once this has run clean in production.
-- ============================================================================

-- 1. Carry across anything written through the room_id path.
--    COALESCE keeps outlet_room_id authoritative wherever both are set.
UPDATE public.ts_catalog_items
   SET outlet_room_id = room_id
 WHERE room_id IS NOT NULL
   AND outlet_room_id IS NULL;

-- 2. Drop the room_id-based unique indexes.
--
--    These are not merely redundant — once nothing writes room_id it is NULL on
--    every row, so ts_catalog_items_unique_name_dept (WHERE room_id IS NULL)
--    would start applying to the WHOLE table and enforce one name per
--    department. That is precisely the constraint the per-outlet feature exists
--    to remove: it would block the same drink existing at two outlets at two
--    prices, with a bare "duplicate key" error.
DROP INDEX IF EXISTS public.ts_catalog_items_unique_name_dept;
DROP INDEX IF EXISTS public.ts_catalog_items_unique_name_outlet;

-- The index from 20260817000007 is superseded by ts_catalog_items_outlet_idx
-- as recreated in 20260825000001 over outlet_room_id.
DROP INDEX IF EXISTS public.ts_catalog_items_room_outlet_idx;

-- 3. Guard: the surviving uniqueness rules must exist before we rely on them.
--    Recreated here with IF NOT EXISTS so this migration is safe to run on a
--    database where 20260825000001 has not been applied.
CREATE UNIQUE INDEX IF NOT EXISTS ts_catalog_items_unique_shared_name
  ON public.ts_catalog_items (hotel_id, department_key, lower(name))
  WHERE outlet_room_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ts_catalog_items_unique_outlet_name
  ON public.ts_catalog_items (hotel_id, department_key, outlet_room_id, lower(name))
  WHERE outlet_room_id IS NOT NULL;

COMMENT ON COLUMN public.ts_catalog_items.room_id IS
  'DEPRECATED — superseded by outlet_room_id (reconciled 2026-09-03). Nothing '
  'reads or writes this. Retained only so the backfill can be audited; safe to '
  'drop once verified.';

-- ts_staff.room_id (20260817000008) is NOT touched. It assigns a staff member
-- to an area and never referred to the catalogue, so it has no counterpart on
-- main and nothing to reconcile.
