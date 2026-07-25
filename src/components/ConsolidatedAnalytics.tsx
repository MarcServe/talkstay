import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedAnalyticsDashboard } from "@/components/UnifiedAnalyticsDashboard";
import AdvancedAnalyticsDashboard from "@/components/AdvancedAnalyticsDashboard";
import { FeatureGate } from "@/components/FeatureGate";
import { BarChart3, TrendingUp, Info } from "lucide-react";
import { useSearchParams } from "react-router-dom";

interface ConsolidatedAnalyticsProps {
  assistantId?: string | null;
  userId?: string;
}

export function ConsolidatedAnalytics({
  assistantId,
}: ConsolidatedAnalyticsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Default tab; deep-link via ?view=advanced-analytics still opens Trends tab
  const initialTab =
    searchParams.get("view") === "advanced-analytics" ? "trends" : "overview";
  const [tab, setTab] = useState<string>(initialTab);

  useEffect(() => {
    const v = searchParams.get("view");
    if (v === "advanced-analytics") setTab("trends");
    else if (v === "analytics") setTab((prev) => prev || "overview");
  }, [searchParams]);

  if (!assistantId) {
    return (
      <Card variant="dashboardCard">
        <CardContent className="text-center py-8">
          Please select an assistant to view analytics.
        </CardContent>
      </Card>
    );
  }

  return (
    <FeatureGate feature="advanced_analytics">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Analytics
            </CardTitle>
            <CardDescription className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>
                <strong>Overview</strong> shows your day-to-day performance: conversations,
                bookings, leads and channel breakdowns. <strong>Trends &amp; Topics</strong> gives
                long-range trend lines and the most-discussed topics so you can spot patterns over
                time.
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs value={tab} onValueChange={(v) => {
          setTab(v);
          const next = new URLSearchParams(searchParams);
          next.set("view", v === "trends" ? "advanced-analytics" : "analytics");
          setSearchParams(next, { replace: true });
        }}>
          <TabsList className="grid grid-cols-2 w-full md:w-auto">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-1.5">
              <TrendingUp className="w-4 h-4" /> Trends &amp; Topics
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <UnifiedAnalyticsDashboard assistantId={assistantId} />
          </TabsContent>
          <TabsContent value="trends" className="mt-4">
            <AdvancedAnalyticsDashboard assistantId={assistantId} />
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
}
