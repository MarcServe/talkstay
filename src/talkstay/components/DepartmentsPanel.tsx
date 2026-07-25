import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Hotel } from "@/talkstay/lib/hotels";

interface Dept {
  id: string;
  key: string;
  display_name: string;
  is_active: boolean;
}

export default function DepartmentsPanel({ hotel }: { hotel: Hotel }) {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ts_departments")
      .select("id, key, display_name, is_active")
      .eq("hotel_id", hotel.id)
      .order("display_name");
    if (error) toast.error(error.message);
    setDepts((data as Dept[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [hotel.id]);

  const toggle = async (d: Dept, active: boolean) => {
    setDepts((prev) => prev.map((x) => (x.id === d.id ? { ...x, is_active: active } : x)));
    const { error } = await supabase.from("ts_departments").update({ is_active: active }).eq("id", d.id);
    if (error) { toast.error(error.message); refresh(); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-1">
      <p className="mb-4 text-sm text-muted-foreground">
        Requests are auto-routed to these teams. Turn off any your property doesn't use.
      </p>
      <div className="divide-y rounded-xl border">
        {depts.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium">{d.display_name}</span>
            <Switch checked={d.is_active} onCheckedChange={(v) => toggle(d, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
