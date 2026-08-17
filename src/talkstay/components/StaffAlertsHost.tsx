import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ChevronRight, AlertTriangle, Banknote, Bell, Clock, Pencil, XCircle } from "lucide-react";
import { useOpsQueue, useOpsRealtime } from "@/talkstay/hooks/useTalkStayQueries";
import { alertIncoming } from "@/talkstay/lib/alerts";
import { guestStayLabel } from "@/talkstay/lib/roomLabel";


/** What kind of alert this is. Colour alone can't carry the meaning — colour
 *  blindness, glare on a phone behind a bar — so every tone pairs a hue with
 *  its own icon, and the wording already says it too. */
export type AlertTone = "new" | "urgent" | "payment" | "remind" | "update" | "cancel";

const TONE: Record<AlertTone, { card: string; chip: string; Icon: typeof Bell }> = {
  // Brand violet = business as usual, a new request landed.
  new: {
    card: "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/70",
    chip: "bg-violet-600 text-white",
    Icon: Bell,
  },
  // Red is reserved for things that damage the stay if missed.
  urgent: {
    card: "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/70",
    chip: "bg-red-600 text-white",
    Icon: AlertTriangle,
  },
  // Money waiting to be collected — someone has to walk over with a card machine.
  payment: {
    card: "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/70",
    chip: "bg-emerald-600 text-white",
    Icon: Banknote,
  },
  // The guest is chasing: not yet a complaint, about to become one.
  remind: {
    card: "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/70",
    chip: "bg-amber-500 text-white",
    Icon: Clock,
  },
  // Order changed — act before it's made, not after.
  update: {
    card: "border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/70",
    chip: "bg-sky-600 text-white",
    Icon: Pencil,
  },
  // Stop work. Informational, so the calmest of the coloured tones.
  cancel: {
    card: "border-zinc-400 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900",
    chip: "bg-zinc-600 text-white",
    Icon: XCircle,
  },
};

/** A staff alert is only useful if it takes you to the thing it is about. The
 *  whole card is the target — hunting a small "Open" button on a phone, mid
 *  service, is the opposite of helpful. Falls back to a plain card when there
 *  is nothing specific to open. */
function alertToast(opts: {
  title: string;
  body: string;
  duration: number;
  tone: AlertTone;
  onOpen?: () => void;
}) {
  const { card, chip, Icon } = TONE[opts.tone];
  toast.custom((id) => {
    const inner = (
      <>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${chip}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{opts.title}</span>
          <span className="mt-0.5 block text-sm text-foreground/70">{opts.body}</span>
        </span>
        {opts.onOpen && (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" />
        )}
      </>
    );
    const shell = `flex w-full items-start gap-3 rounded-xl border-2 ${card} p-4 text-left shadow-lg`;
    return opts.onOpen ? (
      <button
        type="button"
        aria-label={`${opts.title} — open this request`}
        className={`${shell} transition-colors hover:bg-muted/60 active:bg-muted`}
        onClick={() => { opts.onOpen?.(); toast.dismiss(id); }}
      >
        {inner}
      </button>
    ) : (
      <div className={shell}>{inner}</div>
    );
  }, { duration: opts.duration });
}

/**
 * App-wide staff alerts — mounted for the whole dashboard so a chime + browser
 * notification still fire when the operator is on Insights/Staff/etc., not only
 * while Operations is open.
 */
export default function StaffAlertsHost({
  hotelId,
  departmentKey = null,
  onOpenRequest,
}: {
  hotelId: string;
  /** Null/undefined = watch every department (owner/manager). */
  departmentKey?: string | null;
  /** Opens the request's detail sheet — an alert you can't act on from is
   *  just noise, so both the toast and the OS notification land on the ticket. */
  onOpenRequest?: (requestId: string) => void;
}) {
  const openRef = useRef(onOpenRequest);
  openRef.current = onOpenRequest;
  useOpsRealtime(hotelId);
  const { data: queue } = useOpsQueue(hotelId, "3d");
  const seenIds = useRef<Set<string> | null>(null);
  const seenEscalations = useRef<Set<string> | null>(null);
  const watched = departmentKey ?? "all";
  const watchedRef = useRef(watched);
  watchedRef.current = watched;

  useEffect(() => {
    if (!queue) return;
    const list = queue.requests;

    if (seenIds.current) {
      const fresh = list.filter(
        (r) =>
          !seenIds.current!.has(r.id) &&
          r.status === "new" &&
          (watchedRef.current === "all" || r.department_key === watchedRef.current),
      );
      if (fresh.length) {
        const r = fresh[0];
        const title =
          fresh.length === 1
            ? `New request · ${guestStayLabel(r.guest_first_name, r.ts_rooms?.room_number, { locator: r.guest_locator })}`
            : `${fresh.length} new requests`;
        const body =
          fresh.length === 1
            ? (r.summary_staff || r.summary || "Open the queue to review.")
            : "Open the queue to review them.";
        void alertIncoming({
          title,
          body,
          tag: `req-${r.id}`,
          url: `/app?tab=operations&request=${r.id}`,
          urgent: !!r.is_complaint || r.priority === "urgent" || r.priority === "high",
        });
        const isUrgent = !!r.is_complaint || r.priority === "urgent" || r.priority === "high";
        alertToast({
          title,
          body,
          duration: 10_000,
          tone: isUrgent ? "urgent" : "new",
          onOpen: fresh.length === 1 && openRef.current
            ? () => openRef.current?.(r.id)
            : undefined,
        });
      }
    }
    seenIds.current = new Set(list.map((r) => r.id));

    if (seenEscalations.current) {
      const fresh = queue.escalationEvents.filter((e) => {
        if (seenEscalations.current!.has(e.id)) return false;
        const dept = list.find((r) => r.id === e.request_id)?.department_key;
        return watchedRef.current === "all" || dept === watchedRef.current;
      });
      if (fresh.length) {
        const e0 = fresh[0];
        const r0 = list.find((r) => r.id === e0.request_id);
        const kind = e0.kind
          ?? (e0.note?.toLowerCase().includes("pay now") || e0.note?.toLowerCase().includes("collect payment") ? "payment"
            : e0.note?.toLowerCase().includes("updated") ? "update"
            : e0.note?.toLowerCase().includes("remind") || e0.note?.toLowerCase().includes("waiting") ? "remind"
              : e0.note?.toLowerCase().includes("cancel") ? "cancel"
                : "followup");
        const title =
          kind === "payment" ? `Guest wants to pay · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number, { locator: r0?.guest_locator })}`
          : kind === "update" ? `Guest updated order · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number, { locator: r0?.guest_locator })}`
          : kind === "remind" ? `Guest reminded you · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number, { locator: r0?.guest_locator })}`
          : kind === "cancel" ? `Guest cancelled · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number, { locator: r0?.guest_locator })}`
          : `Guest followed up · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number, { locator: r0?.guest_locator })}`;
        const body = e0.note || r0?.summary_staff || r0?.summary || "A guest needs attention.";
        void alertIncoming({
          title,
          body,
          tag: `esc-${e0.id}`,
          url: e0.request_id ? `/app?tab=operations&request=${e0.request_id}` : "/app",
          urgent: true,
        });
        alertToast({
          title,
          body,
          duration: 12_000,
          tone: kind === "payment" ? "payment"
            : kind === "update" ? "update"
            : kind === "cancel" ? "cancel"
            : kind === "remind" ? "remind"
            : "urgent",
          onOpen: e0.request_id && openRef.current
            ? () => openRef.current?.(e0.request_id)
            : undefined,
        });
      }
    }
    seenEscalations.current = new Set(queue.escalationEvents.map((e) => e.id));
  }, [queue]);

  return null;
}
