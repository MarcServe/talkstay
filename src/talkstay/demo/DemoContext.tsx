import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import type {
  InsightsData, OpsQueueData, OpsTimeRange, RequestDetailData,
} from "@/talkstay/lib/data";
import type { Hotel } from "@/talkstay/lib/hotels";
import {
  DEMO_ACTOR,
  DEMO_SESSION_KEY,
  ackDemoPulse,
  addDemoGuestPulse,
  addDemoGuestRequest,
  addDemoKnowledge,
  addDemoRoom,
  addDemoStaff,
  advanceDemoRequest,
  assignDemoStaffDepartment,
  clearPersistedDemoState,
  createInitialDemoState,
  escalateDemoRequest,
  getDemoOpsQueue,
  getDemoRequestDetail,
  guestCancelDemoRequest,
  guestConfirmDemoRequest,
  guestNudgeDemoRequest,
  guestRateDemoRequest,
  guestReopenDemoRequest,
  guestUpdateDemoRequest,
  listDemoStaffMessagesForGuest,
  loadPersistedDemoState,
  patchDemoDepartment,
  persistDemoState,
  regenerateDemoCheckinCode,
  removeDemoKnowledge,
  removeDemoRoom,
  removeDemoStaff,
  replyDemoRequest,
  setDemoRequireCheckinCode,
  toggleDemoDepartment,
  toggleDemoRoomOccupancy,
  updateDemoBranding,
  type DemoState,
} from "@/talkstay/demo/demoStore";

export type DemoApi = {
  hotel: Hotel;
  actor: string;
  state: DemoState;
  version: number;
  getOpsQueue: (timeRange: OpsTimeRange) => OpsQueueData;
  getRequestDetail: (requestId: string) => RequestDetailData | null;
  getInsights: () => InsightsData;
  advance: (requestId: string, to: string, opts?: { cancelReason?: string }) => void;
  escalate: (requestId: string) => void;
  reply: (requestId: string, body: string) => void;
  ackPulse: (pulseId: string) => void;
  updateBranding: (patch: {
    primary_color?: string;
    tagline?: string;
    logo_url?: string | null;
    guest_bg_wash?: number;
    property?: NonNullable<Hotel["branding"]>["property"];
  }) => void;
  addRoom: (room_number: string, floor: string | null) => void;
  removeRoom: (roomId: string) => void;
  toggleRoomOccupancy: (roomId: string) => void;
  setRequireCheckinCode: (require: boolean) => void;
  regenerateCheckinCode: (roomId: string) => string | null;
  addStaff: (row: { name: string; email: string; department_key: string | null; role: string }) => void;
  removeStaff: (staffId: string) => void;
  assignStaffDepartment: (staffId: string, department_key: string | null) => void;
  toggleDepartment: (deptId: string) => void;
  patchDepartment: (
    deptId: string,
    patch: Partial<{ display_name: string; is_active: boolean; notify_email: string | null; escalate_after_minutes: number }>,
  ) => void;
  addKnowledge: (
    title: string,
    preview: string,
    opts?: { scope?: "site" | "general" | "department" | "room"; department_key?: string | null; kind?: string },
  ) => void;
  removeKnowledge: (id: string) => void;
  /** Guest demo → ops queue. Returns the new request id. */
  addGuestRequest: (input: { summary: string; department?: string }) => string;
  guestConfirm: (requestId: string) => void;
  guestReopen: (requestId: string) => void;
  guestCancel: (requestId: string, reason?: string) => void;
  guestNudge: (requestId: string) => void;
  guestUpdate: (requestId: string, note: string) => void;
  guestRate: (requestId: string, rating: number, comment?: string) => void;
  guestPulse: (input: { rating: number; text?: string }) => void;
  listStaffMessagesForGuest: () => ReturnType<typeof listDemoStaffMessagesForGuest>;
  reset: () => void;
};

const DemoContext = createContext<DemoApi | null>(null);

export function useDemo(): DemoApi | null {
  return useContext(DemoContext);
}

export function useIsDemo(): boolean {
  return !!useContext(DemoContext);
}

export function hasEnteredDemo(): boolean {
  try {
    return sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDemoEntered() {
  try {
    sessionStorage.setItem(DEMO_SESSION_KEY, "1");
  } catch { /* private browsing */ }
}

export function clearDemoEntered() {
  try {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch { /* ignore */ }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => loadPersistedDemoState() ?? createInitialDemoState());

  useEffect(() => {
    persistDemoState(state);
  }, [state]);

  // Another demo tab (guest ↔ ops) wrote to sessionStorage — pick it up.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "talkstay:demo-state-v3" || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as DemoState;
        if (parsed?.hotel?.id) setState(parsed);
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const advance = useCallback((requestId: string, to: string, opts?: { cancelReason?: string }) => {
    setState((s) => advanceDemoRequest(s, requestId, to, opts));
  }, []);
  const escalate = useCallback((requestId: string) => {
    setState((s) => escalateDemoRequest(s, requestId));
  }, []);
  const reply = useCallback((requestId: string, body: string) => {
    setState((s) => replyDemoRequest(s, requestId, body));
  }, []);
  const ackPulse = useCallback((pulseId: string) => {
    setState((s) => ackDemoPulse(s, pulseId));
  }, []);
  const updateBranding = useCallback((patch: {
    primary_color?: string;
    tagline?: string;
    logo_url?: string | null;
    guest_bg_wash?: number;
    property?: NonNullable<Hotel["branding"]>["property"];
  }) => {
    setState((s) => updateDemoBranding(s, patch));
  }, []);
  const addRoom = useCallback((room_number: string, floor: string | null) => {
    setState((s) => addDemoRoom(s, room_number, floor));
  }, []);
  const removeRoom = useCallback((roomId: string) => {
    setState((s) => removeDemoRoom(s, roomId));
  }, []);
  const toggleRoomOccupancy = useCallback((roomId: string) => {
    setState((s) => toggleDemoRoomOccupancy(s, roomId));
  }, []);
  const setRequireCheckinCode = useCallback((require: boolean) => {
    setState((s) => setDemoRequireCheckinCode(s, require));
  }, []);
  const regenerateCheckinCode = useCallback((roomId: string) => {
    let code: string | null = null;
    setState((s) => {
      const next = regenerateDemoCheckinCode(s, roomId);
      code = next.rooms.find((r) => r.id === roomId)?.checkin_code ?? null;
      return next;
    });
    return code;
  }, []);
  const addStaff = useCallback((row: { name: string; email: string; department_key: string | null; role: string }) => {
    setState((s) => addDemoStaff(s, row));
  }, []);
  const removeStaff = useCallback((staffId: string) => {
    setState((s) => removeDemoStaff(s, staffId));
  }, []);
  const assignStaffDepartment = useCallback((staffId: string, department_key: string | null) => {
    setState((s) => assignDemoStaffDepartment(s, staffId, department_key));
  }, []);
  const toggleDepartment = useCallback((deptId: string) => {
    setState((s) => toggleDemoDepartment(s, deptId));
  }, []);
  const patchDepartment = useCallback((
    deptId: string,
    patch: Partial<{ display_name: string; is_active: boolean; notify_email: string | null; escalate_after_minutes: number }>,
  ) => {
    setState((s) => patchDemoDepartment(s, deptId, patch));
  }, []);
  const addKnowledge = useCallback((
    title: string,
    preview: string,
    opts?: { scope?: "site" | "general" | "department" | "room"; department_key?: string | null; kind?: string },
  ) => {
    setState((s) => addDemoKnowledge(s, title, preview, opts));
  }, []);
  const removeKnowledge = useCallback((id: string) => {
    setState((s) => removeDemoKnowledge(s, id));
  }, []);
  const addGuestRequest = useCallback((input: { summary: string; department?: string }) => {
    let id = "";
    setState((s) => {
      const out = addDemoGuestRequest(s, input);
      id = out.requestId;
      return out.state;
    });
    return id;
  }, []);
  const guestConfirm = useCallback((requestId: string) => {
    setState((s) => guestConfirmDemoRequest(s, requestId));
  }, []);
  const guestReopen = useCallback((requestId: string) => {
    setState((s) => guestReopenDemoRequest(s, requestId));
  }, []);
  const guestCancel = useCallback((requestId: string, reason?: string) => {
    setState((s) => guestCancelDemoRequest(s, requestId, reason));
  }, []);
  const guestNudge = useCallback((requestId: string) => {
    setState((s) => guestNudgeDemoRequest(s, requestId));
  }, []);
  const guestUpdate = useCallback((requestId: string, note: string) => {
    setState((s) => guestUpdateDemoRequest(s, requestId, note));
  }, []);
  const guestRate = useCallback((requestId: string, rating: number, comment?: string) => {
    setState((s) => guestRateDemoRequest(s, requestId, rating, comment));
  }, []);
  const guestPulse = useCallback((input: { rating: number; text?: string }) => {
    setState((s) => addDemoGuestPulse(s, input));
  }, []);
  const reset = useCallback(() => {
    clearPersistedDemoState();
    try { localStorage.removeItem("talkstay:demo-guest-pulse"); } catch { /* ignore */ }
    setState(createInitialDemoState());
  }, []);

  const api = useMemo<DemoApi>(() => ({
    hotel: state.hotel,
    actor: DEMO_ACTOR,
    state,
    version: state.version,
    getOpsQueue: (timeRange) => getDemoOpsQueue(state, timeRange),
    getRequestDetail: (requestId) => getDemoRequestDetail(state, requestId),
    getInsights: () => state.insights,
    advance,
    escalate,
    reply,
    ackPulse,
    updateBranding,
    addRoom,
    removeRoom,
    toggleRoomOccupancy,
    setRequireCheckinCode,
    regenerateCheckinCode,
    addStaff,
    removeStaff,
    assignStaffDepartment,
    toggleDepartment,
    patchDepartment,
    addKnowledge,
    removeKnowledge,
    addGuestRequest,
    guestConfirm,
    guestReopen,
    guestCancel,
    guestNudge,
    guestUpdate,
    guestRate,
    guestPulse,
    listStaffMessagesForGuest: () => listDemoStaffMessagesForGuest(state),
    reset,
  }), [
    state, advance, escalate, reply, ackPulse, updateBranding,
    addRoom, removeRoom, toggleRoomOccupancy, setRequireCheckinCode, regenerateCheckinCode,
    addStaff, removeStaff, assignStaffDepartment, toggleDepartment, patchDepartment,
    addKnowledge, removeKnowledge, addGuestRequest,
    guestConfirm, guestReopen, guestCancel, guestNudge, guestUpdate, guestRate, guestPulse,
    reset,
  ]);

  return <DemoContext.Provider value={api}>{children}</DemoContext.Provider>;
}
