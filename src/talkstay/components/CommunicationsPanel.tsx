import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Loader2, Mail, Send, Users, Ban, RotateCcw, Search, ImagePlus, X,
} from "lucide-react";
import type { Hotel } from "@/talkstay/lib/hotels";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import {
  listGuestCampaigns,
  listGuestContacts,
  sendGuestCampaign,
  staffResubscribeGuest,
  staffUnsubscribeGuest,
  uploadCampaignImage,
  type GuestCampaign,
  type GuestContact,
} from "@/talkstay/lib/guestComms";
import { useDemo } from "@/talkstay/demo/DemoContext";

/**
 * Guest contacts + occasional manual campaigns (offers / news).
 * Not an automatic newsletter — staff choose when to send.
 */
export default function CommunicationsPanel({ hotel }: { hotel: Hotel }) {
  const demo = useDemo();
  const [tab, setTab] = useState("contacts");
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<GuestContact[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [campaigns, setCampaigns] = useState<GuestCampaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "subscribed" | "unsubscribed">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "guest_opt_in" | "checkin_email">("all");
  // Days since lastSeenAt (their most recent stay), or "any" for no limit.
  const [dateFilter, setDateFilter] = useState<"any" | "7" | "30" | "90">("any");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState(hotel.branding?.booking_url ?? "");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refresh = async () => {
    if (demo) {
      setContacts([]);
      setEligibleCount(0);
      setCampaigns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [c, camps] = await Promise.all([
        listGuestContacts(hotel.id),
        listGuestCampaigns(hotel.id),
      ]);
      setContacts(c.contacts);
      setEligibleCount(c.eligibleCount);
      setCampaigns(camps);
      setSelected((prev) => {
        const next = new Set<string>();
        for (const email of prev) {
          if (c.contacts.some((x) => x.email === email && x.marketingOk)) next.add(email);
        }
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load guest communications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = dateFilter === "any" ? null : Date.now() - Number(dateFilter) * 86_400_000;
    return contacts.filter((c) => {
      if (q && !(
        c.email.includes(q)
        || (c.firstName ?? "").toLowerCase().includes(q)
        || (c.roomLabel ?? "").toLowerCase().includes(q)
      )) return false;
      if (statusFilter === "subscribed" && !c.marketingOk) return false;
      if (statusFilter === "unsubscribed" && c.marketingOk) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (cutoff !== null) {
        // No recorded stay at all is treated as "outside any date window" —
        // a filter meant to surface recent guests shouldn't also surface
        // contacts with no known visit.
        if (!c.lastSeenAt || new Date(c.lastSeenAt).getTime() < cutoff) return false;
      }
      return true;
    });
  }, [contacts, search, statusFilter, sourceFilter, dateFilter]);

  const filterActive = statusFilter !== "all" || sourceFilter !== "all" || dateFilter !== "any";
  const resetFilters = () => {
    setStatusFilter("all"); setSourceFilter("all"); setDateFilter("any");
  };

  const toggle = (email: string, ok: boolean) => {
    if (!ok) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  // Scoped to the FILTERED list on purpose: filter down (say, last 30 days,
  // still subscribed), then "select" picks up exactly that set. Selection only
  // ever feeds Compose's explicit-recipients path — the "send to all N
  // eligible" default elsewhere always means the whole property, unaffected by
  // whatever filter happens to be active here, so filtering can never silently
  // narrow (or widen) an unfiltered send.
  const filteredEligible = filtered.filter((c) => c.marketingOk);
  const selectAllEligible = () => {
    setSelected(new Set(filteredEligible.map((c) => c.email)));
  };

  const clearSelection = () => setSelected(new Set());

  const unsubscribe = async (email: string) => {
    if (demo) return;
    setBusy(true);
    try {
      await staffUnsubscribeGuest(hotel.id, email);
      toast.success(`Unsubscribed ${email}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't unsubscribe");
    } finally {
      setBusy(false);
    }
  };

  const resubscribe = async (email: string) => {
    if (demo) return;
    setBusy(true);
    try {
      await staffResubscribeGuest(hotel.id, email);
      toast.success(`Resubscribed ${email}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't resubscribe");
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (demo) {
      toast.message("Images aren’t uploaded in the design demo.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large — keep it under 5MB");
      return;
    }
    setImageUploading(true);
    try {
      setImageUrl(await uploadCampaignImage(hotel.id, file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't upload that image");
    } finally {
      setImageUploading(false);
    }
  };

  const sendCount = (selected.size ? selected.size : eligibleCount);

  /** Checks only — opens the confirm dialog rather than sending directly.
   *  A native confirm() used to sit here. In an installed PWA (this app
   *  promotes "add to home screen" throughout), window.confirm/alert are
   *  frequently suppressed or silently no-op depending on the browser engine
   *  — the button looked live but nothing happened, no dialog, no error, no
   *  send. An in-app AlertDialog doesn't depend on browser chrome at all. */
  const requestSend = () => {
    if (demo) {
      toast.message("Campaigns aren’t sent in the design demo.");
      return;
    }
    if (!sendCount) {
      toast.error("No eligible guests to email yet");
      return;
    }
    if (!subject.trim() || !bodyText.trim()) {
      toast.error("Add a subject and message");
      return;
    }
    setConfirmOpen(true);
  };

  const send = async () => {
    setConfirmOpen(false);
    const emails = selected.size ? [...selected] : undefined;
    setBusy(true);
    try {
      const res = await sendGuestCampaign({
        hotelId: hotel.id,
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
        imageUrl: imageUrl || undefined,
        emails,
      });
      toast.success(`Sent to ${res.sent} of ${res.attempted}`);
      setSubject("");
      setBodyText("");
      setImageUrl("");
      clearSelection();
      setTab("sent");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send campaign");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">Communications</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Guests who shared an email during a stay (updates opt-in or check-in code).
              Send occasional offers or news yourself — TalkStay does <span className="font-medium text-foreground">not</span>{" "}
              send monthly newsletters automatically. Every campaign includes an unsubscribe link.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Separate from the one-time post-checkout “book again” email (configured under Branding → Property).
            </p>
          </div>
        </div>
      </div>

      {demo && (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Demo mode — contact list and sends use live property data after you sign in.
        </p>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Contacts
            {!loading && (
              <span className="ml-1.5 tabular-nums text-xs text-muted-foreground">({contacts.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="compose">
            <Send className="mr-1.5 h-3.5 w-3.5" /> Compose
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email, name, room…"
                className="h-9 pl-8"
              />
            </div>
            <Button type="button" size="sm" variant="outline" disabled={loading || busy} onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={!filteredEligible.length} onClick={selectAllEligible}>
              Select {filterActive ? "filtered" : "eligible"} ({filteredEligible.length})
            </Button>
            {selected.size > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                Clear ({selected.size})
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="subscribed">Subscribed</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Last seen: any time</SelectItem>
                <SelectItem value="7">Last seen: 7 days</SelectItem>
                <SelectItem value="30">Last seen: 30 days</SelectItem>
                <SelectItem value="90">Last seen: 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any source</SelectItem>
                <SelectItem value="guest_opt_in">Guest opt-in</SelectItem>
                <SelectItem value="checkin_email">Check-in email</SelectItem>
              </SelectContent>
            </Select>
            {filterActive && (
              <Button type="button" size="sm" variant="ghost" onClick={resetFilters}>
                Reset filters
              </Button>
            )}
            {filterActive && (
              <span className="text-xs text-muted-foreground">
                {filtered.length} of {contacts.length} contact{contacts.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading contacts…
            </div>
          ) : filtered.length === 0 && (search.trim() || filterActive) ? (
            // Distinct from the true zero-contacts state below: this property
            // DOES have guest emails, the search/filters just matched none of
            // them — "no guest emails yet" here would be actively misleading.
            <div className="rounded-2xl border border-dashed px-5 py-10 text-center">
              <p className="text-sm font-medium">No contacts match</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Try a different search, or reset the filters above.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-5 py-10 text-center">
              <p className="text-sm font-medium">No guest emails yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                They appear when a guest opts into stay updates, or when staff emails a check-in code from Rooms &amp; QR.
              </p>
            </div>
          ) : (
            <div className="divide-y overflow-hidden rounded-2xl border bg-card">
              {filtered.map((c) => (
                <div key={c.email} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <label className="flex min-w-0 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border"
                      disabled={!c.marketingOk}
                      checked={selected.has(c.email)}
                      onChange={() => toggle(c.email, c.marketingOk)}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.email}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.firstName ? `${c.firstName} · ` : ""}
                        {c.roomLabel ? formatRoomLabel(c.roomLabel) : "Room unknown"}
                        {" · "}
                        {c.source === "checkin_email" ? "Check-in email" : "Guest opt-in"}
                        {!c.marketingOk ? " · Unsubscribed" : ""}
                      </p>
                    </div>
                  </label>
                  {c.marketingOk ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      className="text-muted-foreground"
                      onClick={() => void unsubscribe(c.email)}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" /> Opt out
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void resubscribe(c.email)}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Re-enable
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compose" className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <p className="text-sm text-muted-foreground">
              {selected.size
                ? `Will send to ${selected.size} selected guest${selected.size === 1 ? "" : "s"}.`
                : `Will send to all ${eligibleCount} eligible guest${eligibleCount === 1 ? "" : "s"} (not unsubscribed).`}
            </p>
            <div className="space-y-1.5">
              <Label>Image (optional)</Label>
              {imageUrl ? (
                <div className="relative w-full max-w-xs overflow-hidden rounded-lg border">
                  <img src={imageUrl} alt="" className="block h-32 w-full object-cover" />
                  <Button
                    type="button" size="icon" variant="secondary"
                    className="absolute right-1.5 top-1.5 h-6 w-6 rounded-full shadow"
                    onClick={() => setImageUrl("")}
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <label className="flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-violet-400 hover:text-violet-700">
                  {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {imageUploading ? "Uploading…" : "Add a photo"}
                  <input type="file" accept="image/*" className="hidden" disabled={imageUploading} onChange={(e) => void onPickImage(e)} />
                </label>
              )}
              <p className="text-[11px] text-muted-foreground">Shown above the message, e.g. the spa or the new dish.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="camp-subject">Subject</Label>
              <Input
                id="camp-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Weekend spa offer for return guests"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="camp-body">Message</Label>
              <textarea
                id="camp-body"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={8}
                maxLength={4000}
                placeholder={"We'd love to welcome you back.\n\nThis weekend our spa has availability — book direct for a return-guest rate."}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="camp-cta-label">Button label (optional)</Label>
                <Input
                  id="camp-cta-label"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Book your stay"
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="camp-cta-url">Button URL (optional)</Label>
                <Input
                  id="camp-cta-url"
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://yourhotel.com/book"
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={busy || loading || (!selected.size && !eligibleCount)}
              className="bg-violet-600 hover:bg-violet-700"
              onClick={requestSend}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Send campaign
            </Button>
          </div>
        </TabsContent>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send this campaign?</AlertDialogTitle>
              <AlertDialogDescription>
                Send this email to {sendCount} guest{sendCount === 1 ? "" : "s"}? This is a one-off
                send — TalkStay does not auto-repeat campaigns.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-violet-600 hover:bg-violet-700" onClick={() => void send()}>
                Send
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <TabsContent value="sent" className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
              No campaigns sent yet.
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div key={c.id} className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium tracking-tight">{c.subject}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()} · {c.sent_count}/{c.recipient_count} sent
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">{c.body_text}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
