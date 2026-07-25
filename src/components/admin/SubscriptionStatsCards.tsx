import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, TrendingUp, Users, Crown, Star } from "lucide-react";

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

interface SubscriptionStatsCardsProps {
  stats: SubscriptionStats;
}

export function SubscriptionStatsCards({ stats }: SubscriptionStatsCardsProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.monthlyRevenue}</div>
            <p className="text-xs text-muted-foreground">+{stats.recentSubscriptions} new this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Total paying customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.churnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Monthly retention rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialUsers}</div>
            <p className="text-xs text-muted-foreground">Active trial assistants</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Breakdown</CardTitle>
            <CardDescription>Distribution by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span>Enterprise</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{stats.subscriptionBreakdown.enterprise}</p>
                  <p className="text-xs text-muted-foreground">£299/month</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span>Professional</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{stats.subscriptionBreakdown.professional}</p>
                  <p className="text-xs text-muted-foreground">£99/month</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span>Starter</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{stats.subscriptionBreakdown.starter}</p>
                  <p className="text-xs text-muted-foreground">£29/month</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription>Financial performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Monthly Recurring Revenue</span>
                <span className="font-bold text-lg">£{stats.monthlyRevenue}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Revenue Per User</span>
                <span className="font-medium">
                  £{stats.totalSubscribers ? Math.round((stats.monthlyRevenue / stats.totalSubscribers) * 10) / 10 : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Growth Rate (Monthly)</span>
                <span className="font-medium text-green-600">
                  +{((stats.recentSubscriptions || 0) / Math.max(stats.totalSubscribers || 1, 1) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Trial Conversion Rate</span>
                <span className="font-medium">
                  {stats.trialUsers ? ((stats.totalSubscribers / (stats.totalSubscribers + stats.trialUsers)) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
