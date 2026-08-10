import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { Hotel } from "@/talkstay/lib/hotels";

type LiveLink = {
  id: string;
  token: string;
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  url: string;
};

/** Owner/manager control: create a no-signup read-only live ops link for campaigns. */
export default function LiveShareCard({ hotel }: { hotel: Hotel }) {
  const [links, setLinks] = useState<LiveLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("Email & phone campaign");
  const [days, setDays] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("talkstay-live-view", {
      body: { action: "list", hotelId: hotel.id },
    });
    setLoading(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Couldn't load live links");
      return;
    }
    setLinks(((data as { links?: LiveLink[] })?.links) ?? []);
  }, [hotel.id]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true);
    const expiresInDays = Number(days);
    const { data, error } = await supabase.functions.invoke("talkstay-live-view", {
      body: {
        action: "create",
        hotelId: hotel.id,
        label: label.trim() || "Campaign live view",
        expiresInDays: Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : null,
      },
    });
    setBusy(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Couldn't create link");
      return;
    }
    const link = (data as { link: LiveLink }).link;
    setLinks((prev) => [link, ...prev.map((l) => ({ ...l, is_active: false }))]);
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Live view link created and copied.");
    } catch {
      toast.success("Live view link created.");
    }
  };

  const revoke = async (tokenId: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("talkstay-live-view", {
      body: { action: "revoke", hotelId: hotel.id, tokenId },
    });
    setBusy(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Couldn't revoke");
      return;
    }
    setLinks((prev) => prev.map((l) => (l.id === tokenId ? { ...l, is_active: false } : l)));
    toast.message("Live view link revoked.");
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied link");
    } catch {
      toast.message(url);
    }
  };

  const active = links.find((l) => l.is_active);

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Link2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold tracking-tight">Live campaign view</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Share a read-only link so prospects can watch your real request queue update live —
            no signup, and they can't change anything. Revoke anytime.
          </p>
        </div>
      </div>

      {active ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input readOnly value={active.url} className="font-mono text-xs" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => void copy(active.url)}>
                <Copy className="mr-1.5 h-4 w-4" /> Copy
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void revoke(active.id)}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Revoke
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {active.label || "Live view"}
            {active.expires_at ? ` · expires ${new Date(active.expires_at).toLocaleDateString()}` : " · no expiry"}
            {active.last_seen_at ? ` · last opened ${new Date(active.last_seen_at).toLocaleString()}` : ""}
          </p>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void create()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Rotate to a new link
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Link label"
            />
            <Input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Days"
              title="Expires in days"
            />
          </div>
          <Button type="button" className="bg-violet-600 hover:bg-violet-700" disabled={busy} onClick={() => void create()}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Link2 className="mr-1.5 h-4 w-4" />}
            Create live view link
          </Button>
        </div>
      )}

      {loading && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking existing links…
        </p>
      )}
    </div>
  );
}
