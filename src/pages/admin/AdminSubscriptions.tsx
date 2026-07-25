import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { SubscriptionStatsCards } from "@/components/admin/SubscriptionStatsCards";
import { SubscriberTable } from "@/components/admin/SubscriberTable";

interface SubscriptionStats {
  totalSubscribers: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  trialUsers: number;
  subscriptionBreakdown: {
    starter: number;
    professional: number;
    enterprise: number;
  };
  recentSubscriptions: number;
}

interface Subscriber {
  id: string;
  email: string;
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  user_id: string | null;
}

export function AdminSubscriptions() {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch all subscribers
      const { data: allSubscribers, error } = await supabase
        .from("subscribers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const subs = (allSubscribers || []) as Subscriber[];
      setSubscribers(subs);

      const activeSubs = subs.filter((s) => s.subscribed);

      const subscriptionBreakdown = { starter: 0, professional: 0, enterprise: 0 };
      activeSubs.forEach((sub) => {
        const tier = sub.subscription_tier?.toLowerCase();
        if (tier === "small_business" || tier === "core" || tier === "starter") {
          subscriptionBreakdown.starter++;
        } else if (tier === "large_business" || tier === "pro" || tier === "professional" || tier === "growth") {
          subscriptionBreakdown.professional++;
        } else if (tier === "enterprise" || tier === "premium") {
          subscriptionBreakdown.enterprise++;
        }
      });

      const tierPrices = { starter: 59, professional: 129, enterprise: 299 };
      const monthlyRevenue =
        subscriptionBreakdown.starter * tierPrices.starter +
        subscriptionBreakdown.professional * tierPrices.professional +
        subscriptionBreakdown.enterprise * tierPrices.enterprise;

      const { count: trialUsers } = await supabase
        .from("assistants")
        .select("*", { count: "exact", head: true })
        .eq("is_trial", true)
        .gt("trial_expires_at", new Date().toISOString());

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const recentSubscriptions = activeSubs.filter((s) => s.created_at >= thirtyDaysAgo).length;

      const totalSubscribers = activeSubs.length;
      const churnRate = totalSubscribers
        ? Math.max(0, (recentSubscriptions / Math.max(totalSubscribers, 1)) * 2.5)
        : 0;

      setStats({
        totalSubscribers,
        monthlyRevenue,
        activeSubscriptions: totalSubscribers,
        churnRate,
        trialUsers: trialUsers || 0,
        subscriptionBreakdown,
        recentSubscriptions,
      });
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscription Management</h1>
          <p className="text-muted-foreground">Monitor and manage all subscriptions</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Subscription Management</h1>
        <p className="text-muted-foreground">Monitor and manage all subscriptions</p>
      </div>

      {stats && <SubscriptionStatsCards stats={stats} />}

      <SubscriberTable subscribers={subscribers} onRefresh={fetchData} />
    </div>
  );
}
