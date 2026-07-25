import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UnifiedAnalytics {
  overview: {
    totalConversations: number;
    totalBookings: number;
    whatsappRequests: number;
    phoneCallClicks: number;
    conversationGrowth: string;
    bookingCompletionRate: number;
  };
  engagement: {
    uniqueSessions: number;
    avgMessagesPerSession: number;
    topKeywords: Array<{ word: string; count: number }>;
  };
  bookings: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    completionRate: number;
  };
  bookingsList: any[];
  monthlyTrends: Array<{ month: string; conversations: number; bookings: number }>;
  voiceFormSubmissions: number;
  dailyConversations: Array<{ date: string; count: number }>;
  avgResponseLength: number;
  recentBookings: Array<{ name: string; date: string; status: string }>;
  linkClicks: {
    totalClicks: number;
    topLinks: Array<{ url: string; label: string; count: number }>;
    bySource: Array<{ source: string; count: number }>;
    dailyClicks: Array<{ date: string; count: number }>;
    utmCampaigns: Array<{ campaign: string; source: string; medium: string; count: number }>;
  };
}

export const useUnifiedAnalytics = (assistantId: string, timeRange: string = "30d") => {
  const [analytics, setAnalytics] = useState<UnifiedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (assistantId) {
      loadAnalytics();
    }
  }, [assistantId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Parallel data fetching
      const [
        conversationResult,
        bookingCountResult,
        bookingsResult,
        whatsappResult,
        phoneResult,
        voiceFormResult,
        linkClicksResult,
      ] = await Promise.all([
        // Conversation analytics from edge function
        supabase.functions.invoke("analytics", {
          body: { assistantId, period: timeRange },
        }),
        // Booking count
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("assistant_id", assistantId)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Booking details
        supabase
          .from("bookings")
          .select("*")
          .eq("assistant_id", assistantId)
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .order("created_at", { ascending: false })
          .limit(200),
        // WhatsApp requests count - conversations where tool_calls contains whatsapp_redirect
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("assistant_id", assistantId)
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .filter("tool_calls::text", "ilike", "%whatsapp_redirect%"),
        // Phone call clicks count
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("assistant_id", assistantId)
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .filter("tool_calls::text", "ilike", "%contact_redirect%"),
        // Voice form submissions count
        supabase
          .from("voice_form_submissions")
          .select("id", { count: "exact", head: true })
          .eq("assistant_id", assistantId)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Link clicks
        supabase
          .from("link_clicks")
          .select("*")
          .eq("assistant_id", assistantId)
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      const conversationData = conversationResult.data;
      const bookings = bookingsResult.data || [];
      if (bookingsResult.error) throw bookingsResult.error;

      const totalConversations = conversationData?.metrics?.totalConversations || 0;
      const totalBookings = bookingCountResult.count || bookings.length || 0;

      // Booking metrics
      const pendingBookings = bookings.filter(b => b.status === "pending").length;
      const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
      const completedBookings = bookings.filter(b => b.status === "completed").length;
      const cancelledBookings = bookings.filter(b => b.status === "cancelled").length;
      const bookingCompletionRate = totalBookings > 0 
        ? Math.round((completedBookings / totalBookings) * 100) 
        : 0;

      // Monthly trends
      const monthlyMap: Record<string, { conversations: number; bookings: number }> = {};
      
      bookings.forEach((booking) => {
        const month = new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!monthlyMap[month]) {
          monthlyMap[month] = { conversations: 0, bookings: 0 };
        }
        monthlyMap[month].bookings++;
      });

      // Add conversation trends from the analytics data if available
      const conversationTrends = conversationData?.trends?.daily || [];
      conversationTrends.forEach((day: any) => {
        if (day.date) {
          const month = new Date(day.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          if (!monthlyMap[month]) {
            monthlyMap[month] = { conversations: 0, bookings: 0 };
          }
          monthlyMap[month].conversations += day.count || 0;
        }
      });

      const monthlyTrends = Object.entries(monthlyMap).map(([month, data]) => ({
        month,
        ...data,
      }));

      // Process link clicks
      const linkClicks = linkClicksResult.data || [];
      const linkUrlMap: Record<string, { url: string; label: string; count: number }> = {};
      const linkSourceMap: Record<string, number> = {};
      const linkDailyMap: Record<string, number> = {};
      const utmMap: Record<string, { campaign: string; source: string; medium: string; count: number }> = {};

      linkClicks.forEach((click: any) => {
        // Top links
        const key = click.clicked_url;
        if (!linkUrlMap[key]) linkUrlMap[key] = { url: key, label: click.link_label || key, count: 0 };
        linkUrlMap[key].count++;

        // By source
        linkSourceMap[click.source] = (linkSourceMap[click.source] || 0) + 1;

        // Daily
        const day = new Date(click.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        linkDailyMap[day] = (linkDailyMap[day] || 0) + 1;

        // UTM
        if (click.utm_campaign) {
          const utmKey = `${click.utm_campaign}|${click.utm_source || ''}|${click.utm_medium || ''}`;
          if (!utmMap[utmKey]) utmMap[utmKey] = { campaign: click.utm_campaign, source: click.utm_source || '', medium: click.utm_medium || '', count: 0 };
          utmMap[utmKey].count++;
        }
      });

      setAnalytics({
        overview: {
          totalConversations,
          totalBookings,
          whatsappRequests: whatsappResult.count || 0,
          phoneCallClicks: phoneResult.count || 0,
          conversationGrowth: conversationData?.metrics?.conversationGrowth || "stable",
          bookingCompletionRate,
        },
        engagement: {
          uniqueSessions: conversationData?.metrics?.uniqueSessions || 0,
          avgMessagesPerSession: conversationData?.metrics?.avgMessagesPerSession || 0,
          topKeywords: conversationData?.trends?.topKeywords || [],
        },
        bookings: {
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          completionRate: bookingCompletionRate,
        },
        bookingsList: bookings,
        monthlyTrends,
        voiceFormSubmissions: voiceFormResult.count || 0,
        dailyConversations: conversationTrends.map((day: any) => ({
          date: day.date ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
          count: day.count || 0,
        })),
        avgResponseLength: conversationData?.metrics?.avgResponseLength || 0,
        recentBookings: bookings.slice(0, 5).map((b: any) => ({
          name: b.user_name || b.user_email || 'Unknown',
          date: new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          status: b.status || 'pending',
        })),
        linkClicks: {
          totalClicks: linkClicks.length,
          topLinks: Object.values(linkUrlMap).sort((a, b) => b.count - a.count).slice(0, 20),
          bySource: Object.entries(linkSourceMap).map(([source, count]) => ({ source, count })),
          dailyClicks: Object.entries(linkDailyMap).map(([date, count]) => ({ date, count })),
          utmCampaigns: Object.values(utmMap).sort((a, b) => b.count - a.count),
        },
      });
    } catch (error: any) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { analytics, loading, refresh: loadAnalytics };
};
