import { ReactNode } from "react";
import { useWorkspaceRole, WorkspaceRole } from "@/hooks/useWorkspaceRole";
import { Lock } from "lucide-react";

interface RoleGateProps {
  assistantId?: string | null;
  /** Allowed roles. Defaults to manage-level (owner / manager / admin). */
  allow?: WorkspaceRole[];
  children: ReactNode;
  /** What to render when access is denied. Defaults to a subtle locked notice. */
  fallback?: ReactNode;
  /** When true, render nothing (instead of the fallback) on denial. */
  hideWhenDenied?: boolean;
}

const DEFAULT_ALLOW: WorkspaceRole[] = ["owner", "manager", "admin"];

export function RoleGate({
  assistantId,
  allow = DEFAULT_ALLOW,
  children,
  fallback,
  hideWhenDenied,
}: RoleGateProps) {
  const { role, loading } = useWorkspaceRole(assistantId);

  if (loading) return <>{children}</>; // optimistic — avoids upgrade flash
  const allowed = role ? allow.includes(role) : false;
  if (allowed) return <>{children}</>;
  if (hideWhenDenied) return null;
  return (
    <>
      {fallback ?? (
        <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground flex items-start gap-2">
          <Lock className="w-4 h-4 mt-0.5" />
          <div>
            <div className="font-medium text-foreground">Locked</div>
            <div className="text-xs">
              You don't have permission to change this section. Ask the assistant owner or a manager
              to update it for you.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
