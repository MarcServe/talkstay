import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ChevronDown, Camera, Check, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/talkstay/lib/statusStyles";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listCatalogItems, addCatalogItem, updateCatalogItem, deleteCatalogItem, menuItemKey,
  listRooms, type CatalogItem, type Room,
} from "@/talkstay/lib/hotels";

/**
 * The tappable menu for one department — what Log order shows instead of making
 * staff type "2 club sandwiches" mid-service. Collapsed by default so the
 * Departments page stays scannable when a bar has forty items.
 */
export default function DepartmentMenu({
  hotelId, departmentKey, departmentName,
}: {
  hotelId: string; departmentKey: string; departmentName: string;
}) {
  const [open, setOpen] = useState(false);
  // Which outlet's list is being edited. "" = department-wide (every outlet).
  const [outlets, setOutlets] = useState<Room[]>([]);
  const [outletId, setOutletId] = useState<string>("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Read inside async scan handlers, which outlive the render that started them.
  const itemsRef = useRef<CatalogItem[]>([]);
  itemsRef.current = items;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
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
    if (!open) return;
    setLoaded(false);
    listCatalogItems(hotelId, departmentKey, { roomId: outletId || null, outletOnly: true })
      .then((rows) => { setItems(rows); setLoaded(true); });
  }, [open, hotelId, departmentKey, outletId]);

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
      const row = await addCatalogItem({ hotelId, departmentKey, name: clean, price: p, roomId: outletId || null });
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
      const items = ((data as { items?: { name: string; price: number | null }[] }).items ?? []);
      if (!items.length) {
        toast.message("No items found — try a clearer photo, or paste the text.");
        return;
      }
      // Photograph a menu twice, or scan an overlapping second page, and the
      // same dishes come back. Flag them visibly and untick them, rather than
      // dropping them silently — an item that vanishes looks like a bug, and
      // "why is this unticked?" is a fair question to be able to answer.
      const existing = new Set(itemsRef.current.map((i) => menuItemKey(i.name)));
      const seenInScan = new Set<string>();
      const rows = items.map((i) => {
        const key = menuItemKey(i.name);
        const dupe = existing.has(key) || seenInScan.has(key);
        seenInScan.add(key);
        return { ...i, dupe, keep: !dupe };
      });
      setFound(rows);
      const dupes = rows.filter((r) => r.dupe).length;
      if (dupes) {
        toast.message(
          `${dupes} already on this menu — unticked so you don't add them twice.`,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that menu");
    } finally {
      setScanBusy(false);
    }
  };

  /** Photos go to vision; PDFs and documents are read to text first, reusing the
   *  same parsers Knowledge already uses for uploads. A menu arrives as whatever
   *  the property happens to have — a phone snap, the PDF from their designer,
   *  or a Word doc from the kitchen. */
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
        // Browser-side pdf.js — the same route Knowledge uses, because
        // parse-document was unreliable for PDFs.
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
        // A scanned-image PDF has no text layer — say so, rather than
        // returning "no items found" and leaving them guessing.
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
        const row = await addCatalogItem({ hotelId, departmentKey, name: f.name, price: f.price, roomId: outletId || null });
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
        ? `Added ${added} — skipped ${failed.length} already on the menu.`
        : `Added ${added} item${added === 1 ? "" : "s"}.`,
    );
  };

  const remove = async (item: CatalogItem) => {
    const before = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteCatalogItem(item.id);
    } catch (err) {
      setItems(before); // put it back rather than lie about the delete
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
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background px-2.5 py-2">
              <span className="text-xs text-muted-foreground">Menu for</span>
              <Select value={outletId || "__all__"} onValueChange={(v) => setOutletId(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All areas (whole department)</SelectItem>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.room_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                {outletId
                  ? "Only this area — use it for different prices at, say, the pool bar."
                  : "Offered everywhere this department serves."}
              </span>
            </div>
          )}

          {!loaded ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing on this menu yet.</p>
          ) : (
            <div className="divide-y rounded-lg border bg-background">
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{i.name}</span>
                  <Input
                    type="number" min="0" step="0.01" inputMode="decimal"
                    defaultValue={i.price ?? ""}
                    placeholder="—"
                    className="h-8 w-24"
                    onBlur={(e) => void savePrice(i, e.target.value)}
                  />
                  <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                    {typeof i.price === "number" ? formatMoney(i.price, i.currency) : "no price"}
                  </span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void remove(i)} aria-label={`Remove ${i.name}`}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Import — nothing is written until it's reviewed below. */}
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
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted">
                  <Camera className="h-3.5 w-3.5" />
                  Take a photo
                  <input
                    type="file" accept="image/*" capture="environment" className="hidden"
                    disabled={scanBusy} onChange={(e) => void onScanFile(e)}
                  />
                </label>
                {/* No capture attribute here, so the OS offers Files and Photos
                    as well — a menu is as often a PDF as a snapshot. */}
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
                  Found {found.length} item{found.length === 1 ? "" : "s"} — check before adding
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
                      className="h-8 w-24"
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
                Add {found.filter((f) => f.keep).length} to menu
              </Button>
            </div>
          )}

          <form onSubmit={add} className="flex flex-wrap items-center gap-2">
            <Input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Item (e.g. Club sandwich)" className="h-8 w-52" maxLength={120}
            />
            <Input
              type="number" min="0" step="0.01" inputMode="decimal"
              value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="Price" className="h-8 w-24"
            />
            <Button type="submit" size="sm" disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
              Add
            </Button>
            <span className="text-[11px] text-muted-foreground">Leave price blank if it varies.</span>
          </form>
        </div>
      )}
    </div>
  );
}
