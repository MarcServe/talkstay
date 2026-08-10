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
  fetchOpsQueue,
  fetchRequestDetail,
  talkstayKeys,
  type InsightsTimeRange,
  type OpsTimeRange,
  type RequestDetailData,
} from "@/talkstay/lib/data";

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
  return useQuery({
    queryKey: talkstayKeys.ops(hotelId ?? "", timeRange),
    queryFn: () => fetchOpsQueue(hotelId!, timeRange),
    enabled: !!hotelId,
    staleTime: TALKSTAY_STALE.ops,
    gcTime: 15 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
}

/** Keep ops + insights warm while staff work the dashboard. */
export function usePrefetchHotelData(hotelId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!hotelId) return;
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
  }, [hotelId, qc]);
}

/** Realtime → invalidate cache (no full-page spinner; UI stays on cached data). */
export function useOpsRealtime(hotelId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!hotelId) return;
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ts_request_events" },
        () => {
          void qc.invalidateQueries({ queryKey: talkstayKeys.opsHotel(hotelId) });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [hotelId, qc]);
}

export function invalidateOps(qc: QueryClient, hotelId: string) {
  return qc.invalidateQueries({ queryKey: talkstayKeys.opsHotel(hotelId) });
}

export function useRequestDetail(requestId: string | null, open: boolean) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: talkstayKeys.request(requestId ?? ""),
    queryFn: () => fetchRequestDetail(requestId!),
    enabled: open && !!requestId,
    staleTime: TALKSTAY_STALE.request,
    gcTime: 10 * 60_000,
    // Instant paint: seed from any cached ops queue row while detail loads.
    placeholderData: (): RequestDetailData | undefined => {
      if (!requestId) return undefined;
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
  return useQuery({
    queryKey: talkstayKeys.insights(hotelId ?? "", timeRange),
    queryFn: () => fetchInsights(hotelId!, timeRange),
    enabled: !!hotelId,
    staleTime: TALKSTAY_STALE.insights,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  });
}
