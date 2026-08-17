import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarCheck, Mail, Phone, RefreshCw, Check, X, Video } from "lucide-react";
import { toast } from "sonner";
import { adminApi, loadPlatformSettings, savePlatformSetting } from "@/talkstay/admin/adminApi";

interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  property_count: string | null;
  preferred_time: string | null;
  message: string | null;
  status: "new" | "confirmed" | "declined" | "done";
  meeting_url: string | null;
  confirmed_at: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  new: "bg-violet-100 text-violet-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  declined: "bg-zinc-100 text-zinc-700",
  done: "bg-sky-100 text-sky-800",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Demo requests from the marketing site. No calendar integration — you confirm
 * a request and TalkStay emails them your meeting link. Deliberately manual so
 * this works before any scheduling tool exists.
 */
export default function AdminDemoRequests() {
  const [rows, setRows] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [whenById, setWhenById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi<{ requests: DemoRequest[]; missingTable?: boolean }>("demo_requests");
      setRows(res.requests ?? []);
      setMissingTable(!!res.missingTable);
      const s = await loadPlatformSettings();
      const demo = (s.settings.demo ?? {}) as { meeting_url?: string; notify_email?: string };
      setMeetingUrl(demo.meeting_url ?? "");
      setNotifyEmail(demo.notify_email ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load demo requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveSettings = async () => {
    const url = meetingUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      toast.error("Meeting link must start with https://");
      return;
    }
    setSavingSettings(true);
    try {
      await savePlatformSetting("demo", { meeting_url: url, notify_email: notifyEmail.trim() });
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSavingSettings(false);
    }
  };

  const confirm = async (r: DemoRequest) => {
    if (!meetingUrl.trim()) {
      toast.error("Add your meeting link above first — that's what gets emailed.");
      return;
    }
    setBusyId(r.id);
    try {
      await adminApi("confirm_demo_request", { id: r.id, when: whenById[r.id] ?? "" });
      toast.success(`Confirmed — meeting link emailed to ${r.email}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't confirm");
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (r: DemoRequest, status: "declined" | "done" | "new") => {
    setBusyId(r.id);
    try {
      await adminApi("set_demo_status", { id: r.id, status });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Demo requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Owners who asked for a live demo from the website. Confirm one and TalkStay
          emails them your meeting link.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-violet-700" />
          <h2 className="text-sm font-semibold text-violet-950">Your meeting link</h2>
        </div>
        <p className="text-xs text-violet-900/80">
          Paste a standing Google Meet or Teams link — the same one is sent on every
          confirmation, so you don't need a scheduling tool yet. In Google Meet, use
          <strong> Create a meeting for later</strong> to get a link that stays valid.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-violet-900">Meeting link</label>
            <Input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-violet-900">Notify me at (email)</label>
            <Input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="you@talkweb.io"
            />
          </div>
        </div>
        <p className="text-[11px] text-violet-900/70">
          Without a notify address, new requests only appear here — you won't be emailed.
        </p>
        <Button size="sm" disabled={savingSettings} onClick={() => void saveSettings()} className="bg-violet-600 hover:bg-violet-700">
          {savingSettings ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Requests ({rows.length})</h2>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : missingTable ? (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          The demo-requests table isn't in the database yet — apply the
          <code className="mx-1 text-xs">20260817000004_talkstay_demo_requests</code>
          migration and refresh.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          No demo requests yet. They arrive from the “Book a live demo” button on the website.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[r.status] ?? STATUS_STYLE.new}`}>
                      {r.status}
                    </span>
                    {r.company && <span className="text-sm text-muted-foreground">· {r.company}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      <Mail className="h-3 w-3" /> {r.email}
                    </a>
                    {r.phone && (
                      <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                        <Phone className="h-3 w-3" /> {r.phone}
                      </a>
                    )}
                    <span>{fmt(r.created_at)}</span>
                  </div>
                  {r.preferred_time && (
                    <p className="mt-1.5 text-sm"><span className="text-muted-foreground">Prefers:</span> {r.preferred_time}</p>
                  )}
                  {r.message && (
                    <p className="mt-1.5 border-l-2 border-muted pl-2 text-sm italic text-muted-foreground">"{r.message}"</p>
                  )}
                </div>
              </div>

              {r.status === "new" ? (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
                  <div className="min-w-[200px] flex-1 space-y-1">
                    <label className="text-[11px] text-muted-foreground">Time to tell them (optional)</label>
                    <Input
                      value={whenById[r.id] ?? ""}
                      onChange={(e) => setWhenById((m) => ({ ...m, [r.id]: e.target.value }))}
                      placeholder="e.g. Thursday 10:00 UK time"
                      className="h-9"
                    />
                  </div>
                  <Button size="sm" disabled={busyId === r.id} onClick={() => void confirm(r)} className="bg-emerald-700 hover:bg-emerald-800">
                    {busyId === r.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />}
                    Confirm &amp; send link
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => void setStatus(r, "declined")}>
                    <X className="mr-1.5 h-3.5 w-3.5" /> Dismiss
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
                  {r.confirmed_at && <span>Confirmed {fmt(r.confirmed_at)}</span>}
                  {r.meeting_url && (
                    <a href={r.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-700 hover:underline">
                      <Video className="h-3 w-3" /> Open meeting
                    </a>
                  )}
                  {r.status !== "done" && (
                    <button className="underline hover:text-foreground" onClick={() => void setStatus(r, "done")}>
                      <Check className="mr-1 inline h-3 w-3" />Mark done
                    </button>
                  )}
                  <button className="underline hover:text-foreground" onClick={() => void setStatus(r, "new")}>
                    Reopen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
