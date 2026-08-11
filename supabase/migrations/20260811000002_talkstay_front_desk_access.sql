-- Front Desk and Duty Manager coordinate across teams (notes, chase-ups,
-- forwards). Give them hotel-wide request access like managers, while other
-- department staff stay scoped to their own queue.
CREATE OR REPLACE FUNCTION public.ts_can_access_request(
  _hotel_id uuid,
  _department_key text,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.ts_hotels h
      WHERE h.id = _hotel_id AND h.user_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.ts_staff s
      WHERE s.hotel_id = _hotel_id
        AND s.user_id = _user_id
        AND s.status = 'active'
        AND (
          s.role IN ('owner', 'manager')
          OR s.department_key IS NULL
          OR s.department_key IN ('front_desk', 'duty_manager')
          OR s.department_key = _department_key
        )
    );
$$;
