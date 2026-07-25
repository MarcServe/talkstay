
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminDashboardStats {
  current: {
    users: number;
    assistants: number;
    conversations: number;
    bookings: number;
    subscribers: number;
  };
  previous: {
    users: number;
    assistants: number;
    conversations: number;
    bookings: number;
    subscribers: number;
  };
  userGrowth: Array<{ date: string; count: number }>;
  conversationTrends: Array<{ date: string; count: number }>;
  avgResponseTime: number;
  bookingConversion: {
    total: number;
    confirmed: number;
    rate: number;
  };
  subscriptionBreakdown: {
    starter: number;
    professional: number;
    enterprise: number;
    total: number;
  };
  topAssistants: Array<{
    id: string;
    name: string;
    conversations: number;
    bookings: number;
    avgRating: number;
    isTrial: boolean;
  }>;
  systemHealth: {
    avgResponseTime: number;
    errorRate: number;
    voiceServiceHealth: string;
    aiProcessingHealth: string;
  };
}

export const useAdminData = (period: string = '30d') => {
  const [data, setData] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          throw new Error('No active session');
        }

        const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke('admin-analytics', {
          body: { period },
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        });

        if (analyticsError) {
          throw analyticsError;
        }

        setData(analyticsData);
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [period]);

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('No active session');
      }

      const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke('admin-analytics', {
        body: { period },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (analyticsError) {
        throw analyticsError;
      }

      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refreshData };
};

export const useAdminStats = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAssistants: 0,
    totalConversations: 0,
    totalBookings: 0,
    totalSubscribers: 0,
    recentUsers: 0,
    recentConversations: 0,
    recentBookings: 0,
    avgResponseTime: 0,
    bookingConversionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) return;

        // Fetch total counts using select with head: true to get count only
        const [usersResult, assistantsResult, conversationsResult, bookingsResult, subscribersResult] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('assistants').select('*', { count: 'exact', head: true }),
          supabase.from('conversations').select('*', { count: 'exact', head: true }),
          supabase.from('bookings').select('*', { count: 'exact', head: true }),
          supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('subscribed', true)
        ]);

        // Fetch recent data (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const [recentUsersResult, recentConversationsResult, recentBookingsResult, conversationsWithTime] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
          supabase.from('conversations').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
          supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
          supabase.from('conversations').select('response_time_ms').not('response_time_ms', 'is', null)
        ]);

        // Calculate avg response time
        const avgResponseTime = conversationsWithTime.data?.length > 0 
          ? conversationsWithTime.data.reduce((sum, conv) => sum + (conv.response_time_ms || 0), 0) / conversationsWithTime.data.length
          : 0;

        // Calculate booking conversion (confirmed bookings / total bookings)
        const confirmedBookingsResult = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'confirmed');

        const bookingConversionRate = (bookingsResult.count || 0) > 0 
          ? ((confirmedBookingsResult.count || 0) / (bookingsResult.count || 1)) * 100 
          : 0;

        setStats({
          totalUsers: usersResult.count || 0,
          totalAssistants: assistantsResult.count || 0,
          totalConversations: conversationsResult.count || 0,
          totalBookings: bookingsResult.count || 0,
          totalSubscribers: subscribersResult.count || 0,
          recentUsers: recentUsersResult.count || 0,
          recentConversations: recentConversationsResult.count || 0,
          recentBookings: recentBookingsResult.count || 0,
          avgResponseTime: Math.round(avgResponseTime),
          bookingConversionRate: Math.round(bookingConversionRate * 10) / 10
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
};
