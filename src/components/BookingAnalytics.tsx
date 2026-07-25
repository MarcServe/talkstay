import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, CheckCircle, XCircle, Clock, ArrowUpRight, Download } from 'lucide-react';
import { exportToCSV, formatBookingsDataForExport } from '@/utils/exportAnalytics';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BookingAnalyticsProps {
  assistantId: string;
}

interface BookingStats {
  total: number;
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
  conversionRates: Record<string, number>;
  recentBookings: any[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const METHOD_LABELS: Record<string, string> = {
  manual_timeslots: 'Manual Calendar',
  external_link: 'External Scheduler',
  google_calendar: 'Google Calendar',
  outlook_calendar: 'Outlook Calendar',
  calendly: 'Calendly (Legacy)',
};

export const BookingAnalytics: React.FC<BookingAnalyticsProps> = ({ assistantId }) => {
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    byMethod: {},
    byStatus: {},
    conversionRates: {},
    recentBookings: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [assistantId, timeRange]);

  const loadAnalytics = async () => {
    if (!assistantId) return;

    setLoading(true);
    try {
      // Calculate date filter based on time range
      let dateFilter = new Date(0); // Beginning of time
      if (timeRange === '7d') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === '30d') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // Fetch all bookings for this assistant
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('assistant_id', assistantId)
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        setStats({
          total: 0,
          byMethod: {},
          byStatus: {},
          conversionRates: {},
          recentBookings: [],
        });
        return;
      }

      // Calculate statistics
      const byMethod: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const methodStatus: Record<string, { completed: number; total: number }> = {};

      bookings.forEach((booking) => {
        const method = (booking as any).booking_method || 'manual_timeslots';
        const status = booking.status;

        // Count by method
        byMethod[method] = (byMethod[method] || 0) + 1;

        // Count by status
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Track method success rates
        if (!methodStatus[method]) {
          methodStatus[method] = { completed: 0, total: 0 };
        }
        methodStatus[method].total++;
        if (status === 'confirmed' || status === 'completed') {
          methodStatus[method].completed++;
        }
      });

      // Calculate conversion rates
      const conversionRates: Record<string, number> = {};
      Object.keys(methodStatus).forEach((method) => {
        const { completed, total } = methodStatus[method];
        conversionRates[method] = total > 0 ? (completed / total) * 100 : 0;
      });

      setAllBookings(bookings);
      setStats({
        total: bookings.length,
        byMethod,
        byStatus,
        conversionRates,
        recentBookings: bookings.slice(0, 5),
      });
    } catch (error) {
      console.error('Error loading booking analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMethodChartData = () => {
    return Object.entries(stats.byMethod).map(([method, count]) => ({
      name: METHOD_LABELS[method] || method,
      value: count,
      conversion: stats.conversionRates[method]?.toFixed(1) || '0',
    }));
  };

  const getStatusChartData = () => {
    return Object.entries(stats.byStatus).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  };

  const getOverallConversionRate = () => {
    const completed = stats.byStatus['confirmed'] || 0 + stats.byStatus['completed'] || 0;
    return stats.total > 0 ? ((completed / stats.total) * 100).toFixed(1) : '0';
  };

  const getMostPopularMethod = () => {
    if (Object.keys(stats.byMethod).length === 0) return 'N/A';
    const sortedMethods = Object.entries(stats.byMethod).sort((a, b) => b[1] - a[1]);
    return METHOD_LABELS[sortedMethods[0][0]] || sortedMethods[0][0];
  };

  const handleExport = () => {
    if (allBookings.length === 0) {
      toast({
        title: "No data to export",
        description: "No bookings available for export",
        variant: "destructive",
      });
      return;
    }

    const exportData = formatBookingsDataForExport(allBookings);
    exportToCSV(exportData, `bookings_${assistantId}`);
    
    toast({
      title: "Export successful",
      description: `${allBookings.length} bookings exported as CSV`,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (stats.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Booking Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No bookings yet in the selected time range</p>
            <p className="text-sm text-muted-foreground mt-2">Analytics will appear once you receive bookings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector and Export */}
      <div className="flex justify-between items-center">
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="7d">Last 7 days</TabsTrigger>
            <TabsTrigger value="30d">Last 30 days</TabsTrigger>
            <TabsTrigger value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{getOverallConversionRate()}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">{stats.byStatus['confirmed'] || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Method</p>
                <p className="text-sm font-bold truncate">{getMostPopularMethod()}</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings by Method */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Method</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution of booking methods used</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getMethodChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getMethodChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Rates by Method */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rates by Method</CardTitle>
            <p className="text-sm text-muted-foreground">Success rate for each booking method</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getMethodChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Conversion %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="conversion" fill="#6366f1" name="Conversion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Booking Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium capitalize">{status}</p>
                  {status === 'confirmed' || status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : status === 'cancelled' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">
                  {((count / stats.total) * 100).toFixed(1)}% of total
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Method Performance Details */}
      <Card>
        <CardHeader>
          <CardTitle>Method Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byMethod).map(([method, count]) => (
              <div key={method} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{METHOD_LABELS[method] || method}</p>
                  <p className="text-sm text-muted-foreground">
                    {count} bookings ({((count / stats.total) * 100).toFixed(1)}% of total)
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={stats.conversionRates[method] > 70 ? 'default' : 'secondary'}>
                    {stats.conversionRates[method]?.toFixed(1)}% conversion
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{booking.user_name || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">{booking.user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(booking.created_at).toLocaleDateString()} • {booking.preferred_date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {METHOD_LABELS[(booking as any).booking_method] || 'Manual'}
                  </Badge>
                  <Badge
                    variant={
                      booking.status === 'confirmed' || booking.status === 'completed'
                        ? 'default'
                        : booking.status === 'cancelled'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
