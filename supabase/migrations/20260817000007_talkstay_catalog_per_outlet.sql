-- ============================================================================
-- TalkStay — per-outlet menus (pool bar vs lobby bar, indoor vs terrace)
-- ADDITIVE on ts_catalog_items.
--
--   A department is WHO fulfils the order; an outlet is WHERE it's served and
--   at what price. One bar team often runs several outlets with different price
--   lists, so splitting them into separate departments would duplicate staff,
--   alert emails and escalation just to vary a menu.
--
--   room_id NULL  = department-wide, offered at every outlet.
--   room_id set   = only that area (public QR areas are ts_rooms rows already).
-- ============================================================================

ALTER TABLE public.ts_catalog_items
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.ts_rooms(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.ts_catalog_items.room_id IS
  'Outlet this item belongs to (a public QR area). NULL = available across the whole department.';

CREATE INDEX IF NOT EXISTS ts_catalog_items_outlet_idx
  ON public.ts_catalog_items (hotel_id, department_key, room_id, is_active, sort_order);

-- The old index made a name unique per department, which now wrongly blocks the
-- same drink existing at two outlets with different prices.
DROP INDEX IF EXISTS ts_catalog_items_unique_name;

-- Two indexes, not one: Postgres treats NULLs as distinct, so a single index
-- including room_id would let the department-wide list gain duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS ts_catalog_items_unique_name_dept
  ON public.ts_catalog_items (hotel_id, department_key, lower(name))
  WHERE room_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ts_catalog_items_unique_name_outlet
  ON public.ts_catalog_items (hotel_id, department_key, room_id, lower(name))
  WHERE room_id IS NOT NULL;
