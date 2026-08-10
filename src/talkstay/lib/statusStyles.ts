/**
 * Shared professional status colours for guest + staff surfaces.
 * Left-rail + soft wash on cards; pill badges for compact chips.
 */

export type RequestStatus =
  | "new"
  | "accepted"
  | "in_progress"
  | "on_the_way"
  | "completed"
  | "guest_confirmed"
  | "reopened"
  | "escalated"
  | "cancelled";

type StatusTone = {
  label: string;
  /** Compact pill (queue chips, tables). */
  badge: string;
  /** Soft card wash + left rail for list items. */
  card: string;
  /** Small status dot. */
  dot: string;
  /** Timeline / accent fill. */
  accent: string;
};

const FALLBACK: StatusTone = {
  label: "Unknown",
  badge: "border border-slate-200 bg-slate-100 text-slate-600",
  card: "border-slate-200 bg-slate-50/80 border-l-[3px] border-l-slate-400",
  dot: "bg-slate-400",
  accent: "bg-slate-400",
};

/** Canonical request lifecycle colours — same language guest ↔ ops ↔ insights. */
export const REQUEST_STATUS: Record<RequestStatus, StatusTone> = {
  new: {
    label: "Request received",
    badge: "border border-sky-200/70 bg-sky-100/70 text-sky-800 backdrop-blur-sm",
    card: "border-sky-200/50 bg-sky-100/35 border-l-[3px] border-l-sky-500",
    dot: "bg-sky-500",
    accent: "bg-sky-500",
  },
  accepted: {
    label: "Being prepared",
    badge: "border border-amber-200/70 bg-amber-100/70 text-amber-900 backdrop-blur-sm",
    card: "border-amber-200/50 bg-amber-100/35 border-l-[3px] border-l-amber-500",
    dot: "bg-amber-500",
    accent: "bg-amber-500",
  },
  in_progress: {
    label: "Being prepared",
    badge: "border border-amber-200/70 bg-amber-100/70 text-amber-900 backdrop-blur-sm",
    card: "border-amber-200/50 bg-amber-100/35 border-l-[3px] border-l-amber-500",
    dot: "bg-amber-500",
    accent: "bg-amber-500",
  },
  on_the_way: {
    label: "On the way",
    badge: "border border-teal-200/70 bg-teal-100/70 text-teal-900 backdrop-blur-sm",
    card: "border-teal-200/50 bg-teal-100/35 border-l-[3px] border-l-teal-500",
    dot: "bg-teal-500",
    accent: "bg-teal-500",
  },
  completed: {
    label: "Completed",
    badge: "border border-emerald-200/70 bg-emerald-100/70 text-emerald-800 backdrop-blur-sm",
    card: "border-emerald-200/50 bg-emerald-100/30 border-l-[3px] border-l-emerald-500",
    dot: "bg-emerald-500",
    accent: "bg-emerald-500",
  },
  guest_confirmed: {
    label: "Confirmed",
    badge: "border border-emerald-300/70 bg-emerald-100/75 text-emerald-900 backdrop-blur-sm",
    card: "border-emerald-300/50 bg-emerald-100/35 border-l-[3px] border-l-emerald-600",
    dot: "bg-emerald-600",
    accent: "bg-emerald-600",
  },
  reopened: {
    label: "Reopened",
    badge: "border border-orange-200/70 bg-orange-100/70 text-orange-900 backdrop-blur-sm",
    card: "border-orange-200/50 bg-orange-100/35 border-l-[3px] border-l-orange-500",
    dot: "bg-orange-500",
    accent: "bg-orange-500",
  },
  escalated: {
    label: "Escalated to manager",
    badge: "border border-rose-200/70 bg-rose-100/70 text-rose-800 backdrop-blur-sm",
    card: "border-rose-200/50 bg-rose-100/35 border-l-[3px] border-l-rose-500",
    dot: "bg-rose-500",
    accent: "bg-rose-500",
  },
  cancelled: {
    label: "Cancelled",
    badge: "border border-slate-300/70 bg-slate-100/70 text-slate-600 backdrop-blur-sm",
    card: "border-slate-300/50 bg-slate-100/40 border-l-[3px] border-l-slate-400",
    dot: "bg-slate-400",
    accent: "bg-slate-400",
  },
};

export function statusTone(status: string | null | undefined): StatusTone {
  if (status && status in REQUEST_STATUS) return REQUEST_STATUS[status as RequestStatus];
  return { ...FALLBACK, label: status?.replace(/_/g, " ") || FALLBACK.label };
}

export function statusBadge(status: string | null | undefined): string {
  return statusTone(status).badge;
}

export function statusCard(status: string | null | undefined): string {
  return statusTone(status).card;
}

export function statusDot(status: string | null | undefined): string {
  return statusTone(status).dot;
}

export function statusAccent(status: string | null | undefined): string {
  return statusTone(status).accent;
}

export function statusLabel(status: string | null | undefined): string {
  return statusTone(status).label;
}

/** Knowledge base scope chips — distinct from request lifecycle. */
export const KB_SCOPE_STYLE: Record<string, string> = {
  site: "border border-slate-300 bg-slate-100 text-slate-700",
  general: "border border-sky-200 bg-sky-100 text-sky-800",
  department: "border border-amber-200 bg-amber-100 text-amber-900",
  room: "border border-teal-200 bg-teal-100 text-teal-900",
};

export const KB_SCOPE_CARD: Record<string, string> = {
  site: "border-slate-200/50 bg-slate-100/30 border-l-[3px] border-l-slate-400",
  general: "border-sky-200/50 bg-sky-100/30 border-l-[3px] border-l-sky-500",
  department: "border-amber-200/50 bg-amber-100/30 border-l-[3px] border-l-amber-500",
  room: "border-teal-200/50 bg-teal-100/30 border-l-[3px] border-l-teal-500",
};

/** Room occupancy (stay session) chips. */
export const OCCUPANCY_STYLE: Record<string, string> = {
  vacant: "border border-slate-300 bg-slate-100 text-slate-600",
  occupied: "border border-emerald-200 bg-emerald-100 text-emerald-800",
};

/** Conversation intent chips (insights). */
export const INTENT_STYLE: Record<string, string> = {
  question: "border border-sky-200 bg-sky-100 text-sky-800",
  request: "border border-teal-200 bg-teal-100 text-teal-900",
  complaint: "border border-rose-200 bg-rose-100 text-rose-800",
  other: "border border-slate-200 bg-slate-100 text-slate-600",
  pulse_check: "border border-amber-200 bg-amber-100 text-amber-900",
};
