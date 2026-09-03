/**
 * Guest & location orders — room stays vs public property areas (lobby, bar, spa…).
 * Room number is never mandatory for every order: public QR units carry the location.
 * Payment options differ by verified stay context (is_public on the unit).
 *
 * Secure charge-to-room from public QR: only after check-in code proves an
 * occupied private room (never a typed room number).
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
  paymentTiming?: string | null;
  billingRoomId?: string | null;
}): string | null {
  if (!args.isChargeable) return null;
  const status = args.paymentStatus ?? "unpaid";
  if (status === "paid") return "Paid";
  if (status === "waived") return "Waived";
  if (status === "unpaid") {
    if (args.paymentTiming === "charge_to_room" || args.billingRoomId) return "Charge to room";
    return args.isPublic ? "Pay at counter" : "Charge to room";
  }
  return null;
}

export function folioPayCopy(kind: OrderLocationKind) {
  if (kind === "public") {
    return {
      emptyHint: "Food and drink from lobby, bar, restaurant, and other public areas appear here with prices as they’re added.",
      unpaidHintUnset:
        "Pay by card when available, pay at the counter, or charge to your room after entering the check-in code from reception.",
      unpaidHintPayNow: "We've asked the team to collect payment at your location.",
      unpaidHintDeferred: "You'll settle at the counter — or pay by card if offered.",
      unpaidHintChargeRoom: "Verified — these charges will go to your room bill.",
      payNowActive: "Team notified",
      payNowIdle: "Ask staff",
      deferActive: "At counter",
      deferIdle: "Pay at counter",
      chargeRoomActive: "On room bill",
      chargeRoomIdle: "Charge to room",
      payCardIdle: "Pay by card",
      payCardBusy: "Opening secure checkout…",
      payNowToast: "We've asked the team to collect payment.",
      deferToast: "We'll settle this at the counter.",
      chargeRoomToast: "Verified — charged to your room.",
      codeHint: "Enter the check-in code for your room (from reception or your room QR). We never ask for a room number alone.",
      codeSubmit: "Verify & charge to room",
      codeBad: "That code didn’t match an active stay. Check with reception.",
      codeLocked: "Too many attempts — try again in about 15 minutes or ask reception.",
    };
  }
  return {
    emptyHint: "Chargeable room service and extras will appear here with prices as they’re added.",
    unpaidHintUnset:
      "Pay by card when available, ask someone to collect in your room, or settle at the desk on checkout.",
    unpaidHintPayNow: "We've asked the team to collect payment in your room.",
    unpaidHintDeferred: "You'll settle this at checkout — charged to your room / desk.",
    unpaidHintChargeRoom: "You'll settle this at checkout — charged to your room / desk.",
    payNowActive: "Team notified",
    payNowIdle: "Ask staff",
    deferActive: "On room bill",
    deferIdle: "Charge to room",
    chargeRoomActive: "On room bill",
    chargeRoomIdle: "Charge to room",
    payCardIdle: "Pay by card",
    payCardBusy: "Opening secure checkout…",
    payNowToast: "We've asked the team to come collect payment.",
    deferToast: "We'll settle this at the desk on checkout.",
    chargeRoomToast: "We'll settle this at the desk on checkout.",
    codeHint: "",
    codeSubmit: "Verify & charge to room",
    codeBad: "That code didn’t match.",
    codeLocked: "Too many attempts — try again later.",
  };
}

export function logOrderChargeableLabel(isPublic: boolean): string {
  return isPublic
    ? "Chargeable (pay now / at counter / guest may verify stay to charge room)"
    : "Chargeable (bill to room / collect at checkout)";
}
