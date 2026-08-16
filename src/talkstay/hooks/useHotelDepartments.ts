import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";
import { useDemo } from "@/talkstay/demo/DemoContext";

export type HotelDeptOption = { key: string; display_name: string };

/** Active hotel departments (custom + defaults), with built-in fallback. */
export function useHotelDepartments(hotelId: string | undefined) {
  const demo = useDemo();
  const [rows, setRows] = useState<HotelDeptOption[]>([]);

  useEffect(() => {
    if (!hotelId) {
      setRows(DEPARTMENTS.map((d) => ({ key: d.key, display_name: d.display_name })));
      return;
    }
    if (demo) {
      const active = (demo.state.departments ?? [])
        .filter((d) => d.is_active)
        .map((d) => ({ key: d.key, display_name: d.display_name }));
      setRows(active.length ? active : DEPARTMENTS.map((d) => ({ key: d.key, display_name: d.display_name })));
      return;
    }
    let cancelled = false;
    void supabase
      .from("ts_departments")
      .select("key, display_name, is_active")
      .eq("hotel_id", hotelId)
      .order("display_name")
      .then(({ data }) => {
        if (cancelled) return;
        const active = ((data ?? []) as { key: string; display_name: string; is_active: boolean }[])
          .filter((d) => d.is_active)
          .map((d) => ({ key: d.key, display_name: d.display_name || d.key }));
        setRows(active.length ? active : DEPARTMENTS.map((d) => ({ key: d.key, display_name: d.display_name })));
      });
    return () => { cancelled = true; };
  }, [hotelId, demo, demo?.version, demo?.state.departments]);

  const labelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of DEPARTMENTS) m.set(d.key, d.display_name);
    for (const d of rows) m.set(d.key, d.display_name);
    return m;
  }, [rows]);

  const deptLabel = (key: string | null | undefined) => {
    if (!key) return "All departments";
    return labelMap.get(key) ?? key.replace(/_/g, " ");
  };

  return { departments: rows, deptLabel };
}
