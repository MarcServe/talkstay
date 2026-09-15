-- ============================================================================
-- TalkStay — "we're out of that tonight"
-- ADDITIVE on ts_catalog_items.
--
--   is_active already existed, but it means "this item is not on our menu" —
--   switching it off removes the row from the guest's list entirely and the
--   assistant then has no idea the thing was ever offered. That is right for
--   a dish you stopped serving; it is wrong for a dish you are out of until
--   the delivery lands at six.
--
--   The difference matters to a guest. "We don't do that" and "the kitchen is
--   out of salmon until 6pm, can I get you something else" are different
--   answers, and only the second one keeps the order.
--
--   is_available  — false while the item is off. The row stays on the menu,
--                   marked, and the assistant can say so out loud.
--   available_at  — optional, when it comes back. Read as "unavailable UNTIL
--                   this moment": once it passes, the item serves itself
--                   again with nobody having to remember to switch it back.
--                   Null means off indefinitely.
--
--   Only meaningful while is_available is false; on an available item it is
--   ignored, so flipping the toggle back on never has to clear it.
-- ============================================================================

ALTER TABLE public.ts_catalog_items
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

ALTER TABLE public.ts_catalog_items
  ADD COLUMN IF NOT EXISTS available_at timestamptz;

COMMENT ON COLUMN public.ts_catalog_items.is_available IS
  'False while the item is temporarily off. Distinct from is_active: the row '
  'stays on the guest menu, marked unavailable, so the assistant can say so '
  'rather than pretend it was never offered.';

COMMENT ON COLUMN public.ts_catalog_items.available_at IS
  'Optional moment an unavailable item returns — "off until 18:00". Once it '
  'passes, readers treat the item as available again without the property '
  'having to switch it back. Null = off indefinitely. Ignored when '
  'is_available is true.';
