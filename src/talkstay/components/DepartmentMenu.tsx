import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ChevronDown } from "lucide-react";
import { formatMoney } from "@/talkstay/lib/statusStyles";
import {
  listCatalogItems, addCatalogItem, updateCatalogItem, deleteCatalogItem,
  type CatalogItem,
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
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    listCatalogItems(hotelId, departmentKey).then((rows) => {
      setItems(rows);
      setLoaded(true);
    });
  }, [open, loaded, hotelId, departmentKey]);

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
      const row = await addCatalogItem({ hotelId, departmentKey, name: clean, price: p });
      setItems((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      setName(""); setPrice("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that");
    } finally {
      setBusy(false);
    }
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
