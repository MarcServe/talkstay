import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logWorkspaceAction } from "@/components/WorkspaceAuditLog";
import { useWorkspaceRole, WorkspaceRole } from "@/hooks/useWorkspaceRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Loader2, Mail, Send, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";

interface WorkspaceMembersManagerProps {
  assistantId: string;
}

interface MemberRow {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  role: WorkspaceRole;
  status: string;
  created_at: string;
  notify_on_knowledge_update?: boolean;
  email?: string | null;
  display_name?: string | null;
}

const ROLE_OPTIONS: { value: WorkspaceRole; label: string; hint: string }[] = [
  { value: "manager", label: "Manager", hint: "Can edit everything except billing & ownership" },
  { value: "operator", label: "Operator", hint: "Can edit content & bookings, not settings" },
  { value: "viewer", label: "Viewer", hint: "Read-only access" },
];

export const WorkspaceMembersManager = ({ assistantId }: WorkspaceMembersManagerProps) => {
  const { user } = useAuth();
  const { canManage, role: myRole, loading: roleLoading } = useWorkspaceRole(assistantId);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("operator");
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workspace_members")
      .select("id, user_id, invited_email, role, status, created_at, notify_on_knowledge_update")
      .eq("assistant_id", assistantId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Failed to load team: " + error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as MemberRow[];
    const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name")
        .in("user_id", userIds);
      const map = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => map.set(p.user_id, p));
      rows.forEach((r) => {
        if (r.user_id) {
          const p = map.get(r.user_id);
          if (p) {
            r.email = p.email;
            r.display_name = [p.first_name, p.last_name].filter(Boolean).join(" ") || null;
          }
        }
      });
    }
    setMembers(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantId]);

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "invite-workspace-member",
        { body: { assistant_id: assistantId, email, role: inviteRole } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      logWorkspaceAction({
        assistantId,
        action: "member.invite",
        targetType: "email",
        targetId: email,
        metadata: { role: inviteRole, email_sent: (data as any)?.email_sent },
      });

      if ((data as any)?.email_sent) {
        toast.success("Invite email sent — link expires in 24 hours");
      } else if ((data as any)?.already_existing_user) {
        toast.success("Member added — they already have an account and can access immediately");
      } else {
        toast.success("Invite saved — they'll get access on next sign-in (link valid 24 hours)");
      }
      setInviteEmail("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (id: string, newRole: WorkspaceRole) => {
    const { error } = await supabase
      .from("workspace_members")
      .update({ role: newRole })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      logWorkspaceAction({ assistantId, action: "member.role_change", targetType: "member", targetId: id, metadata: { role: newRole } });
      toast.success("Role updated");
      load();
    }
  };

  const toggleNotify = async (id: string, value: boolean) => {
    const target = members.find((m) => m.id === id);
    setMembers((cur) => cur.map((m) => (m.id === id ? { ...m, notify_on_knowledge_update: value } : m)));
    const { error } = await supabase
      .from("workspace_members")
      .update({ notify_on_knowledge_update: value })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      load();
    } else {
      logWorkspaceAction({
        assistantId,
        action: "member.notify_toggle",
        targetType: "member",
        targetId: id,
        metadata: { email: target?.invited_email || (target as any)?.email || null, enabled: value },
      });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("workspace_members").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      logWorkspaceAction({ assistantId, action: "member.remove", targetType: "member", targetId: id });
      toast.success("Member removed");
      load();
    }
  };

  const resend = async (m: MemberRow) => {
    const email = (m.invited_email || m.email || "").trim().toLowerCase();
    if (!email) {
      toast.error("No email on file for this member");
      return;
    }
    setResendingId(m.id);
    try {
      const { data, error } = await supabase.functions.invoke(
        "invite-workspace-member",
        { body: { assistant_id: assistantId, email, role: m.role, resend: true } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      logWorkspaceAction({
        assistantId,
        action: "member.invite_resend",
        targetType: "email",
        targetId: email,
        metadata: { role: m.role, email_sent: (data as any)?.email_sent },
      });

      if ((data as any)?.email_sent) {
        toast.success("Invite email re-sent — new link expires in 24 hours");
      } else {
        toast.success("Invite refreshed — link valid 24 hours");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to resend invite");
    } finally {
      setResendingId(null);
    }
  };

  if (roleLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-ai-cyan">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-ai-cyan" />
          <CardTitle className="text-base">Team & roles</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Invite teammates to collaborate on this assistant. Owners and admins control what each role can change.
          {myRole && (
            <span className="ml-1">
              Your role here: <Badge variant="outline" className="ml-1">{myRole}</Badge>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Invite a teammate
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr,180px,auto] gap-2">
              <div className="space-y-1">
                <Label htmlFor="invite-email" className="sr-only">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex flex-col text-left">
                        <span>{r.label}</span>
                        <span className="text-xs text-muted-foreground">{r.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={invite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? "Inviting…" : "Invite"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Invitation links expire after <strong>24 hours</strong>. If the person already has a TalkWeb account, they get access immediately. Otherwise they'll receive an email to set a password and join.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">Members</div>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : members.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No teammates yet. {canManage ? "Invite someone above." : "Ask the owner to add you."}
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {m.display_name || m.email || m.invited_email}
                    </div>
                    {m.display_name && (m.email || m.invited_email) && (
                      <div className="text-xs text-muted-foreground truncate">
                        {m.email || m.invited_email}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {m.status === "pending" ? "Invite pending (link valid 24h after sending)" : "Active"} · joined{" "}
                      {new Date(m.created_at).toLocaleDateString()}
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5 cursor-pointer select-none">
                      <Switch
                        checked={m.notify_on_knowledge_update === true}
                        onCheckedChange={(v) => toggleNotify(m.id, v)}
                        disabled={!canManage && m.user_id !== user?.id}
                      />
                      <Bell className="h-3 w-3" />
                      Instant alerts on knowledge / content updates (off by default)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) => updateRole(m.id, v as WorkspaceRole)}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{m.role}</Badge>
                    )}
                    {canManage && (m.invited_email || m.email) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => resend(m)}
                        disabled={resendingId === m.id}
                        title="Resend invite email"
                      >
                        {resendingId === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5 mr-1" /> Resend
                          </>
                        )}
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => remove(m.id)}
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
          <div><strong>Owner</strong> — full control (you, as the assistant creator).</div>
          <div><strong>Manager</strong> — manage settings, content, bookings, team.</div>
          <div><strong>Operator</strong> — edit content, bookings, knowledge. No settings.</div>
          <div><strong>Viewer</strong> — read-only access to dashboards.</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkspaceMembersManager;
