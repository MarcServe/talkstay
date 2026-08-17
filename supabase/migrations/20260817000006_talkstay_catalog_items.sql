-- ============================================================================
-- TalkStay — per-department item catalogue (menu / services with prices)
-- ADDITIVE, TalkStay tables only.
--
--   Knowledge holds menus as prose ("Club sandwich £14"), which is fine for the
--   assistant to read aloud but useless for tapping. This is the structured
--   version: staff pick items instead of typing them on a busy service, and the
--   price comes with them so a charge can't be forgotten or mistyped.
--
--   Scoped by department so a bar tablet only ever shows bar items.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ts_catalog_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  department_key text NOT NULL,
  name           text NOT NULL,
  price          numeric,                 -- null = no set price (ask/varies)
  currency       text NOT NULL DEFAULT 'GBP',
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- The picker always asks "this hotel, this department, active, in order".
CREATE INDEX IF NOT EXISTS ts_catalog_items_dept_idx
  ON public.ts_catalog_items (hotel_id, department_key, is_active, sort_order);

-- Same item name twice in one department is a data-entry slip, not a use case.
CREATE UNIQUE INDEX IF NOT EXISTS ts_catalog_items_unique_name
  ON public.ts_catalog_items (hotel_id, department_key, lower(name));

ALTER TABLE public.ts_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ts_catalog_items_access ON public.ts_catalog_items;
CREATE POLICY ts_catalog_items_access ON public.ts_catalog_items
  FOR ALL USING (public.ts_can_access_hotel(hotel_id, auth.uid()))
  WITH CHECK (public.ts_can_access_hotel(hotel_id, auth.uid()));
