import { DEPARTMENTS, propertyTypeLabel, type PropertyProfile, type PropertyType } from "@/talkstay/lib/hotels";

export type BiTone = "strong" | "steady" | "watch" | "thin";

export interface BiDeptStat {
  key: string;
  name: string;
  count: number;
  chargeable: number;
  complaints: number;
  completed: number;
}

export interface BiSnapshot {
  periodLabel: string;
  tone: BiTone;
  headline: string;
  summary: string;
  highlights: string[];
  risks: string[];
  actions: string[];
  stats: {
    requests: number;
    completed: number;
    completionPct: number;
    chargeable: number;
    revenueProxy: number | null;
    avgRating: number | null;
    ratingCount: number;
    complaints: number;
    avgAcceptMin: number | null;
    avgCompleteMin: number | null;
    guests: number;
    questions: number;
    pulseNegRate: number | null;
    pulseCount: number;
  };
  topDepts: BiDeptStat[];
  propertyContext: string;
}

export interface BiInputRow {
  department_key: string;
  status: string;
  is_complaint: boolean;
  is_chargeable?: boolean | null;
  price?: number | null;
  isDone: boolean;
  toAcceptMin: number | null;
  toCompleteMin: number | null;
}

const deptName = (k: string) => DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;

function scaleBand(rooms: number | null, properties: number | null): "micro" | "small" | "mid" | "large" {
  const r = rooms ?? 0;
  const p = properties ?? 1;
  if (p >= 5 || r >= 80) return "large";
  if (r >= 25 || p >= 3) return "mid";
  if (r >= 8) return "small";
  return "micro";
}

export function describePropertyContext(
  profile: PropertyProfile | null | undefined,
  qrRoomCount?: number | null,
): string {
  const type = propertyTypeLabel(profile?.type);
  const rooms = profile?.room_count ?? qrRoomCount ?? null;
  const props = profile?.property_count ?? null;
  const place = [profile?.city, profile?.region, profile?.country].filter(Boolean).join(", ")
    || profile?.address
    || null;

  const bits: string[] = [type];
  if (rooms != null && rooms > 0) bits.push(`${rooms} room${rooms === 1 ? "" : "s"}`);
  if (props != null && props > 1) bits.push(`${props}-property portfolio`);
  if (place) bits.push(place);
  return bits.join(" · ");
}

function toneFor(stats: BiSnapshot["stats"], hasFilters: boolean): BiTone {
  if (stats.requests === 0 && stats.guests === 0) return "thin";
  const ratingOk = stats.avgRating == null || stats.avgRating >= 4;
  const completionOk = stats.requests === 0 || stats.completionPct >= 70;
  const speedOk = stats.avgAcceptMin == null || stats.avgAcceptMin <= 20;
  const pulseOk = stats.pulseNegRate == null || stats.pulseNegRate <= 35;
  const complaintHeavy = stats.requests > 0 && stats.complaints / stats.requests >= 0.25;
  if ((!ratingOk || !completionOk || !speedOk || !pulseOk || complaintHeavy) && !hasFilters) return "watch";
  if (stats.chargeable >= 5 && ratingOk && completionOk) return "strong";
  if (stats.requests >= 8 && completionOk && ratingOk) return "strong";
  return "steady";
}

function actionsFor(
  type: PropertyType | null | undefined,
  scale: ReturnType<typeof scaleBand>,
  stats: BiSnapshot["stats"],
  top: BiDeptStat[],
  place: string | null,
): string[] {
  const out: string[] = [];
  const lead = top[0];
  const kitchen = top.find((d) => d.key === "kitchen");
  const bar = top.find((d) => d.key === "bar");
  const hk = top.find((d) => d.key === "housekeeping");
  const maint = top.find((d) => d.key === "maintenance");

  if (stats.requests === 0) {
    out.push("Promote the in-room QR on check-in and at the front desk so guests know they can order and ask without calling.");
    if (type === "airbnb" || scale === "micro") {
      out.push("Add a short welcome note in the listing or guidebook: “Scan the TalkStay code for menus, towels, and local tips.”");
    } else {
      out.push("Brief night and breakfast teams to point guests to TalkStay for F&B — it captures chargeable demand you’d otherwise miss.");
    }
    return out.slice(0, 4);
  }

  if (lead && lead.chargeable > 0) {
    out.push(
      `${lead.name} is carrying most paid volume — keep that menu/card current and train staff to confirm orders in-app so nothing is double-booked.`,
    );
  } else if (lead) {
    out.push(
      `${lead.name} is the busiest lane — check staffing coverage for peak hours and whether guests are waiting too long to accept.`,
    );
  }

  if (bar && kitchen) {
    if (bar.count > kitchen.count * 1.2) {
      out.push("Bar outpaced kitchen — pair drink specials with a simple food upsell (sharing plate / late snack) to lift average check.");
    } else if (kitchen.count > bar.count * 1.2) {
      out.push("Kitchen led volume — add a drinks pairing prompt on popular dishes or a happy-hour push to balance the till.");
    } else {
      out.push("Kitchen and bar are both active — that’s a healthy F&B mix; protect response times so neither queue becomes the bottleneck.");
    }
  } else if (bar && bar.chargeable) {
    out.push("Bar is a clear earner — feature 2–3 signature serves on the guest assistant knowledge card this week.");
  } else if (kitchen && kitchen.chargeable) {
    out.push("Kitchen is driving paid orders — highlight bestsellers and prep times so the assistant sets guest expectations.");
  }

  if (stats.avgAcceptMin != null && stats.avgAcceptMin > 15) {
    out.push(
      scale === "micro" || type === "airbnb"
        ? "Accept times are slow for a small operation — turn on phone alerts for the host on duty and keep the app installed on the home screen."
        : "Average accept time is high — review who is on which department and whether night coverage needs a duty manager fallback.",
    );
  }

  if (stats.completionPct < 70 && stats.requests >= 4) {
    out.push("Completion rate is soft — chase open tickets daily and use Log order for phone/walk-in so the board stays the single source of truth.");
  }

  if (stats.avgRating != null && stats.avgRating < 4 && stats.ratingCount >= 3) {
    out.push("Guest ratings dipped — open the lowest-rated rows, fix the recurring theme, and reply personally where a name/room is known.");
  }

  if (stats.pulseNegRate != null && stats.pulseNegRate > 30 && stats.pulseCount >= 3) {
    out.push("Stay pulse negativity is elevated — treat open pulses as early warnings before checkout reviews land.");
  }

  if (hk && hk.complaints > 0) {
    out.push("Housekeeping complaints showed up — spot-check the rooms named in Insights and tighten turnaround standards for the next arrivals.");
  }
  if (maint && maint.count >= 3) {
    out.push("Maintenance volume is notable — batch similar tickets (AC, plumbing, Wi‑Fi) and communicate ETA in-app so guests don’t re-ask.");
  }

  if (type === "airbnb" || type === "bnb") {
    out.push(
      place
        ? `For a ${propertyTypeLabel(type)} in ${place}, lean the knowledge base toward local dining, transport, and house rules — questions often outnumber room service.`
        : "For a short-let / B&B, keep local tips and house rules sharp in Content — guests ask those more than hotel-style room service.",
    );
  } else if (type === "hotel" && (scale === "mid" || scale === "large")) {
    out.push("At hotel scale, compare department load weekly and move float staff toward the busiest chargeable lane before weekends.");
  }

  if (stats.chargeable === 0 && stats.requests >= 5) {
    out.push("Lots of activity but little marked chargeable — confirm menus are in knowledge and that staff log paid phone orders so sales show up in Insights.");
  }

  // Dedupe-ish and cap
  return [...new Set(out)].slice(0, 5);
}

/** Build a manager-facing BI brief from the currently filtered Insights slice. */
export function buildBusinessIntelligence(input: {
  periodLabel: string;
  rows: BiInputRow[];
  guests: number;
  questions: number;
  avgRating: number | null;
  ratingCount: number;
  pulseCount: number;
  pulseNegRate: number | null;
  profile?: PropertyProfile | null;
  qrRoomCount?: number | null;
  filterNote?: string | null;
}): BiSnapshot {
  const rows = input.rows;
  const completed = rows.filter((r) => r.isDone).length;
  const chargeable = rows.filter((r) => r.is_chargeable).length;
  const complaints = rows.filter((r) => r.is_complaint).length;
  const prices = rows.map((r) => r.price).filter((n): n is number => typeof n === "number" && n > 0);
  const revenueProxy = prices.length ? prices.reduce((a, b) => a + b, 0) : null;
  const accept = rows.map((r) => r.toAcceptMin).filter((n): n is number => n != null && n >= 0);
  const complete = rows.filter((r) => r.isDone).map((r) => r.toCompleteMin).filter((n): n is number => n != null && n >= 0);
  const avgAcceptMin = accept.length ? accept.reduce((a, b) => a + b, 0) / accept.length : null;
  const avgCompleteMin = complete.length ? complete.reduce((a, b) => a + b, 0) / complete.length : null;
  const completionPct = rows.length ? Math.round((completed / rows.length) * 100) : 0;

  const byDept = new Map<string, BiDeptStat>();
  for (const r of rows) {
    const cur = byDept.get(r.department_key) ?? {
      key: r.department_key,
      name: deptName(r.department_key),
      count: 0,
      chargeable: 0,
      complaints: 0,
      completed: 0,
    };
    cur.count += 1;
    if (r.is_chargeable) cur.chargeable += 1;
    if (r.is_complaint) cur.complaints += 1;
    if (r.isDone) cur.completed += 1;
    byDept.set(r.department_key, cur);
  }
  const topDepts = [...byDept.values()].sort((a, b) => b.count - a.count || b.chargeable - a.chargeable);

  const stats: BiSnapshot["stats"] = {
    requests: rows.length,
    completed,
    completionPct,
    chargeable,
    revenueProxy,
    avgRating: input.avgRating,
    ratingCount: input.ratingCount,
    complaints,
    avgAcceptMin,
    avgCompleteMin,
    guests: input.guests,
    questions: input.questions,
    pulseNegRate: input.pulseNegRate,
    pulseCount: input.pulseCount,
  };

  const hasFilters = !!input.filterNote;
  const tone = toneFor(stats, hasFilters);
  const rooms = input.profile?.room_count ?? input.qrRoomCount ?? null;
  const scale = scaleBand(rooms, input.profile?.property_count ?? null);
  const place = [input.profile?.city, input.profile?.country].filter(Boolean).join(", ") || null;
  const propertyContext = describePropertyContext(input.profile, input.qrRoomCount);

  const highlights: string[] = [];
  const risks: string[] = [];

  if (rows.length === 0) {
    highlights.push(`No service requests in this ${input.periodLabel.toLowerCase()} slice yet.`);
  } else {
    const lead = topDepts[0];
    if (lead) {
      const share = Math.round((lead.count / rows.length) * 100);
      if (lead.chargeable > 0) {
        highlights.push(
          `${lead.name} led activity (${lead.count} requests, ${share}% of volume) and looks like your main earning lane this period.`,
        );
      } else {
        highlights.push(`${lead.name} handled the most volume (${lead.count} · ${share}%).`);
      }
    }
    if (topDepts[1]) {
      const second = topDepts[1];
      const vibe = second.chargeable > 0 ? "solid paid demand" : "steady traffic";
      highlights.push(`${second.name} was next with ${second.count} — ${vibe}.`);
    }
    if (chargeable > 0) {
      highlights.push(
        revenueProxy != null
          ? `${chargeable} chargeable orders logged (≈ ${revenueProxy.toLocaleString(undefined, { maximumFractionDigits: 0 })} on priced lines).`
          : `${chargeable} chargeable orders logged — treat that as your TalkStay sales pulse.`,
      );
    }
    if (completionPct >= 80) highlights.push(`Completion is healthy at ${completionPct}%.`);
    if (input.avgRating != null && input.avgRating >= 4.3 && input.ratingCount >= 2) {
      highlights.push(`Guests rated you ${input.avgRating.toFixed(1)}★ across ${input.ratingCount} reviews.`);
    }
  }

  if (input.guests > 0) {
    highlights.push(`${input.guests} guest${input.guests === 1 ? "" : "s"} engaged via the assistant (${input.questions} questions answered).`);
  }

  if (complaints > 0) risks.push(`${complaints} complaint-flagged request${complaints === 1 ? "" : "s"} in this view.`);
  if (completionPct < 70 && rows.length >= 4) risks.push(`Only ${completionPct}% of requests completed.`);
  if (avgAcceptMin != null && avgAcceptMin > 20) {
    risks.push(`Average accept time ~${Math.round(avgAcceptMin)} minutes — guests may feel ignored.`);
  }
  if (input.avgRating != null && input.avgRating < 4 && input.ratingCount >= 2) {
    risks.push(`Average rating ${input.avgRating.toFixed(1)}★ needs attention.`);
  }
  if (input.pulseNegRate != null && input.pulseNegRate > 30) {
    risks.push(`Stay pulse negative share ~${input.pulseNegRate}% this window.`);
  }

  let headline: string;
  if (tone === "thin") {
    headline = "Quiet — not enough signal yet";
  } else if (tone === "strong") {
    headline = chargeable >= 5 ? "Strong sales pulse" : "Busy and performing well";
  } else if (tone === "watch") {
    headline = "Mixed — a few things to fix";
  } else {
    headline = "Steady — room to grow";
  }

  const leadBit = topDepts[0]
    ? `${topDepts[0].name} led${topDepts[0].chargeable ? " earnings" : ""}.`
    : "";
  const filterBit = input.filterNote ? ` · ${input.filterNote}` : "";
  const summary =
    tone === "thin"
      ? `Little guest activity in the last ${input.periodLabel.toLowerCase()}.${filterBit}`
      : `${rows.length} requests${chargeable ? ` · ${chargeable} paid` : ""} · ${completionPct}% done · ${input.guests} guests. ${leadBit}${filterBit}`;

  const actions = actionsFor(input.profile?.type, scale, stats, topDepts, place).slice(0, 3);

  return {
    periodLabel: input.periodLabel,
    tone,
    headline,
    summary,
    highlights: highlights.slice(0, 3),
    risks: risks.slice(0, 2),
    actions,
    stats,
    topDepts: topDepts.slice(0, 5),
    propertyContext,
  };
}
