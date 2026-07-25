import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlaskConical, Send, RotateCcw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logWorkspaceAction } from "@/components/WorkspaceAuditLog";

interface Props {
  assistantId: string;
  liveExtraInstructions: string;
  draftExtraInstructions: string | null;
  draftUpdatedAt: string | null;
  previewSlug?: string | null;
  onPublished: () => void;
  onDiscarded: () => void;
}

export const DraftPromptControls: React.FC<Props> = ({
  assistantId,
  liveExtraInstructions,
  draftExtraInstructions,
  draftUpdatedAt,
  previewSlug,
  onPublished,
  onDiscarded,
}) => {
  const [busy, setBusy] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const hasDraft = draftExtraInstructions !== null && draftExtraInstructions !== undefined;

  if (!hasDraft) return null;

  const handlePublish = async () => {
    if (!confirm("Publish this draft? All visitors will immediately start using the new instructions.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("publish_assistant_draft" as any, { p_assistant_id: assistantId });
    setBusy(false);
    if (error) {
      toast.error("Failed to publish draft: " + error.message);
      return;
    }
    toast.success("Draft published — now live for all visitors.");
    logWorkspaceAction({ assistantId, action: "prompt.draft_publish", metadata: {} });
    onPublished();
  };

  const handleDiscard = async () => {
    if (!confirm("Discard this draft? Your unpublished changes will be lost.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("discard_assistant_draft" as any, { p_assistant_id: assistantId });
    setBusy(false);
    if (error) {
      toast.error("Failed to discard draft: " + error.message);
      return;
    }
    toast.success("Draft discarded.");
    logWorkspaceAction({ assistantId, action: "prompt.draft_discard", metadata: {} });
    onDiscarded();
  };

  const handleTest = () => {
    // Always use the UUID — /preview/:assistantId is wired to a UUID lookup,
    // not the preview_slug (which only resolves via /a/:slug).
    window.open(`/preview/${assistantId}?draft=1&mode=widget-only`, "_blank", "noopener,noreferrer");
    logWorkspaceAction({ assistantId, action: "prompt.draft_test", metadata: {} });
  };

  return (
    <>
      <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-sm">Unpublished draft</span>
              <Badge variant="secondary" className="text-[10px]">
                Not live yet
              </Badge>
              {draftUpdatedAt && (
                <span className="text-[11px] text-muted-foreground">
                  saved {new Date(draftUpdatedAt).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Your edits to Extra Instructions are saved as a draft. Visitors are still seeing the previous live version.
              Test the draft privately, then publish when you're happy.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleTest} disabled={busy}>
                <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                Test draft
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDiff(true)} disabled={busy}>
                Compare with live
              </Button>
              <Button size="sm" onClick={handlePublish} disabled={busy}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {busy ? "Working…" : "Publish"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={busy}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Discard
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={showDiff} onOpenChange={setShowDiff}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Draft vs Live: Extra Instructions</DialogTitle>
            <DialogDescription>
              Left = what your visitors see now. Right = what they will see after you publish.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold mb-1 text-muted-foreground">LIVE (current)</div>
              <ScrollArea className="h-[50vh] border rounded p-3 bg-muted/50">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {liveExtraInstructions || "(empty)"}
                </pre>
              </ScrollArea>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1 text-amber-600">DRAFT (unpublished)</div>
              <ScrollArea className="h-[50vh] border border-amber-500/50 rounded p-3 bg-amber-50/30 dark:bg-amber-950/20">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {draftExtraInstructions || "(empty)"}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DraftPromptControls;
