import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import type { AccessibleProperty } from "@/talkstay/lib/hotels";

/** Sidebar property switcher — lists every hotel the user owns or staffs. */
export default function PropertySwitcher({
  properties,
  activeId,
  roleLabel,
  canAdd,
  onSelect,
  onAdd,
}: {
  properties: AccessibleProperty[];
  activeId: string;
  roleLabel: string;
  canAdd: boolean;
  onSelect: (p: AccessibleProperty) => void;
  onAdd?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = properties.find((p) => p.hotel.id === activeId) ?? properties[0];
  const multi = properties.length > 1;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!active) return null;

  return (
    <div ref={rootRef} className="relative mx-3 mb-2 space-y-1.5">
      <button
        type="button"
        onClick={() => multi && setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup={multi ? "listbox" : undefined}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition-colors ${
          multi ? "hover:bg-white/10" : "cursor-default"
        }`}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{active.hotel.name}</div>
          <div className="text-xs text-white/50">
            {roleLabel}
            {properties.length > 1 ? ` · ${properties.length} properties` : ""}
          </div>
        </div>
        {multi && (
          <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && multi && (
        <div
          className="absolute left-0 right-0 z-50 mt-0 overflow-hidden rounded-xl border border-white/15 bg-[#1c1628] shadow-xl"
          role="listbox"
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {properties.map((p) => {
              const on = p.hotel.id === activeId;
              const label = (() => {
                if (p.isOwner) return "Owner";
                if (p.departmentKey === "duty_manager") return "Duty Manager";
                if (p.role === "manager" && !p.departmentKey) return "Property manager";
                if (p.role === "manager" && p.departmentKey) return "Department manager";
                if (p.role === "manager") return "Manager";
                return "Staff";
              })();
              return (
                <button
                  key={p.hotel.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onSelect(p);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                    on ? "bg-violet-600/30 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.hotel.name}</div>
                    <div className="text-[11px] text-white/45">{label}</div>
                  </div>
                  {on && <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />}
                </button>
              );
            })}
          </div>
          {canAdd && onAdd && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAdd();
              }}
              className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2.5 text-sm font-medium text-violet-300 hover:bg-white/5"
            >
              <Plus className="h-4 w-4" /> Add property
            </button>
          )}
        </div>
      )}

      {/* Always visible for owners — don't bury behind the switcher chevron. */}
      {canAdd && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs font-medium text-violet-300 transition-colors hover:border-violet-400/50 hover:bg-white/5 hover:text-violet-200"
        >
          <Plus className="h-3.5 w-3.5" /> Add property
        </button>
      )}
    </div>
  );
}
