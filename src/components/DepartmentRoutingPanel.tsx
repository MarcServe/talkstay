import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Department {
  id: string;
  name: string;
  routing_email: string | null;
  routing_phone: string | null;
  routing_whatsapp: string | null;
  is_active: boolean;
}

interface Props {
  assistantId: string;
  bookingRecipients: string[];
  onAddRecipient: (email: string) => void;
}

/**
 * Read-only panel that lists the assistant's departments and lets the owner
 * one-click add a department's routing email into the booking notification recipients.
 * It does NOT change ai-chat behavior — that wiring is a separate, opt-in step.
 */
export function DepartmentRoutingPanel({ assistantId, bookingRecipients, onAddRecipient }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!assistantId) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("assistant_departments")
        .select("id,name,routing_email,routing_phone,routing_whatsapp,is_active")
        .eq("assistant_id", assistantId)
        .order("priority", { ascending: false });
      setDepartments((data as Department[]) || []);
      setLoading(false);
    })();
  }, [assistantId]);

  if (loading) return null;
  if (departments.length === 0) return null;

  const isAdded = (email: string | null) =>
    !!email && bookingRecipients.some((r) => r.toLowerCase() === email.toLowerCase());

  return (
    <Card className="border-l-4 border-l-ai-purple">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-ai-purple" />
          <CardTitle className="text-base">Departments configured</CardTitle>
        </div>
        <CardDescription className="text-xs flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            These departments come from the <strong>Departments</strong> page. Add a department's
            email here to also receive booking notifications. (AI hand-off routing using these
            departments will be enabled in a future update.)
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {departments.map((d) => {
          const added = isAdded(d.routing_email);
          return (
            <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-md p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{d.name}</span>
                  {!d.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {d.routing_email && <span>✉ {d.routing_email}</span>}
                  {d.routing_phone && <span>☎ {d.routing_phone}</span>}
                  {d.routing_whatsapp && <span>WA {d.routing_whatsapp}</span>}
                  {!d.routing_email && !d.routing_phone && !d.routing_whatsapp && (
                    <span className="italic">No contact details set</span>
                  )}
                </div>
              </div>
              {d.routing_email && (
                <Button
                  size="sm"
                  variant={added ? "secondary" : "outline"}
                  disabled={added}
                  onClick={() => {
                    onAddRecipient(d.routing_email!);
                    toast({ title: `Added ${d.routing_email} to booking recipients` });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {added ? "Added" : "Add to booking emails"}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default DepartmentRoutingPanel;
