import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Hotel } from "@/talkstay/lib/hotels";

interface Dept {
  id: string;
  key: string;
  display_name: string;
  is_active: boolean;
  notify_email: string | null;
  escalate_after_minutes: number;
}

export default function DepartmentsPanel({ hotel }: { hotel: Hotel }) {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ts_departments")
      .select("id, key, display_name, is_active, notify_email, escalate_after_minutes")
      .eq("hotel_id", hotel.id)
      .order("display_name");
    if (error) toast.error(error.message);
    setDepts((data as Dept[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [hotel.id]);

  const patch = (id: string, p: Partial<Dept>) =>
    setDepts((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const save = async (d: Dept, p: Partial<Dept>) => {
    patch(d.id, p);
    const { error } = await supabase.from("ts_departments").update(p).eq("id", d.id);
    if (error) { toast.error(error.message); refresh(); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Requests are auto-routed to these teams. Add an alert email and an escalation time for each.
      </p>
      <div className="divide-y rounded-xl border">
        {depts.map((d) => (
          <div key={d.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex items-center gap-3">
              <Switch checked={d.is_active} onCheckedChange={(v) => save(d, { is_active: v })} />
              <span className="font-medium">{d.display_name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                defaultValue={d.notify_email ?? ""}
                placeholder="alert email (optional)"
                className="h-8 w-56"
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== (d.notify_email ?? null)) save(d, { notify_email: v });
                }}
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>escalate after</span>
                <Input
                  type="number" min={1}
                  defaultValue={d.escalate_after_minutes}
                  className="h-8 w-16"
                  onBlur={(e) => {
                    const n = Math.max(1, parseInt(e.target.value || "5", 10));
                    if (n !== d.escalate_after_minutes) save(d, { escalate_after_minutes: n });
                  }}
                />
                <span>min</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        No email set? Alerts fall back to the hotel owner. Complaints always also notify the owner.
      </p>
    </div>
  );
}
