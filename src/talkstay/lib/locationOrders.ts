/**
 * Guest & location orders — room stays vs public property areas (lobby, bar, spa…).
 * Room number is never mandatory for every order: public QR units carry the location.
 * Payment options differ by verified stay context (is_public on the unit).
 */

export type OrderLocationKind = "room" | "public";

export function orderLocationKind(isPublic: boolean | null | undefined): OrderLocationKind {
  return isPublic ? "public" : "room";
}

/** Settlement chip for unpaid chargeables — aligns with ops filters. */
export function settlementLabel(args: {
  paymentStatus?: string | null;
  isPublic?: boolean | null;
  isChargeable?: boolean | null;
}): string | null {
  if (!args.isChargeable) return null;
  const status = args.paymentStatus ?? "unpaid";
  if (status === "paid") return "Paid";
  if (status === "waived") return "Waived";
  if (status === "unpaid") {
    return args.isPublic ? "Pay at counter" : "Charge to room";
  }
  return null;
}

export function folioPayCopy(kind: OrderLocationKind) {
  if (kind === "public") {
    return {
      emptyHint: "Food and drink from lobby, bar, restaurant, and other public areas appear here with prices as they’re added.",
      unpaidHintUnset:
        "Pay now (someone collects at your location) or pay at the counter when ready. Room charge isn’t available without an active stay.",
      unpaidHintPayNow: "We've asked the team to collect payment at your location.",
      unpaidHintDeferred: "You'll settle at the counter — no card needed in the app.",
      payNowActive: "Team notified",
      payNowIdle: "Pay now",
      deferActive: "At counter",
      deferIdle: "Pay at counter",
      payNowToast: "We've asked the team to collect payment.",
      deferToast: "We'll settle this at the counter.",
    };
  }
  return {
    emptyHint: "Chargeable room service and extras will appear here with prices as they’re added.",
    unpaidHintUnset:
      "Pay now (someone collects in your room), charge to your room, or settle at the desk on checkout. Online card pay isn’t wired yet.",
    unpaidHintPayNow: "We've asked the team to collect payment in your room.",
    unpaidHintDeferred: "You'll settle this at checkout — charged to your room / desk. No card needed in the app.",
    payNowActive: "Team notified",
    payNowIdle: "Pay now",
    deferActive: "On room bill",
    deferIdle: "Charge to room",
    payNowToast: "We've asked the team to come collect payment.",
    deferToast: "We'll settle this at the desk on checkout.",
  };
}

export function logOrderChargeableLabel(isPublic: boolean): string {
  return isPublic
    ? "Chargeable (pay now / at counter — not room bill)"
    : "Chargeable (bill to room / collect at checkout)";
}
