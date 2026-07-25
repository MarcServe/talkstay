import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Database, Wifi, Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SystemHealthData {
  avgResponseTime: number;
  errorRate: number;
  voiceServiceHealth: 'operational' | 'degraded' | 'down';
  aiProcessingHealth: 'operational' | 'degraded' | 'down';
}

type ServiceStatus = 'operational' | 'degraded' | 'down';

const statusConfig = (status: ServiceStatus) => {
  switch (status) {
    case 'operational': return { label: 'Operational', badgeClass: 'bg-green-500', Icon: CheckCircle, iconClass: 'text-green-500' };
    case 'degraded':    return { label: 'Degraded',    badgeClass: 'bg-yellow-500', Icon: AlertTriangle, iconClass: 'text-yellow-500' };
    case 'down':        return { label: 'Down',        badgeClass: 'bg-red-500',    Icon: XCircle, iconClass: 'text-red-600' };
  }
};

export function AdminSystem() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  const fetchSystemHealth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-analytics', {
        body: { period: '30d' }
      });
      if (!error && data?.systemHealth) {
        setHealth(data.systemHealth as SystemHealthData);
        setCheckedAt(new Date());
      }
    } catch (e) {
      console.error('System health fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const apiStatus: ServiceStatus = health
    ? health.avgResponseTime < 3000 ? 'operational' : health.avgResponseTime < 8000 ? 'degraded' : 'down'
    : 'operational';

  const dbStatus: ServiceStatus = health
    ? health.errorRate < 5 ? 'operational' : health.errorRate < 15 ? 'degraded' : 'down'
    : 'operational';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Health</h1>
        <p className="text-muted-foreground">
          Monitor system performance and service status
          {checkedAt && (
            <span className="ml-2 text-xs">· Last checked {checkedAt.toLocaleTimeString()}</span>
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DB Response Time</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20 mb-1" /> : (
              <>
                <div className="text-2xl font-bold">
                  {health ? `${health.avgResponseTime}ms` : '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {health ? (health.avgResponseTime < 500 ? 'Normal range' : 'Elevated') : 'No data'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16 mb-1" /> : (
              <>
                <div className="text-2xl font-bold">
                  {health ? `${health.errorRate.toFixed(1)}%` : '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {health ? (health.errorRate < 5 ? 'Within normal range' : 'Above threshold') : 'No data'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voice Services</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24 mb-1" /> : (
              <>
                <div className="text-2xl font-bold capitalize">
                  {health?.voiceServiceHealth ?? '—'}
                </div>
                <p className="text-xs text-muted-foreground">Current status</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24 mb-1" /> : (
              <>
                <div className="text-2xl font-bold capitalize">
                  {health?.aiProcessingHealth ?? '—'}
                </div>
                <p className="text-xs text-muted-foreground">Current status</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Service Status
            </CardTitle>
            <CardDescription>Current status of all services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Web Application</span>
                  <Badge className="bg-green-500">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Services</span>
                  <Badge className={statusConfig(apiStatus).badgeClass}>
                    {statusConfig(apiStatus).label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge className={statusConfig(dbStatus).badgeClass}>
                    {statusConfig(dbStatus).label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Voice Processing</span>
                  <Badge className={health ? statusConfig(health.voiceServiceHealth).badgeClass : 'bg-gray-400'}>
                    {health ? statusConfig(health.voiceServiceHealth).label : '—'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              AI & Voice Health
            </CardTitle>
            <CardDescription>Real-time AI processing and voice service status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Processing</span>
                  <Badge className={health ? statusConfig(health.aiProcessingHealth).badgeClass : 'bg-gray-400'}>
                    {health ? statusConfig(health.aiProcessingHealth).label : '—'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Voice Services</span>
                  <Badge className={health ? statusConfig(health.voiceServiceHealth).badgeClass : 'bg-gray-400'}>
                    {health ? statusConfig(health.voiceServiceHealth).label : '—'}
                  </Badge>
                </div>
                {health && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Avg AI response: {(health.avgResponseTime / 1000).toFixed(2)}s
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
