import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from "react";
import type {
  InsightsData, OpsQueueData, OpsTimeRange, RequestDetailData,
} from "@/talkstay/lib/data";
import {
  DEMO_ACTOR,
  DEMO_HOTEL,
  DEMO_SESSION_KEY,
  ackDemoPulse,
  advanceDemoRequest,
  createInitialDemoState,
  escalateDemoRequest,
  getDemoOpsQueue,
  getDemoRequestDetail,
  replyDemoRequest,
  type DemoState,
} from "@/talkstay/demo/demoStore";

export type DemoApi = {
  hotel: typeof DEMO_HOTEL;
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

  const reset = useCallback(() => {
    setState(createInitialDemoState());
  }, []);

  const api = useMemo<DemoApi>(() => ({
    hotel: DEMO_HOTEL,
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
    reset,
  }), [state, advance, escalate, reply, ackPulse, reset]);

  return <DemoContext.Provider value={api}>{children}</DemoContext.Provider>;
}
