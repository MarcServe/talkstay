-- ============================================================================
-- TalkStay — assign staff to an area within their department
-- ADDITIVE on ts_staff.
--
--   A resort's bar team may cover a pool bar and a lobby bar with different
--   people on each. Without this, every bar order alerts everyone on the bar.
--
--   room_id NULL = covers the whole department, which is how every existing
--   row behaves — so this changes nothing until someone opts in. Staff are one
--   row per assignment already, so covering two outlets is two rows.
-- ============================================================================

ALTER TABLE public.ts_staff
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.ts_rooms(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.ts_staff.room_id IS
  'Area/outlet this assignment covers (a public QR area). NULL = the whole department.';

-- Alert routing asks "who covers this department, and this area?".
CREATE INDEX IF NOT EXISTS ts_staff_dept_room_idx
  ON public.ts_staff (hotel_id, department_key, room_id, status);
