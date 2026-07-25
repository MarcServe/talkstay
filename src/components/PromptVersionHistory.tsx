import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface Version {
  id: string;
  system_prompt: string | null;
  extra_instructions: string | null;
  edited_by: string | null;
  note: string | null;
  created_at: string;
}

interface Props {
  assistantId: string;
}

export const PromptVersionHistory: React.FC<Props> = ({ assistantId }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Version | null>(null);
  const { toast } = useToast();
  const { canEdit } = useWorkspaceRole(assistantId);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("assistant_prompt_versions")
      .select("id,system_prompt,extra_instructions,edited_by,note,created_at")
      .eq("assistant_id", assistantId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast({ title: "Failed to load versions", description: error.message, variant: "destructive" });
    } else {
      setVersions((data as Version[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (assistantId) load();
  }, [assistantId]);

  const restore = async (v: Version) => {
    const note = v.note || "";
    const restoresExtra = note.includes("extra_instructions");
    const restoresSystem = note.includes("system_prompt") || (!restoresExtra && v.system_prompt !== null);
    const label = restoresExtra && restoresSystem
      ? "system prompt + extra instructions"
      : restoresExtra
        ? "extra instructions"
        : "system prompt";
    if (!confirm(`Restore this ${label}? The current value will be snapshotted automatically.`)) return;

    const payload: Record<string, any> = {};
    if (restoresSystem) payload.system_prompt = v.system_prompt ?? "";
    if (restoresExtra) payload.extra_instructions = v.extra_instructions ?? "";
    if (Object.keys(payload).length === 0) {
      // Fallback: restore whatever is present in the snapshot
      if (v.system_prompt !== null) payload.system_prompt = v.system_prompt ?? "";
      if (v.extra_instructions !== null) payload.extra_instructions = v.extra_instructions ?? "";
    }

    const { error } = await supabase
      .from("assistants")
      .update(payload)
      .eq("id", assistantId);
    if (error) {
      toast({ title: "Restore failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Restored", description: `Previous ${label} is now active.` });
    setPreview(null);
    load();
  };

  const summarize = (v: Version) => {
    if (v.extra_instructions && (v.note || "").includes("extra_instructions")) {
      return v.extra_instructions;
    }
    return v.system_prompt || v.extra_instructions || "(empty)";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Prompt Version History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No previous versions yet. Versions are saved automatically when you edit the system prompt
            or the Extra Instructions field.
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-2 p-3 border rounded-md"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {format(new Date(v.created_at), "PPpp")}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {summarize(v).slice(0, 120)}
                    </div>
                    {v.note && <Badge variant="secondary" className="mt-1">{v.note}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreview(v)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => restore(v)}>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Snapshot from {preview && format(new Date(preview.created_at), "PPpp")}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] space-y-3">
              {preview?.system_prompt ? (
                <div className="mb-3">
                  <div className="text-xs font-semibold mb-1">System Prompt</div>
                  <pre className="text-xs whitespace-pre-wrap font-mono p-3 bg-muted rounded">
                    {preview.system_prompt}
                  </pre>
                </div>
              ) : null}
              {preview?.extra_instructions ? (
                <div>
                  <div className="text-xs font-semibold mb-1">Extra Instructions</div>
                  <pre className="text-xs whitespace-pre-wrap font-mono p-3 bg-muted rounded">
                    {preview.extra_instructions}
                  </pre>
                </div>
              ) : null}
              {!preview?.system_prompt && !preview?.extra_instructions && (
                <pre className="text-xs whitespace-pre-wrap font-mono p-3 bg-muted rounded">(empty)</pre>
              )}
            </ScrollArea>
            {canEdit && preview && (
              <Button onClick={() => restore(preview)} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore this version
              </Button>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PromptVersionHistory;
