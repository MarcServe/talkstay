import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Search, Camera, FileText, Check, X,
} from "lucide-react";
import {
  listCatalogItems, addCatalogItem, updateCatalogItem, deleteCatalogItem,
  listRooms, itemIsAvailable, AVAILABILITY_LABELS,
  type CatalogItem, type CatalogAvailability, type Hotel, type Room,
} from "@/talkstay/lib/hotels";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { formatMoney } from "@/talkstay/lib/statusStyles";
import { useHotelDepartments } from "@/talkstay/hooks/useHotelDepartments";

/** A card in the knowledge base that reads like a priced menu. */
interface KnowledgeCard {
  id: string;
  title: string | null;
  content: string;
  department_key: string | null;
}

/** One row of a scan awaiting confirmation. Department is per row so a single
 *  photo of a combined food-and-drinks list can be split as it is confirmed. */
interface Candidate {
  name: string;
  price: number | null;
  departmentKey: string;
  keep: boolean;
}

const SCOPES: CatalogAvailability[] = ["everywhere", "rooms", "public"];
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";

export default function MenusPanel({ hotel }: { hotel: Hotel }) {
  const { departments } = useHotelDepartments(hotel.id);
  // Departments links here with ?dept=, so "open the Bar's menu" lands filtered
  // to the Bar rather than on 300 items the person has to sift.
  const [searchParams] = useSearchParams();
  const initialDepartment = searchParams.get("dept");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [outlets, setOutlets] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>(initialDepartment || "all");
  /** "all" | "shared" | a venue id — the pool bar and the lobby bar keep
   *  separate lists and separate prices, so the list has to be sliceable by
   *  area as well as by team. */
  const [areaFilter, setAreaFilter] = useState<string>("all");
  /** Where anything added lands: exactly one scope, or one-or-more venues.
   *  Same rule as the old per-department editor — "guest rooms only" plus
   *  "only the Lobby" is not a thing anyone can mean. */
  const [targets, setTargets] = useState<string[]>(["everywhere"]);

  // add one by hand
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDept, setNewDept] = useState("");
  const [busy, setBusy] = useState(false);

  // scan / convert
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [pasted, setPasted] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [cardsOpen, setCardsOpen] = useState(false);

  // useHotelDepartments already returns only the active ones.
  const activeDepts = departments;
  const deptName = (key: string) =>
    activeDepts.find((d) => d.key === key)?.display_name ?? key;

  useEffect(() => {
    if (!newDept && activeDepts.length) setNewDept(activeDepts[0].key);
  }, [activeDepts, newDept]);

  const load = async () => {
    setLoading(true);
    const [rows, rooms] = await Promise.all([
      listCatalogItems(hotel.id).catch(() => [] as CatalogItem[]),
      listRooms(hotel.id).catch(() => [] as Room[]),
    ]);
    setItems(rows);
    setOutlets(rooms.filter((r) => !!r.is_public));
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [hotel.id]);

  const outletName = (id: string | null | undefined) => {
    if (!id) return null;
    const o = outlets.find((r) => r.id === id);
    return o ? formatRoomLabel(o.room_number) : "Venue";
  };

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (deptFilter !== "all" && i.department_key !== deptFilter) return false;
      if (areaFilter === "shared" && i.outlet_room_id) return false;
      if (areaFilter !== "all" && areaFilter !== "shared" && i.outlet_room_id !== areaFilter) return false;
      if (!needle) return true;
      return `${i.name} ${deptName(i.department_key)} ${outletName(i.outlet_room_id) ?? ""}`
        .toLowerCase().includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q, deptFilter, areaFilter, activeDepts, outlets]);

  const scopeTarget = targets.find((t) => (SCOPES as string[]).includes(t)) as CatalogAvailability | undefined;
  const venueTargets = targets.filter((t) => !(SCOPES as string[]).includes(t));
  /** One write per chosen area: a scope is a single shared row, venues get a
   *  row each — which is what lets the same drink cost more at the lobby bar
   *  than at the pool. */
  const writeTargets: { outletRoomId: string | null; availability: CatalogAvailability }[] =
    scopeTarget
      ? [{ outletRoomId: null, availability: scopeTarget }]
      : venueTargets.map((id) => ({ outletRoomId: id, availability: "everywhere" as CatalogAvailability }));

  const toggleTarget = (value: string) => {
    const isScope = (SCOPES as string[]).includes(value);
    setTargets((prev) => {
      if (isScope) return [value];
      const venues = prev.filter((t) => !(SCOPES as string[]).includes(t));
      const next = venues.includes(value) ? venues.filter((t) => t !== value) : [...venues, value];
      return next.length ? next : ["everywhere"];
    });
  };

  const targetSummary = scopeTarget
    ? AVAILABILITY_LABELS[scopeTarget]
    : venueTargets.length === 1
      ? `Only ${outletName(venueTargets[0])}`
      : `${venueTargets.length} areas · ${venueTargets.map((v) => outletName(v)).join(", ")}`;

  const patch = (id: string, p: Partial<CatalogItem>) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const save = async (item: CatalogItem, p: Partial<CatalogItem>) => {
    const before: Partial<CatalogItem> = {};
    for (const k of Object.keys(p) as (keyof CatalogItem)[]) {
      (before as Record<string, unknown>)[k] = item[k];
    }
    patch(item.id, p);
    try {
      await updateCatalogItem(item.id, p);
    } catch (err) {
      patch(item.id, before);
      toast.error(err instanceof Error ? err.message : "Couldn't save that");
    }
  };

  const backAtValue = (item: CatalogItem) => {
    if (!item.available_at) return "";
    const d = new Date(item.available_at);
    return Number.isNaN(d.getTime())
      ? ""
      : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const saveBackAt = async (item: CatalogItem, hhmm: string) => {
    let iso: string | null = null;
    if (hhmm) {
      const [h, m] = hhmm.split(":").map(Number);
      const when = new Date();
      when.setHours(h, m, 0, 0);
      if (when.getTime() <= Date.now()) when.setDate(when.getDate() + 1);
      iso = when.toISOString();
    }
    await save(item, { available_at: iso });
  };

  const addOne = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !newDept) return;
    const p = newPrice.trim() === "" ? null : Number(newPrice);
    if (p != null && (Number.isNaN(p) || p < 0)) {
      toast.error("Enter a valid price, or leave it blank.");
      return;
    }
    setBusy(true);
    try {
      const added: CatalogItem[] = [];
      const already: string[] = [];
      for (const t of writeTargets) {
        try {
          added.push(await addCatalogItem({
            hotelId: hotel.id, departmentKey: newDept, name, price: p,
            outletRoomId: t.outletRoomId, availability: t.availability,
            currency: hotel.currency || "GBP",
          }));
        } catch (err) {
          // Already on that one area is a duplicate, not a failed add — the
          // other areas should still get it.
          if (err instanceof Error && /duplicate|unique/i.test(err.message)) {
            already.push(outletName(t.outletRoomId) ?? "the shared list");
          } else { throw err; }
        }
      }
      if (added.length) {
        setItems((prev) => [...prev, ...added]);
        setNewName(""); setNewPrice("");
      }
      if (already.length) toast.message(`Already on ${already.join(", ")} — added to the rest.`);
      else if (added.length > 1) toast.success(`Added to ${added.length} areas.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that");
    } finally { setBusy(false); }
  };

  const remove = async (item: CatalogItem) => {
    if (!confirm(`Remove ${item.name} from the menu?`)) return;
    const keep = items;
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    try {
      await deleteCatalogItem(item.id);
    } catch (err) {
      setItems(keep);
      toast.error(err instanceof Error ? err.message : "Couldn't remove that");
    }
  };

  /** Extract candidates from a photo or pasted text. Nothing is written until
   *  the review list is confirmed — these are prices that reach a guest's bill. */
  const runScan = async (payload: { imageUrl?: string; text?: string }, seedDept: string) => {
    setScanBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("talkstay-knowledge", {
        body: { action: "scan_menu", hotelId: hotel.id, departmentKey: seedDept, ...payload },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const found = ((data as { items?: { name: string; price: number | null }[] })?.items) ?? [];
      if (!found.length) {
        toast.message("No priced items found — try a clearer photo, or paste the text.");
        return;
      }
      const existing = new Set(items.map((i) => i.name.trim().toLowerCase()));
      setCandidates(found.map((f) => ({
        name: f.name,
        price: f.price,
        departmentKey: seedDept,
        keep: !existing.has(f.name.trim().toLowerCase()),
      })));
      setScanOpen(false);
      setCardsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that menu");
    } finally { setScanBusy(false); }
  };

  const loadCards = async () => {
    setCardsOpen(true);
    const { data } = await supabase
      .from("ts_knowledge")
      .select("id, title, content, department_key")
      .eq("hotel_id", hotel.id)
      .order("created_at", { ascending: false });
    setCards((data as KnowledgeCard[]) ?? []);
  };

  const confirmCandidates = async () => {
    if (!candidates) return;
    const keep = candidates.filter((c) => c.keep && c.name.trim());
    if (!keep.length) { setCandidates(null); return; }
    setScanBusy(true);
    let added = 0;
    const failed: string[] = [];
    for (const c of keep) {
      let placed = 0;
      for (const t of writeTargets) {
        try {
          const row = await addCatalogItem({
            hotelId: hotel.id, departmentKey: c.departmentKey,
            name: c.name, price: c.price,
            outletRoomId: t.outletRoomId, availability: t.availability,
            currency: hotel.currency || "GBP",
          });
          setItems((prev) => [...prev, row]);
          placed++;
        } catch { /* already on that area — the others still get it */ }
      }
      if (placed) added++; else failed.push(c.name);
    }
    setScanBusy(false);
    setCandidates(null);
    toast.success(failed.length
      ? `Added ${added}. Already on the menu: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}`
      : `Added ${added} item${added === 1 ? "" : "s"}.`);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading menus…</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Everything a guest can order, across every team. Guests see one menu grouped by
        team — where an item appears is decided by the area you give it, not by which
        team owns it.
      </p>

      {/* ---- review list from a scan or a converted card ---- */}
      {candidates && (
        <div className="space-y-3 rounded-2xl border border-violet-300 bg-violet-50/60 p-4 dark:border-violet-400/40 dark:bg-violet-400/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Review before adding</p>
              <p className="text-[11px] text-muted-foreground">
                Set the team per row — a combined food and drinks list can be split here.
                Nothing is live until you confirm.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCandidates(null)}>Cancel</Button>
              <Button size="sm" disabled={scanBusy} onClick={() => void confirmCandidates()}>
                {scanBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                Add {candidates.filter((c) => c.keep).length}
              </Button>
            </div>
          </div>
          <div className="max-h-80 divide-y overflow-y-auto rounded-lg border bg-background">
            {candidates.map((c, idx) => (
              <div key={`${c.name}-${idx}`} className="flex flex-wrap items-center gap-2 px-2.5 py-1.5">
                <input
                  type="checkbox"
                  checked={c.keep}
                  onChange={(e) => setCandidates((prev) => prev!.map((x, i) => i === idx ? { ...x, keep: e.target.checked } : x))}
                  aria-label={`Add ${c.name}`}
                  className="shrink-0"
                />
                <Input
                  value={c.name}
                  onChange={(e) => setCandidates((prev) => prev!.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                  className="h-8 min-w-[10rem] flex-1"
                />
                <select
                  value={c.departmentKey}
                  onChange={(e) => setCandidates((prev) => prev!.map((x, i) => i === idx ? { ...x, departmentKey: e.target.value } : x))}
                  className="h-8 shrink-0 rounded-md border bg-background px-1.5 text-xs"
                  aria-label={`Team for ${c.name}`}
                >
                  {activeDepts.map((d) => <option key={d.key} value={d.key}>{d.display_name}</option>)}
                </select>
                <Input
                  type="number" min="0" step="0.01" inputMode="decimal"
                  value={c.price ?? ""}
                  placeholder="—"
                  onChange={(e) => setCandidates((prev) => prev!.map((x, i) => i === idx ? { ...x, price: e.target.value === "" ? null : Number(e.target.value) } : x))}
                  className="h-8 w-20 shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- add / import ---- */}
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <p className={LABEL}>Add to the menu</p>
        <form onSubmit={addOne} className="flex flex-wrap items-center gap-2">
          <Input
            value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Item name" className="h-9 min-w-[12rem] flex-1"
          />
          <select
            value={newDept} onChange={(e) => setNewDept(e.target.value)}
            className="h-9 shrink-0 rounded-md border bg-background px-2 text-sm"
            aria-label="Team"
          >
            {activeDepts.map((d) => <option key={d.key} value={d.key}>{d.display_name}</option>)}
          </select>
          <Input
            type="number" min="0" step="0.01" inputMode="decimal"
            value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
            placeholder="Price" className="h-9 w-24 shrink-0"
          />
          <Button type="submit" size="sm" disabled={busy || !newName.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </form>
        {/* Where anything added lands. Scopes are exclusive; venues stack, so a
            drinks list can go to the pool bar and the lobby bar at once and
            stay separately priced afterwards. */}
        <div className="rounded-lg border border-dashed px-2.5 py-2">
          <p className={LABEL}>Add to which areas</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {SCOPES.map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => toggleTarget(sc)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  scopeTarget === sc
                    ? "bg-violet-600 text-white"
                    : "border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {AVAILABILITY_LABELS[sc]}
              </button>
            ))}
          </div>
          {outlets.length > 0 && (
            <>
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                …or pick areas
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {outlets.map((o) => {
                  const on = venueTargets.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleTarget(o.id)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        on
                          ? "bg-sky-700 text-white dark:bg-sky-500/40 dark:text-sky-50"
                          : "border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                      {formatRoomLabel(o.room_number)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">{targetSummary}.</span>{" "}
            {venueTargets.length > 1
              ? "Added to each area separately, so you can price them differently after."
              : "Applies to anything you add, scan or import below."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setScanOpen((v) => !v)}>
            <Camera className="mr-1.5 h-3.5 w-3.5" /> Scan or paste a menu
          </Button>
          <Button size="sm" variant="outline" onClick={() => void loadCards()}>
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Import from Knowledge-base
          </Button>
        </div>

        {scanOpen && (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <textarea
              value={pasted} onChange={(e) => setPasted(e.target.value)}
              rows={4}
              placeholder="Paste a menu — one item per line, prices included."
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
            <Button
              size="sm"
              disabled={scanBusy || !pasted.trim()}
              onClick={() => void runScan({ text: pasted }, newDept)}
            >
              {scanBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Read it
            </Button>
          </div>
        )}

        {cardsOpen && (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Pick a card to read prices from. The card itself is left alone — the
                assistant keeps answering from it as it does now.
              </p>
              <button type="button" onClick={() => setCardsOpen(false)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="max-h-56 divide-y overflow-y-auto rounded-md border bg-background">
              {cards.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground">No knowledge cards yet.</p>
              ) : cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={scanBusy}
                  onClick={() => void runScan({ text: c.content }, c.department_key || newDept)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
                >
                  <span className="min-w-0 truncate">{c.title || "Untitled card"}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {c.department_key ? deptName(c.department_key) : "General"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---- the menu itself ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[10rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search items…" className="h-9 pl-8"
          />
        </div>
        <select
          value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
          className="h-9 shrink-0 rounded-md border bg-background px-2 text-sm"
          aria-label="Filter by area"
        >
          <option value="all">All areas</option>
          <option value="shared">Shared ({items.filter((i) => !i.outlet_room_id).length})</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {formatRoomLabel(o.room_number)} ({items.filter((i) => i.outlet_room_id === o.id).length})
            </option>
          ))}
        </select>
        <select
          value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="h-9 shrink-0 rounded-md border bg-background px-2 text-sm"
          aria-label="Filter by team"
        >
          <option value="all">All teams ({items.length})</option>
          {activeDepts.map((d) => (
            <option key={d.key} value={d.key}>
              {d.display_name} ({items.filter((i) => i.department_key === d.key).length})
            </option>
          ))}
        </select>
      </div>

      <div className="divide-y rounded-2xl border bg-card">
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No menu items yet — add one above." : "Nothing matches that."}
          </p>
        ) : visible.map((i) => {
          const on = itemIsAvailable(i);
          return (
            <div key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <div className="min-w-[11rem] flex-1">
                <span className="block truncate text-sm">{i.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {outletName(i.outlet_room_id) ?? AVAILABILITY_LABELS[i.availability ?? "everywhere"]}
                </span>
              </div>
              <select
                value={i.department_key}
                onChange={(e) => void save(i, { department_key: e.target.value })}
                className="h-8 shrink-0 rounded-md border bg-background px-1.5 text-xs"
                aria-label={`Team for ${i.name}`}
              >
                {activeDepts.map((d) => <option key={d.key} value={d.key}>{d.display_name}</option>)}
              </select>
              {/* Scope and venue in one control: they are alternatives, not a
                  pair. Picking an area pins the row to it; picking a scope
                  releases it back to the shared list. */}
              <select
                value={i.outlet_room_id ?? (i.availability ?? "everywhere")}
                onChange={(e) => {
                  const v = e.target.value;
                  void save(i, (SCOPES as string[]).includes(v)
                    ? { outlet_room_id: null, availability: v as CatalogAvailability }
                    : { outlet_room_id: v, availability: "everywhere" });
                }}
                className="h-8 shrink-0 rounded-md border bg-background px-1.5 text-xs"
                aria-label={`Where ${i.name} is offered`}
              >
                {SCOPES.map((sc) => <option key={sc} value={sc}>{AVAILABILITY_LABELS[sc]}</option>)}
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>Only {formatRoomLabel(o.room_number)}</option>
                ))}
              </select>
              <Input
                type="number" min="0" step="0.01" inputMode="decimal"
                defaultValue={i.price ?? ""}
                placeholder="—"
                className="h-8 w-20 shrink-0"
                onBlur={(e) => {
                  const v = e.target.value.trim() === "" ? null : Number(e.target.value);
                  if (v !== (i.price ?? null) && (v === null || (!Number.isNaN(v) && v >= 0))) {
                    void save(i, { price: v });
                  }
                }}
              />
              <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground sm:block">
                {typeof i.price === "number" ? formatMoney(i.price, i.currency) : "—"}
              </span>
              <button
                type="button"
                onClick={() => void save(i, on ? { is_available: false } : { is_available: true, available_at: null })}
                aria-pressed={!on}
                className={`h-8 shrink-0 rounded-md px-2 text-[11px] font-medium transition-colors ${
                  on
                    ? "border bg-background text-muted-foreground hover:bg-muted"
                    : "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/30"
                }`}
              >
                {on ? "Available" : (backAtValue(i) ? `Off til ${backAtValue(i)}` : "Off")}
              </button>
              {!on && (
                <input
                  type="time"
                  defaultValue={backAtValue(i)}
                  onChange={(e) => void saveBackAt(i, e.target.value)}
                  aria-label={`When ${i.name} is back`}
                  className="h-8 w-24 shrink-0 rounded-md border bg-background px-1.5 text-[11px]"
                />
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => void remove(i)} aria-label={`Remove ${i.name}`}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
