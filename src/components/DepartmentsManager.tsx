import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logWorkspaceAction } from "@/components/WorkspaceAuditLog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Plus, Building2, Save, X } from "lucide-react";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";

interface Department {
  id: string;
  assistant_id: string;
  name: string;
  description: string | null;
  keywords: string[];
  routing_email: string | null;
  routing_phone: string | null;
  routing_whatsapp: string | null;
  handoff_message: string | null;
  priority: number;
  is_active: boolean;
}

interface Props {
  assistantId: string;
}

const empty = (assistantId: string): Partial<Department> => ({
  assistant_id: assistantId,
  name: "",
  description: "",
  keywords: [],
  routing_email: "",
  routing_phone: "",
  routing_whatsapp: "",
  handoff_message: "",
  priority: 0,
  is_active: true,
});

export function DepartmentsManager({ assistantId }: Props) {
  const { toast } = useToast();
  const { canEdit, loading: roleLoading } = useWorkspaceRole(assistantId);
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<Department> | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!assistantId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantId]);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("assistant_departments")
      .select("*")
      .eq("assistant_id", assistantId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Failed to load departments", description: error.message, variant: "destructive" });
    } else {
      setItems((data as Department[]) || []);
    }
    setLoading(false);
  }

  function startNew() {
    setDraft(empty(assistantId));
    setKeywordInput("");
  }

  function startEdit(d: Department) {
    setDraft({ ...d });
    setKeywordInput("");
  }

  function addKeyword() {
    const k = keywordInput.trim();
    if (!k || !draft) return;
    const next = Array.from(new Set([...(draft.keywords || []), k]));
    setDraft({ ...draft, keywords: next });
    setKeywordInput("");
  }

  function removeKeyword(k: string) {
    if (!draft) return;
    setDraft({ ...draft, keywords: (draft.keywords || []).filter((x) => x !== k) });
  }

  async function save() {
    if (!draft || !draft.name?.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      assistant_id: assistantId,
      name: draft.name!.trim(),
      description: draft.description || null,
      keywords: draft.keywords || [],
      routing_email: draft.routing_email || null,
      routing_phone: draft.routing_phone || null,
      routing_whatsapp: draft.routing_whatsapp || null,
      handoff_message: draft.handoff_message || null,
      priority: Number(draft.priority) || 0,
      is_active: !!draft.is_active,
    };
    let error;
    if ((draft as Department).id) {
      ({ error } = await (supabase as any)
        .from("assistant_departments")
        .update(payload)
        .eq("id", (draft as Department).id));
    } else {
      ({ error } = await (supabase as any).from("assistant_departments").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    logWorkspaceAction({
      assistantId,
      action: (draft as Department).id ? "department.update" : "department.create",
      targetType: "department",
      targetId: (draft as Department).id,
      metadata: { name: payload.name },
    });
    toast({ title: "Department saved" });
    setDraft(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this department?")) return;
    const { error } = await (supabase as any).from("assistant_departments").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    logWorkspaceAction({ assistantId, action: "department.delete", targetType: "department", targetId: id });
    toast({ title: "Department deleted" });
    load();
  }

  if (roleLoading || loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading departments…</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Departments & Routing
            </CardTitle>
            <CardDescription>
              Define teams (e.g. Sales, Support, Billing) with keywords and contact details. Used to route inquiries to the right humans.
            </CardDescription>
          </div>
          {canEdit && !draft && (
            <Button onClick={startNew} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New department
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 && !draft && (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No departments yet. {canEdit && "Create one to start routing."}
            </div>
          )}
          <div className="space-y-3">
            {items.map((d) => (
              <div key={d.id} className="border rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{d.name}</span>
                      {!d.is_active && <Badge variant="secondary">Inactive</Badge>}
                      {d.priority !== 0 && <Badge variant="outline">Priority {d.priority}</Badge>}
                    </div>
                    {d.description && (
                      <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                    )}
                    {d.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {d.keywords.map((k) => (
                          <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {d.routing_email && <span>✉ {d.routing_email}</span>}
                      {d.routing_phone && <span>☎ {d.routing_phone}</span>}
                      {d.routing_whatsapp && <span>WA {d.routing_whatsapp}</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => startEdit(d)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {(draft as Department).id ? "Edit department" : "New department"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={draft.name || ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Sales, Support, Billing…"
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={draft.priority ?? 0}
                  onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={draft.description || ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What this team handles"
                rows={2}
              />
            </div>

            <div>
              <Label>Keywords (trigger words for routing)</Label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="e.g. invoice, refund, pricing"
                />
                <Button type="button" variant="outline" onClick={addKeyword}>Add</Button>
              </div>
              {draft.keywords && draft.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {draft.keywords.map((k) => (
                    <Badge key={k} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(k)}>
                      {k} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Routing email</Label>
                <Input
                  type="email"
                  value={draft.routing_email || ""}
                  onChange={(e) => setDraft({ ...draft, routing_email: e.target.value })}
                  placeholder="team@business.com"
                />
              </div>
              <div>
                <Label>Routing phone</Label>
                <Input
                  value={draft.routing_phone || ""}
                  onChange={(e) => setDraft({ ...draft, routing_phone: e.target.value })}
                  placeholder="+1 555…"
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={draft.routing_whatsapp || ""}
                  onChange={(e) => setDraft({ ...draft, routing_whatsapp: e.target.value })}
                  placeholder="+1 555…"
                />
              </div>
            </div>

            <div>
              <Label>Handoff message</Label>
              <Textarea
                value={draft.handoff_message || ""}
                onChange={(e) => setDraft({ ...draft, handoff_message: e.target.value })}
                placeholder="What the AI should say when forwarding the user to this department."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={!!draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DepartmentsManager;
