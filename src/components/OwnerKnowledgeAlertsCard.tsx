import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { logWorkspaceAction } from "@/components/WorkspaceAuditLog";

export const OwnerKnowledgeAlertsCard = ({ assistantId }: { assistantId: string }) => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("assistants")
        .select("owner_notify_on_knowledge_update, user_id")
        .eq("id", assistantId)
        .maybeSingle();
      if (data) setEnabled(data.owner_notify_on_knowledge_update !== false);
      setLoading(false);
    })();
  }, [assistantId]);

  const toggle = async (v: boolean) => {
    setEnabled(v);
    const { error } = await (supabase as any)
      .from("assistants")
      .update({ owner_notify_on_knowledge_update: v })
      .eq("id", assistantId);
    if (error) {
      toast.error(error.message);
      setEnabled(!v);
    } else {
      toast.success(v ? "Owner alerts enabled" : "Owner alerts disabled");
      logWorkspaceAction({ assistantId, action: "owner.notify_toggle", metadata: { enabled: v } });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Owner alerts</CardTitle>
        <CardDescription>
          As the assistant owner you receive every knowledge / content change alert by email. Turn this off if your team handles alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <Switch checked={enabled} onCheckedChange={toggle} disabled={loading} />
          {enabled ? "On — owner receives instant alerts" : "Off — owner does not receive alerts"}
        </label>
      </CardContent>
    </Card>
  );
};

export default OwnerKnowledgeAlertsCard;
