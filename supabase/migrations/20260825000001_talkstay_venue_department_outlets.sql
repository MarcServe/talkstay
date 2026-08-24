-- ============================================================================
-- TalkStay — link Public QR venues to a department ("outlets")
-- ADDITIVE, TalkStay tables only.
--
--   Main restaurant vs outdoor restaurant are separate venue QRs, but they
--   belong under one department (e.g. Restaurant) so staff, alerts, and Log
--   order stay on one team. Menu / catalog rows can then target a specific
--   outlet (venue) or stay shared across the whole department.
-- ============================================================================

ALTER TABLE public.ts_rooms
  ADD COLUMN IF NOT EXISTS department_key text;

COMMENT ON COLUMN public.ts_rooms.department_key IS
  'Optional department this Public QR venue belongs to (e.g. restaurant). Private rooms leave null.';

CREATE INDEX IF NOT EXISTS ts_rooms_hotel_dept_idx
  ON public.ts_rooms (hotel_id, department_key)
  WHERE department_key IS NOT NULL;

ALTER TABLE public.ts_catalog_items
  ADD COLUMN IF NOT EXISTS outlet_room_id uuid REFERENCES public.ts_rooms(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.ts_catalog_items.outlet_room_id IS
  'Optional venue/outlet this menu item belongs to. NULL = shared across the department.';

CREATE INDEX IF NOT EXISTS ts_catalog_items_outlet_idx
  ON public.ts_catalog_items (hotel_id, department_key, outlet_room_id)
  WHERE is_active = true;

-- Same name may exist once per outlet (and once shared). Replace the old
-- department-wide unique name index with two partial uniques.
DROP INDEX IF EXISTS public.ts_catalog_items_unique_name;

-- De-dupe before unique indexes: keep the newest row (prefer one with a price).
-- Duplicate names already exist in some hotels (e.g. "house red" twice under bar).
DELETE FROM public.ts_catalog_items a
USING public.ts_catalog_items b
WHERE a.outlet_room_id IS NULL
  AND b.outlet_room_id IS NULL
  AND a.hotel_id = b.hotel_id
  AND a.department_key = b.department_key
  AND lower(a.name) = lower(b.name)
  AND (
    COALESCE(a.price, -1) < COALESCE(b.price, -1)
    OR (
      COALESCE(a.price, -1) = COALESCE(b.price, -1)
      AND a.created_at < b.created_at
    )
    OR (
      COALESCE(a.price, -1) = COALESCE(b.price, -1)
      AND a.created_at = b.created_at
      AND a.id < b.id
    )
  );

DELETE FROM public.ts_catalog_items a
USING public.ts_catalog_items b
WHERE a.outlet_room_id IS NOT NULL
  AND b.outlet_room_id IS NOT NULL
  AND a.hotel_id = b.hotel_id
  AND a.department_key = b.department_key
  AND a.outlet_room_id = b.outlet_room_id
  AND lower(a.name) = lower(b.name)
  AND (
    COALESCE(a.price, -1) < COALESCE(b.price, -1)
    OR (
      COALESCE(a.price, -1) = COALESCE(b.price, -1)
      AND a.created_at < b.created_at
    )
    OR (
      COALESCE(a.price, -1) = COALESCE(b.price, -1)
      AND a.created_at = b.created_at
      AND a.id < b.id
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS ts_catalog_items_unique_shared_name
  ON public.ts_catalog_items (hotel_id, department_key, lower(name))
  WHERE outlet_room_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ts_catalog_items_unique_outlet_name
  ON public.ts_catalog_items (hotel_id, department_key, outlet_room_id, lower(name))
  WHERE outlet_room_id IS NOT NULL;
