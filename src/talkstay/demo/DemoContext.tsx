import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from "react";
import type {
  InsightsData, OpsQueueData, OpsTimeRange, RequestDetailData,
} from "@/talkstay/lib/data";
import type { Hotel } from "@/talkstay/lib/hotels";
import {
  DEMO_ACTOR,
  DEMO_SESSION_KEY,
  ackDemoPulse,
  addDemoKnowledge,
  addDemoRoom,
  addDemoStaff,
  advanceDemoRequest,
  createInitialDemoState,
  escalateDemoRequest,
  getDemoOpsQueue,
  getDemoRequestDetail,
  removeDemoKnowledge,
  removeDemoRoom,
  removeDemoStaff,
  replyDemoRequest,
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
  updateBranding: (patch: { primary_color?: string; tagline?: string; logo_url?: string | null }) => void;
  addRoom: (room_number: string, floor: string | null) => void;
  removeRoom: (roomId: string) => void;
  toggleRoomOccupancy: (roomId: string) => void;
  addStaff: (row: { name: string; email: string; department_key: string | null; role: string }) => void;
  removeStaff: (staffId: string) => void;
  toggleDepartment: (deptId: string) => void;
  addKnowledge: (title: string, preview: string) => void;
  removeKnowledge: (id: string) => void;
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
  const [state, setState] = useState<DemoState>(() => createInitialDemoState());

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
  const updateBranding = useCallback((patch: { primary_color?: string; tagline?: string; logo_url?: string | null }) => {
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
  const addStaff = useCallback((row: { name: string; email: string; department_key: string | null; role: string }) => {
    setState((s) => addDemoStaff(s, row));
  }, []);
  const removeStaff = useCallback((staffId: string) => {
    setState((s) => removeDemoStaff(s, staffId));
  }, []);
  const toggleDepartment = useCallback((deptId: string) => {
    setState((s) => toggleDemoDepartment(s, deptId));
  }, []);
  const addKnowledge = useCallback((title: string, preview: string) => {
    setState((s) => addDemoKnowledge(s, title, preview));
  }, []);
  const removeKnowledge = useCallback((id: string) => {
    setState((s) => removeDemoKnowledge(s, id));
  }, []);
  const reset = useCallback(() => {
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
    addStaff,
    removeStaff,
    toggleDepartment,
    addKnowledge,
    removeKnowledge,
    reset,
  }), [
    state, advance, escalate, reply, ackPulse, updateBranding,
    addRoom, removeRoom, toggleRoomOccupancy, addStaff, removeStaff,
    toggleDepartment, addKnowledge, removeKnowledge, reset,
  ]);

  return <DemoContext.Provider value={api}>{children}</DemoContext.Provider>;
}
