import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import {
  Building2, LayoutDashboard, Link2, Loader2, LogOut, QrCode, Settings, Shield, Sparkles, Users,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/admin", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/admin/hotels", end: false, label: "Hotels", icon: Building2 },
  { to: "/admin/usage", end: false, label: "Usage", icon: QrCode },
  { to: "/admin/ai", end: false, label: "AI performance", icon: Sparkles },
  { to: "/admin/live-links", end: false, label: "Live links", icon: Link2 },
  { to: "/admin/users", end: false, label: "Users", icon: Users },
  { to: "/admin/settings", end: false, label: "Settings", icon: Settings },
] as const;

/** Platform admin shell — gated by public.is_admin(uuid). */
export default function TalkStayAdminLayout() {
  const { isAdmin, adminLoading, user } = useAdminAuth();

  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying admin access…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/app" replace />;
  }

  if (!isAdmin) {
    return (
      <div data-talkstay className="ts-atmosphere flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Shield className="h-12 w-12 text-rose-500" />
        <h1 className="text-2xl font-bold tracking-tight">Access denied</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This area is for TalkStay platform administrators only. Sign in with an admin account,
          or ask an existing admin to grant you access.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/">Home</Link></Button>
          <Button asChild className="bg-violet-600 hover:bg-violet-700"><Link to="/app">Property dashboard</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div data-talkstay className="ts-atmosphere flex h-[100dvh] overflow-hidden text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col bg-[#15111f] text-white/70 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <TalkStayLogo size={28} />
          <div>
            <div className="font-semibold tracking-tight text-white">TalkStay</div>
            <div className="text-[11px] uppercase tracking-wide text-amber-200/90">Platform admin</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-violet-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="truncate px-3 text-xs text-white/40">{user.email}</div>
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <TalkStayLogo size={24} />
            <span className="text-sm font-semibold">Admin</span>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            Cross-property control plane
          </div>
          <div className="flex gap-2 overflow-x-auto md:hidden">
            {NAV.map(({ to, end, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    isActive ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
