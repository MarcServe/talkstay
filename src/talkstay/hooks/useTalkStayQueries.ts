import { useEffect } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAccess,
  fetchInsights,
  fetchInsightsPortfolio,
  fetchOpsQueue,
  fetchRequestDetail,
  talkstayKeys,
  type InsightsTimeRange,
  type OpsTimeRange,
  type RequestDetailData,
} from "@/talkstay/lib/data";
import { useDemo } from "@/talkstay/demo/DemoContext";

/** Shared defaults: show cache instantly, refresh in background. */
export const TALKSTAY_STALE = {
  access: 5 * 60_000,
  ops: 15_000,
  insights: 60_000,
  request: 30_000,
} as const;

export function useHotelAccess(userId: string | undefined) {
  return useQuery({
    // Per-user key so switching Google ↔ email never reuses the wrong cache.
    queryKey: talkstayKeys.access(userId ?? ""),
    queryFn: fetchAccess,
    enabled: !!userId,
    staleTime: TALKSTAY_STALE.access,
    gcTime: 30 * 60_000,
  });
}

export function useOpsQueue(hotelId: string | undefined, timeRange: OpsTimeRange) {
  const demo = useDemo();
  return useQuery({
    queryKey: demo
      ? ["talkstay-demo", "ops", hotelId ?? "", timeRange, demo.version]
      : talkstayKeys.ops(hotelId ?? "", timeRange),
    queryFn: () => (demo ? demo.getOpsQueue(timeRange) : fetchOpsQueue(hotelId!, timeRange)),
    enabled: !!hotelId,
    staleTime: demo ? 0 : TALKSTAY_STALE.ops,
    gcTime: 15 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: !demo,
  });
}

/** Keep ops + insights warm while staff work the dashboard. */
export function usePrefetchHotelData(hotelId: string | undefined) {
  const qc = useQueryClient();
  const demo = useDemo();
  useEffect(() => {
    if (!hotelId || demo) return;
    void qc.prefetchQuery({
      queryKey: talkstayKeys.ops(hotelId, "3d"),
      queryFn: () => fetchOpsQueue(hotelId, "3d"),
      staleTime: TALKSTAY_STALE.ops,
    });
    void qc.prefetchQuery({
      queryKey: talkstayKeys.insights(hotelId, "7d"),
      queryFn: () => fetchInsights(hotelId, "7d"),
      staleTime: TALKSTAY_STALE.insights,
    });
  }, [hotelId, qc, demo]);
}

/** Realtime → invalidate cache (no full-page spinner; UI stays on cached data). */
export function useOpsRealtime(hotelId: string | undefined) {
  const qc = useQueryClient();
  const demo = useDemo();
  useEffect(() => {
    if (!hotelId || demo) return;
    const channel = supabase
      .channel(`ts-ops-cache-${hotelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ts_service_requests", filter: `hotel_id=eq.${hotelId}` },
        () => {
          void qc.invalidateQueries({ queryKey: talkstayKeys.opsHotel(hotelId) });
          void qc.invalidateQueries({ queryKey: talkstayKeys.insightsHotel(hotelId) });
        },
      )
      // Intentionally no ts_request_events subscription: that table isn't hotel-
      // filtered in Realtime and isn't in the publication — request-row changes
      // already cover queue invalidation without cross-hotel fan-out.
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [hotelId, qc, demo]);
}

export function invalidateOps(qc: QueryClient, hotelId: string) {
  return qc.invalidateQueries({ queryKey: talkstayKeys.opsHotel(hotelId) });
}

export function useRequestDetail(requestId: string | null, open: boolean) {
  const qc = useQueryClient();
  const demo = useDemo();
  return useQuery({
    queryKey: demo
      ? ["talkstay-demo", "request", requestId ?? "", demo.version]
      : talkstayKeys.request(requestId ?? ""),
    queryFn: async () => {
      if (demo) {
        const row = demo.getRequestDetail(requestId!);
        if (!row) throw new Error("Demo request not found");
        return row;
      }
      return fetchRequestDetail(requestId!);
    },
    enabled: open && !!requestId,
    staleTime: demo ? 0 : TALKSTAY_STALE.request,
    gcTime: 10 * 60_000,
    // Instant paint: seed from any cached ops queue row while detail loads.
    placeholderData: (): RequestDetailData | undefined => {
      if (!requestId) return undefined;
      if (demo) return demo.getRequestDetail(requestId) ?? undefined;
      type CachedOps = { requests?: Array<{
        id: string; room_id: string | null; department_key: string; summary: string;
        summary_staff: string | null; status: string; priority: string; is_complaint: boolean;
        needs_triage: boolean; guest_language: string | null; created_at: string;
        ts_rooms?: { room_number: string } | null;
      }> };
      const caches = qc.getQueriesData<CachedOps>({ queryKey: talkstayKeys.all });
      for (const [, data] of caches) {
        const row = data?.requests?.find((r) => r.id === requestId);
        if (row) {
          return {
            request: {
              ...row,
              hotel_id: "",
              intent: null,
              session_id: null,
              conversation: null,
              updated_at: row.created_at,
            },
            events: [],
            messages: [],
            chat: [],
          };
        }
      }
      return undefined;
    },
  });
}

export function useInsightsData(hotelId: string | undefined, timeRange: InsightsTimeRange) {
  const demo = useDemo();
  return useQuery({
    queryKey: demo
      ? ["talkstay-demo", "insights", hotelId ?? "", timeRange, demo.version]
      : talkstayKeys.insights(hotelId ?? "", timeRange),
    queryFn: () => (demo ? demo.getInsights() : fetchInsights(hotelId!, timeRange)),
    enabled: !!hotelId,
    staleTime: demo ? 0 : TALKSTAY_STALE.insights,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/** Aggregate Insights across multiple owned properties. */
export function useInsightsPortfolio(
  hotels: { id: string; name: string }[] | undefined,
  timeRange: InsightsTimeRange,
  enabled = true,
) {
  const demo = useDemo();
  const idsKey = (hotels ?? []).map((h) => h.id).sort().join(",");
  return useQuery({
    queryKey: demo
      ? ["talkstay-demo", "insights-portfolio", idsKey, timeRange, demo.version]
      : talkstayKeys.insightsPortfolio(idsKey || "none", timeRange),
    queryFn: () => {
      if (demo) return demo.getInsights();
      return fetchInsightsPortfolio(hotels ?? [], timeRange);
    },
    enabled: enabled && !demo && !!hotels?.length,
    staleTime: TALKSTAY_STALE.insights,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  });
}
