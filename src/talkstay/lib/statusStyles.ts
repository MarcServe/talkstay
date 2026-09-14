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
  | "cancelled"
  | "staff_note"
  | "forwarded"
  | "assigned"
  | "guest_updated"
  | "guest_reminded"
  | "payment_requested"
  | "staff_requested"
  | "guest_cancelled";

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
  badge: "border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-200",
  card: "border-slate-200 bg-slate-50/80 border-l-[3px] border-l-slate-400 dark:border-slate-400/30 dark:border-l-slate-400",
  dot: "bg-slate-400",
  accent: "bg-slate-400",
};

/** Canonical request lifecycle colours — same language guest ↔ ops ↔ insights. */
export const REQUEST_STATUS: Record<RequestStatus, StatusTone> = {
  new: {
    label: "Request received",
    badge: "border border-sky-200/70 bg-sky-100/70 text-sky-800 backdrop-blur-sm dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-200",
    card: "border-sky-200/50 bg-sky-100/35 border-l-[3px] border-l-sky-500 dark:border-sky-400/30 dark:bg-sky-400/15 dark:border-l-sky-400",
    dot: "bg-sky-500",
    accent: "bg-sky-500",
  },
  accepted: {
    label: "Being prepared",
    badge: "border border-amber-200/70 bg-amber-100/70 text-amber-900 backdrop-blur-sm dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200",
    card: "border-amber-200/50 bg-amber-100/35 border-l-[3px] border-l-amber-500 dark:border-amber-400/30 dark:bg-amber-400/15 dark:border-l-amber-400",
    dot: "bg-amber-500",
    accent: "bg-amber-500",
  },
  in_progress: {
    label: "Being prepared",
    badge: "border border-amber-200/70 bg-amber-100/70 text-amber-900 backdrop-blur-sm dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200",
    card: "border-amber-200/50 bg-amber-100/35 border-l-[3px] border-l-amber-500 dark:border-amber-400/30 dark:bg-amber-400/15 dark:border-l-amber-400",
    dot: "bg-amber-500",
    accent: "bg-amber-500",
  },
  on_the_way: {
    label: "On the way",
    badge: "border border-teal-200/70 bg-teal-100/70 text-teal-900 backdrop-blur-sm dark:border-teal-400/30 dark:bg-teal-400/15 dark:text-teal-200",
    card: "border-teal-200/50 bg-teal-100/35 border-l-[3px] border-l-teal-500 dark:border-teal-400/30 dark:bg-teal-400/15 dark:border-l-teal-400",
    dot: "bg-teal-500",
    accent: "bg-teal-500",
  },
  completed: {
    label: "Completed",
    badge: "border border-emerald-200/70 bg-emerald-100/70 text-emerald-800 backdrop-blur-sm dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-200",
    card: "border-emerald-200/50 bg-emerald-100/30 border-l-[3px] border-l-emerald-500 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:border-l-emerald-400",
    dot: "bg-emerald-500",
    accent: "bg-emerald-500",
  },
  guest_confirmed: {
    label: "Confirmed",
    badge: "border border-emerald-300/70 bg-emerald-100/75 text-emerald-900 backdrop-blur-sm dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-200",
    card: "border-emerald-300/50 bg-emerald-100/35 border-l-[3px] border-l-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:border-l-emerald-400",
    dot: "bg-emerald-600",
    accent: "bg-emerald-600",
  },
  reopened: {
    label: "Reopened",
    badge: "border border-orange-200/70 bg-orange-100/70 text-orange-900 backdrop-blur-sm dark:border-orange-400/30 dark:bg-orange-400/15 dark:text-orange-200",
    card: "border-orange-200/50 bg-orange-100/35 border-l-[3px] border-l-orange-500 dark:border-orange-400/30 dark:bg-orange-400/15 dark:border-l-orange-400",
    dot: "bg-orange-500",
    accent: "bg-orange-500",
  },
  escalated: {
    label: "Escalated to manager",
    badge: "border border-rose-200/70 bg-rose-100/70 text-rose-800 backdrop-blur-sm dark:border-rose-400/30 dark:bg-rose-400/15 dark:text-rose-200",
    card: "border-rose-200/50 bg-rose-100/35 border-l-[3px] border-l-rose-500 dark:border-rose-400/30 dark:bg-rose-400/15 dark:border-l-rose-400",
    dot: "bg-rose-500",
    accent: "bg-rose-500",
  },
  cancelled: {
    label: "Cancelled",
    badge: "border border-slate-300/70 bg-slate-100/70 text-slate-600 backdrop-blur-sm dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-200",
    card: "border-slate-300/50 bg-slate-100/40 border-l-[3px] border-l-slate-400 dark:border-slate-400/30 dark:bg-slate-400/15 dark:border-l-slate-400",
    dot: "bg-slate-400",
    accent: "bg-slate-400",
  },
  staff_note: {
    label: "Team note",
    badge: "border border-violet-200/70 bg-violet-100/70 text-violet-900 backdrop-blur-sm dark:border-violet-400/30 dark:bg-violet-400/15 dark:text-violet-200",
    card: "border-violet-200/50 bg-violet-100/30 border-l-[3px] border-l-violet-500 dark:border-violet-400/30 dark:bg-violet-400/15 dark:border-l-violet-400",
    dot: "bg-violet-500",
    accent: "bg-violet-500",
  },
  forwarded: {
    label: "Forwarded",
    badge: "border border-indigo-200/70 bg-indigo-100/70 text-indigo-900 backdrop-blur-sm dark:border-indigo-400/30 dark:bg-indigo-400/15 dark:text-indigo-200",
    card: "border-indigo-200/50 bg-indigo-100/30 border-l-[3px] border-l-indigo-500 dark:border-indigo-400/30 dark:bg-indigo-400/15 dark:border-l-indigo-400",
    dot: "bg-indigo-500",
    accent: "bg-indigo-500",
  },
  assigned: {
    label: "Handler set",
    badge: "border border-teal-200/70 bg-teal-100/70 text-teal-900 backdrop-blur-sm dark:border-teal-400/30 dark:bg-teal-400/15 dark:text-teal-200",
    card: "border-teal-200/50 bg-teal-100/30 border-l-[3px] border-l-teal-500 dark:border-teal-400/30 dark:bg-teal-400/15 dark:border-l-teal-400",
    dot: "bg-teal-500",
    accent: "bg-teal-500",
  },
  guest_updated: {
    label: "Guest updated order",
    badge: "border border-amber-200/70 bg-amber-100/70 text-amber-950 backdrop-blur-sm dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200",
    card: "border-amber-200/50 bg-amber-100/35 border-l-[3px] border-l-amber-500 dark:border-amber-400/30 dark:bg-amber-400/15 dark:border-l-amber-400",
    dot: "bg-amber-500",
    accent: "bg-amber-500",
  },
  guest_reminded: {
    label: "Guest reminded you",
    badge: "border border-rose-200/70 bg-rose-100/70 text-rose-800 backdrop-blur-sm dark:border-rose-400/30 dark:bg-rose-400/15 dark:text-rose-200",
    card: "border-rose-200/50 bg-rose-100/35 border-l-[3px] border-l-rose-500 dark:border-rose-400/30 dark:bg-rose-400/15 dark:border-l-rose-400",
    dot: "bg-rose-500",
    accent: "bg-rose-500",
  },
  staff_requested: {
    // Amber like the other "guest is waiting on you" events, distinct from the
    // rose used for complaints — someone standing there isn't a complaint yet.
    label: "Guest asked for someone",
    badge: "border border-amber-300/70 bg-amber-100/70 text-amber-950 backdrop-blur-sm dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200",
    card: "border-amber-300/50 bg-amber-100/40 border-l-[3px] border-l-amber-600 dark:border-amber-400/30 dark:bg-amber-400/15 dark:border-l-amber-400",
    dot: "bg-amber-600",
    accent: "bg-amber-600",
  },
  payment_requested: {
    label: "Guest wants to pay now",
    badge: "border border-amber-300/70 bg-amber-100/70 text-amber-950 backdrop-blur-sm dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200",
    card: "border-amber-300/50 bg-amber-100/40 border-l-[3px] border-l-amber-600 dark:border-amber-400/30 dark:bg-amber-400/15 dark:border-l-amber-400",
    dot: "bg-amber-600",
    accent: "bg-amber-600",
  },
  guest_cancelled: {
    label: "Guest cancelled",
    badge: "border border-slate-300/70 bg-slate-100/70 text-slate-700 backdrop-blur-sm dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-200",
    card: "border-slate-300/50 bg-slate-100/40 border-l-[3px] border-l-slate-500 dark:border-slate-400/30 dark:bg-slate-400/15 dark:border-l-slate-400",
    dot: "bg-slate-500",
    accent: "bg-slate-500",
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
  site: "border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-200",
  general: "border border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-200",
  department: "border border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200",
  room: "border border-teal-200 bg-teal-100 text-teal-900 dark:border-teal-400/30 dark:bg-teal-400/15 dark:text-teal-200",
};

export const KB_SCOPE_CARD: Record<string, string> = {
  site: "border-slate-200/50 bg-slate-100/30 border-l-[3px] border-l-slate-400 dark:border-slate-400/30 dark:bg-slate-400/15 dark:border-l-slate-400",
  general: "border-sky-200/50 bg-sky-100/30 border-l-[3px] border-l-sky-500 dark:border-sky-400/30 dark:bg-sky-400/15 dark:border-l-sky-400",
  department: "border-amber-200/50 bg-amber-100/30 border-l-[3px] border-l-amber-500 dark:border-amber-400/30 dark:bg-amber-400/15 dark:border-l-amber-400",
  room: "border-teal-200/50 bg-teal-100/30 border-l-[3px] border-l-teal-500 dark:border-teal-400/30 dark:bg-teal-400/15 dark:border-l-teal-400",
};

/** Room occupancy (stay session) chips. */
export const OCCUPANCY_STYLE: Record<string, string> = {
  vacant: "border border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-200",
  occupied: "border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-200",
};

/** Chargeable order settlement chips. */
export const PAYMENT_STYLE: Record<string, string> = {
  unpaid: "border border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200",
  paid: "border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-200",
  waived: "border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-200",
};

export function paymentLabel(status: string | null | undefined): string {
  if (status === "paid") return "Paid";
  if (status === "waived") return "Waived";
  if (status === "unpaid") return "Unpaid";
  return "—";
}

export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined = "GBP",
): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  const cur = (currency || "GBP").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(Number(amount));
  } catch {
    return `${Number(amount).toFixed(2)} ${cur}`;
  }
}

/** Conversation intent chips (insights). */
export const INTENT_STYLE: Record<string, string> = {
  question: "border border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-200",
  request: "border border-teal-200 bg-teal-100 text-teal-900 dark:border-teal-400/30 dark:bg-teal-400/15 dark:text-teal-200",
  complaint: "border border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/15 dark:text-rose-200",
  other: "border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-200",
  pulse_check: "border border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200",
};
