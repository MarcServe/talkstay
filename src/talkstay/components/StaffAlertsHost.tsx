import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useOpsQueue, useOpsRealtime } from "@/talkstay/hooks/useTalkStayQueries";
import { alertIncoming } from "@/talkstay/lib/alerts";
import { guestStayLabel } from "@/talkstay/lib/roomLabel";

/**
 * App-wide staff alerts — mounted for the whole dashboard so a chime + browser
 * notification still fire when the operator is on Insights/Staff/etc., not only
 * while Operations is open.
 */
export default function StaffAlertsHost({
  hotelId,
  departmentKey = null,
}: {
  hotelId: string;
  /** Null/undefined = watch every department (owner/manager). */
  departmentKey?: string | null;
}) {
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
            ? `New request · ${guestStayLabel(r.guest_first_name, r.ts_rooms?.room_number)}`
            : `${fresh.length} new requests`;
        const body =
          fresh.length === 1
            ? (r.summary_staff || r.summary || "Open the queue to review.")
            : "Open the queue to review them.";
        void alertIncoming({
          title,
          body,
          tag: `req-${r.id}`,
          url: "/app",
          urgent: !!r.is_complaint || r.priority === "urgent" || r.priority === "high",
        });
        toast.message(title, { description: body, duration: 10_000 });
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
          kind === "payment" ? `Guest wants to pay · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number)}`
          : kind === "update" ? `Guest updated order · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number)}`
          : kind === "remind" ? `Guest reminded you · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number)}`
          : kind === "cancel" ? `Guest cancelled · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number)}`
          : `Guest followed up · ${guestStayLabel(r0?.guest_first_name, r0?.ts_rooms?.room_number)}`;
        const body = e0.note || r0?.summary_staff || r0?.summary || "A guest needs attention.";
        void alertIncoming({
          title,
          body,
          tag: `esc-${e0.id}`,
          url: "/app",
          urgent: true,
        });
        toast.message(title, { description: body, duration: 12_000 });
      }
    }
    seenEscalations.current = new Set(queue.escalationEvents.map((e) => e.id));
  }, [queue]);

  return null;
}
