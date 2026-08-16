import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Inbox, Link2, Loader2, DoorOpen, QrCode, Settings, Sparkles, Users } from "lucide-react";
import { adminApi } from "@/talkstay/admin/adminApi";

type Overview = {
  hotels: number;
  activeHotels: number;
  staff: number;
  openRequests: number;
  liveLinks: number;
  rooms: number;
};

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi<Overview>("overview")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading overview…
      </div>
    );
  }

  const cards = [
    { label: "Hotels", value: data.hotels, sub: `${data.activeHotels} active`, icon: Building2, to: "/admin/hotels" },
    { label: "Open requests", value: data.openRequests, sub: "Across all properties", icon: Inbox, to: "/admin/hotels" },
    { label: "Active staff", value: data.staff, sub: "All hotels", icon: Users, to: "/admin/users" },
    { label: "Rooms", value: data.rooms, sub: "Registered rooms", icon: DoorOpen, to: "/admin/hotels" },
    { label: "Live share links", value: data.liveLinks, sub: "Currently active", icon: Link2, to: "/admin/live-links" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide health for TalkStay properties.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, sub, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="rounded-2xl border bg-card p-5 shadow-sm transition hover:border-violet-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-violet-600" />
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
          </Link>
        ))}
        <Link
          to="/admin/usage"
          className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-5 shadow-sm transition hover:border-violet-400 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Usage & pilot billing</span>
            <QrCode className="h-4 w-4 text-violet-600" />
          </div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-violet-900">Per-QR meters</div>
          <div className="mt-1 text-xs text-muted-foreground">Sessions, turns, suggested charges</div>
        </Link>
        <Link
          to="/admin/ai"
          className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">AI performance</span>
            <Sparkles className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-emerald-950">Daily quality</div>
          <div className="mt-1 text-xs text-muted-foreground">Routing, triage, scale readiness</div>
        </Link>
        <Link
          to="/admin/settings"
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 shadow-sm transition hover:border-slate-400 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">System settings</span>
            <Settings className="h-4 w-4 text-slate-600" />
          </div>
          <div className="mt-2 text-lg font-semibold tracking-tight">Rates & flags</div>
          <div className="mt-1 text-xs text-muted-foreground">Billing rates, defaults, features</div>
        </Link>
      </div>
    </div>
  );
}
