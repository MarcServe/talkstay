import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ChevronDown, Camera, Check, FileUp, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/talkstay/lib/statusStyles";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import {
  listCatalogItems, addCatalogItem, updateCatalogItem, deleteCatalogItem, menuItemKey,
  listRooms, type CatalogItem, type Room,
} from "@/talkstay/lib/hotels";

type OutletFilter = "all" | "shared" | string; // string = room id

/**
 * The tappable menu for one department — what Log order shows instead of making
 * staff type "2 club sandwiches" mid-service. Collapsed by default so the
 * Departments page stays scannable when a bar has forty items.
 *
 * When Public QR venues are linked to this department (Main Restaurant,
 * Outdoor Restaurant, Table 12…), menus can be uploaded per outlet.
 */
export default function DepartmentMenu({
  hotelId, departmentKey, departmentName,
}: {
  hotelId: string; departmentKey: string; departmentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [outlets, setOutlets] = useState<Room[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [outletFilter, setOutletFilter] = useState<OutletFilter>("all");
  /** Where new / scanned items land — shared or a specific venue. */
  const [targetOutlet, setTargetOutlet] = useState<string>("shared");
  // Read inside async scan handlers, which outlive the render that started them.
  const itemsRef = useRef<CatalogItem[]>([]);
  itemsRef.current = items;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  // Menu import: candidates are reviewed before anything is written, because
  // these become prices on a guest's bill.
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [pasted, setPasted] = useState("");
  const [found, setFound] = useState<
    { name: string; price: number | null; keep: boolean; dupe: boolean }[] | null
  >(null);

  // Public QR areas are the outlets — a pool bar and a lobby bar are already
  // separate rooms, so no new concept is needed to tell their menus apart.
  useEffect(() => {
    if (!open || outlets.length) return;
    listRooms(hotelId)
      .then((rs) => setOutlets(rs.filter((r) => r.is_public)))
      .catch(() => setOutlets([]));
  }, [open, hotelId, outlets.length]);

  useEffect(() => {
    if (!open || loaded) return;
    Promise.all([
      listCatalogItems(hotelId, departmentKey),
      listRooms(hotelId),
    ]).then(([rows, rooms]) => {
      setItems(rows);
      const linked = rooms.filter((r) => !!r.is_public && r.department_key === departmentKey);
      setOutlets(linked);
      if (linked.length === 1) {
        setTargetOutlet(linked[0].id);
        setOutletFilter(linked[0].id);
      } else if (linked.length > 1) {
        setTargetOutlet(linked[0].id);
      }
      setLoaded(true);
    });
  }, [open, loaded, hotelId, departmentKey]);

  const outletName = (id: string | null | undefined) => {
    if (!id) return "Shared";
    const o = outlets.find((r) => r.id === id);
    return o ? formatRoomLabel(o.room_number) : "Outlet";
  };

  const visibleItems = useMemo(() => {
    if (outletFilter === "all") return items;
    if (outletFilter === "shared") return items.filter((i) => !i.outlet_room_id);
    return items.filter((i) => i.outlet_room_id === outletFilter || !i.outlet_room_id);
  }, [items, outletFilter]);

  const resolvedOutletId = targetOutlet === "shared" ? null : targetOutlet;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const p = price.trim() === "" ? null : Number(price);
    if (p != null && (Number.isNaN(p) || p < 0)) {
      toast.error("Enter a valid price, or leave it blank.");
      return;
    }
    setBusy(true);
    try {
      const row = await addCatalogItem({
        hotelId,
        departmentKey,
        name: clean,
        price: p,
        outletRoomId: resolvedOutletId,
      });
      setItems((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      setName(""); setPrice("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that");
    } finally {
      setBusy(false);
    }
  };

  const runScan = async (payload: { imageUrl?: string; text?: string }) => {
    setScanBusy(true);
    setFound(null);
    try {
      const { data, error } = await supabase.functions.invoke("talkstay-knowledge", {
        body: { action: "scan_menu", hotelId, departmentKey, ...payload },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const scanned = ((data as { items?: { name: string; price: number | null }[] }).items ?? []);
      if (!scanned.length) {
        toast.message("No items found — try a clearer photo, or paste the text.");
        return;
      }
      // Photograph a menu twice, or scan an overlapping second page, and the
      // same dishes come back. Flag them visibly and untick them, rather than
      // dropping them silently — an item that vanishes looks like a bug, and
      // "why is this unticked?" is a fair question to be able to answer.
      // menuItemKey, not toLowerCase: "Club Sandwich." and "club  sandwich"
      // are the same dish, and only the normalised key catches that.
      const existing = new Set(
        itemsRef.current
          .filter((i) => (resolvedOutletId ? i.outlet_room_id === resolvedOutletId : !i.outlet_room_id)
            || !i.outlet_room_id)
          .map((i) => menuItemKey(i.name)),
      );
      const seenInScan = new Set<string>();
      const rows = scanned.map((i) => {
        const key = menuItemKey(i.name);
        const dupe = existing.has(key) || seenInScan.has(key);
        seenInScan.add(key);
        return { ...i, dupe, keep: !dupe };
      });
      setFound(rows);
      const dupes = rows.filter((r) => r.dupe).length;
      if (dupes) {
        toast.message(`${dupes} already on this menu — unticked so you don't add them twice.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that menu");
    } finally {
      setScanBusy(false);
    }
  };

  /** Photos go to vision; PDFs and documents are read to text first, reusing the
   *  same parsers Knowledge already uses for uploads. */
  const onScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanBusy(true);
    try {
      const lower = file.name.toLowerCase();
      const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|heic|heif|webp)$/.test(lower);

      if (isImage) {
        const path = `talkstay/${hotelId}/menu-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("logos").getPublicUrl(path);
        await runScan({ imageUrl: data.publicUrl });
        return;
      }

      let text: string;
      if (lower.endsWith(".pdf")) {
        const { parseClientPDF } = await import("@/utils/clientPDFParser");
        const result = await parseClientPDF(file, file.name);
        text = result.pages.map((p) => p.content).join("\n\n").trim();
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("fileName", file.name);
        const { data: parsed, error: pErr } = await supabase.functions.invoke("parse-document", { body: fd });
        if (pErr) throw new Error("Couldn't read that document.");
        text = ((parsed?.pages ?? []) as { content?: string }[]).map((p) => p.content || "").join("\n\n").trim();
      }
      if (text.length < 20) {
        throw new Error("No readable text in that file. If it's a scanned menu, photograph it instead.");
      }
      await runScan({ text });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setScanBusy(false);
    }
  };

  const saveFound = async () => {
    const keep = (found ?? []).filter((f) => f.keep && f.name.trim());
    if (!keep.length) return;
    setScanBusy(true);
    let added = 0;
    const failed: string[] = [];
    for (const f of keep) {
      try {
        const row = await addCatalogItem({
          hotelId,
          departmentKey,
          name: f.name,
          price: f.price,
          outletRoomId: resolvedOutletId,
        });
        setItems((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
        added++;
      } catch {
        failed.push(f.name);
      }
    }
    setScanBusy(false);
    setFound(null);
    setScanOpen(false);
    setPasted("");
    toast.success(
      failed.length
        ? `Added ${added} to ${outletName(resolvedOutletId)} — skipped ${failed.length} already on the menu.`
        : `Added ${added} to ${outletName(resolvedOutletId)}.`,
    );
  };

  const remove = async (item: CatalogItem) => {
    const before = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteCatalogItem(item.id);
    } catch (err) {
      setItems(before);
      toast.error(err instanceof Error ? err.message : "Couldn't remove that");
    }
  };

  const savePrice = async (item: CatalogItem, raw: string) => {
    const p = raw.trim() === "" ? null : Number(raw);
    if (p != null && (Number.isNaN(p) || p < 0)) { toast.error("Enter a valid price."); return; }
    if (p === item.price) return;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, price: p } : i));
    try {
      await updateCatalogItem(item.id, { price: p });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the price");
    }
  };

  return (
    <div className="pl-11">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        Menu / services
        {loaded && items.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{items.length}</span>
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-xl border bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">
            Staff tap these when logging a phone or walk-in order for {departmentName},
            instead of typing the name and price each time.
          </p>

          {outlets.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setOutletFilter("all")}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                    outletFilter === "all" ? "bg-violet-600 text-white" : "border bg-background text-muted-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setOutletFilter("shared")}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                    outletFilter === "shared" ? "bg-violet-600 text-white" : "border bg-background text-muted-foreground"
                  }`}
                >
                  Shared
                </button>
                {outlets.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setOutletFilter(o.id);
                      setTargetOutlet(o.id);
                    }}
                    className={`inline-flex max-w-[9rem] items-center gap-1 truncate rounded-lg px-2 py-1 text-[11px] font-medium ${
                      outletFilter === o.id ? "bg-sky-600 text-white" : "border bg-background text-muted-foreground"
                    }`}
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{formatRoomLabel(o.room_number)}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-dashed bg-background px-2.5 py-2">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Upload / add items to
                </label>
                <select
                  value={targetOutlet}
                  onChange={(e) => setTargetOutlet(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="shared">Shared (whole {departmentName})</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>{formatRoomLabel(o.room_number)}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Pick Outdoor Restaurant here before scanning that menu — Main stays separate.
                </p>
              </div>
            </div>
          )}

          {outlets.length === 0 && (
            <p className="rounded-lg border border-dashed bg-background px-2.5 py-2 text-[11px] text-muted-foreground">
              Link venue QRs (Main Restaurant, Outdoor Restaurant…) to this department under{" "}
              <span className="font-medium text-foreground">Rooms &amp; QR → Venues &amp; tables</span>{" "}
              to upload a separate menu per outlet.
            </p>
          )}

          {!loaded ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : visibleItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing on this menu yet.</p>
          ) : (
            <div className="divide-y rounded-lg border bg-background">
              {visibleItems.map((i) => (
                <div key={i.id} className="flex items-center gap-2 px-2.5 py-1.5">
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{i.name}</span>
                    {outlets.length > 0 && (
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {outletName(i.outlet_room_id)}
                      </span>
                    )}
                  </div>
                  <Input
                    type="number" min="0" step="0.01" inputMode="decimal"
                    defaultValue={i.price ?? ""}
                    placeholder="—"
                    className="h-8 w-20 shrink-0"
                    onBlur={(e) => void savePrice(i, e.target.value)}
                  />
                  <span className="hidden w-14 shrink-0 text-right text-xs text-muted-foreground sm:block">
                    {typeof i.price === "number" ? formatMoney(i.price, i.currency) : "—"}
                  </span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => void remove(i)} aria-label={`Remove ${i.name}`}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!scanOpen && !found && (
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:border-violet-300 hover:bg-violet-50/50 hover:text-foreground"
            >
              <Camera className="h-3.5 w-3.5" /> Scan or upload a menu to fill this in
            </button>
          )}

          {scanOpen && !found && (
            <div className="space-y-2 rounded-lg border bg-background p-2.5">
              {outlets.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Saving to <span className="font-medium text-foreground">{outletName(resolvedOutletId)}</span>
                  {" — "}change above if this is the other outlet&apos;s menu.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted">
                  <Camera className="h-3.5 w-3.5" />
                  Take a photo
                  <input
                    type="file" accept="image/*" capture="environment" className="hidden"
                    disabled={scanBusy} onChange={(e) => void onScanFile(e)}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted">
                  <FileUp className="h-3.5 w-3.5" />
                  Upload PDF / image / doc
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.rtf"
                    className="hidden"
                    disabled={scanBusy} onChange={(e) => void onScanFile(e)}
                  />
                </label>
                <span className="text-[11px] text-muted-foreground">or paste below</span>
                <button
                  type="button"
                  onClick={() => { setScanOpen(false); setPasted(""); }}
                  className="ml-auto text-[11px] text-muted-foreground underline hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <Textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={3}
                placeholder={"Club sandwich  £14\nHeineken 330ml  £6.50\nStill water  £3"}
                disabled={scanBusy}
              />
              <Button
                size="sm"
                disabled={scanBusy || !pasted.trim()}
                onClick={() => void runScan({ text: pasted })}
              >
                {scanBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Read menu
              </Button>
              {scanBusy && (
                <p className="text-[11px] text-muted-foreground">Reading the menu…</p>
              )}
            </div>
          )}

          {found && (
            <div className="space-y-2 rounded-lg border-2 border-violet-200 bg-violet-50/50 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-violet-950">
                  Found {found.length} — adding to {outletName(resolvedOutletId)}
                </p>
                <button
                  type="button"
                  onClick={() => { setFound(null); setScanOpen(false); setPasted(""); }}
                  className="text-[11px] text-violet-900/70 underline hover:text-violet-950"
                >
                  Discard
                </button>
              </div>
              <p className="text-[11px] text-violet-900/75">
                Prices are read from the menu, never guessed — anything unpriced is blank
                for you to fill. Anything already on this menu is flagged and unticked,
                so scanning the same menu twice adds nothing.
              </p>
              <div className="max-h-64 divide-y overflow-y-auto rounded-lg border bg-background">
                {found.map((f, idx) => (
                  <div key={`${f.name}-${idx}`} className="flex items-center gap-2 px-2.5 py-1.5">
                    <input
                      type="checkbox"
                      checked={f.keep}
                      onChange={(e) => setFound((prev) =>
                        (prev ?? []).map((x, i) => i === idx ? { ...x, keep: e.target.checked } : x))}
                      className="h-4 w-4 shrink-0"
                      aria-label={`Add ${f.name}`}
                    />
                    <div className="min-w-0 flex-1">
                      <Input
                        value={f.name}
                        onChange={(e) => setFound((prev) =>
                          (prev ?? []).map((x, i) => i === idx ? { ...x, name: e.target.value, dupe: false } : x))}
                        className="h-8 w-full"
                      />
                      {f.dupe && (
                        <span className="mt-0.5 block text-[10px] font-medium text-amber-700">
                          Already on this menu
                        </span>
                      )}
                    </div>
                    <Input
                      type="number" min="0" step="0.01" inputMode="decimal"
                      value={f.price ?? ""}
                      placeholder="—"
                      onChange={(e) => setFound((prev) =>
                        (prev ?? []).map((x, i) => i === idx
                          ? { ...x, price: e.target.value.trim() === "" ? null : Number(e.target.value) }
                          : x))}
                      className="h-8 w-20 shrink-0"
                    />
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                disabled={scanBusy || !found.some((f) => f.keep)}
                onClick={() => void saveFound()}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {scanBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                Add {found.filter((f) => f.keep).length} to {outletName(resolvedOutletId)}
              </Button>
            </div>
          )}

          <form onSubmit={add} className="flex flex-wrap items-center gap-2">
            <Input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Item name" className="h-8 min-w-0 flex-1 basis-[8rem]" maxLength={120}
            />
            <Input
              type="number" min="0" step="0.01" inputMode="decimal"
              value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="Price" className="h-8 w-20 shrink-0"
            />
            <Button type="submit" size="sm" disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
              Add
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
