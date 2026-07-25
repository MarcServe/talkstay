import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type WorkspaceRole = "owner" | "manager" | "operator" | "viewer" | "admin";

export interface WorkspaceRoleResult {
  role: WorkspaceRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  canManage: boolean;   // owner | manager | admin
  canEdit: boolean;     // owner | manager | operator | admin
  canView: boolean;     // any role
  loading: boolean;
}

/**
 * Phase 4 — resolves the current user's role for a given assistant.
 * Falls back to 'owner' for the assistant's user_id, 'admin' for global admins,
 * otherwise reads workspace_members.
 */
export function useWorkspaceRole(assistantId?: string | null): WorkspaceRoleResult {
  const { user } = useAuth();
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      setLoading(true);
      if (!user || !assistantId) {
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      // 1. Direct ownership
      const { data: assistant } = await supabase
        .from("assistants")
        .select("user_id")
        .eq("id", assistantId)
        .maybeSingle();
      if (cancelled) return;
      if (assistant?.user_id === user.id) {
        setRole("owner");
        setLoading(false);
        return;
      }

      // 2. Global admin
      const { data: adminRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      if (adminRow) {
        setRole("admin");
        setLoading(false);
        return;
      }

      // 3. Workspace membership
      const { data: member } = await supabase
        .from("workspace_members")
        .select("role,status")
        .eq("assistant_id", assistantId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (cancelled) return;
      setRole((member?.role as WorkspaceRole) ?? null);
      setLoading(false);
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [user, assistantId]);

  const isOwner = role === "owner";
  const isAdmin = role === "admin";
  const canManage = role === "owner" || role === "manager" || role === "admin";
  const canEdit = canManage || role === "operator";
  const canView = role !== null;

  return { role, isOwner, isAdmin, canManage, canEdit, canView, loading };
}
