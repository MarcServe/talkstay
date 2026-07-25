import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Clock, Zap, TrendingUp } from "lucide-react";

interface UsageData {
  conversations_used: number;
  conversations_limit: number;
  plan_type: string;
  reset_date: string;
}

export const UsageTracker = () => {
  const { user } = useAuth();
  const { canUseFeature, getFeatureLimit, currentTier } = useFeatureGating();
  const { createCheckout } = useSubscription();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchUsage();
    }
  }, [user]);

  const fetchUsage = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from("user_usage")
        .select("*")
        .eq("email", user.email)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error is ok
        console.error("Error fetching usage:", error);
        return;
      }

      setUsage(data);
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUsageStatus = () => {
    if (!usage) return { color: "secondary", icon: Clock };
    
    const percentage = (usage.conversations_used / usage.conversations_limit) * 100;
    
    if (percentage >= 90) return { color: "destructive", icon: AlertTriangle };
    if (percentage >= 70) return { color: "default", icon: Zap };
    return { color: "secondary", icon: CheckCircle };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getProgressColor = () => {
    if (!usage) return "";
    const percentage = (usage.conversations_used / usage.conversations_limit) * 100;
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-orange-500";
    return "bg-primary";
  };

  if (loading) {
    return (
      <Card variant="dashboardCard" className="p-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  if (!usage) {
    return (
      <Card variant="dashboardCard" className="p-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">No usage data available</p>
          <Button variant="outline" size="sm" onClick={fetchUsage}>
            Refresh
          </Button>
        </div>
      </Card>
    );
  }

  const status = getUsageStatus();
  const percentage = (usage.conversations_used / usage.conversations_limit) * 100;
  const remaining = usage.conversations_limit - usage.conversations_used;
  const canUpgrade = currentTier !== 'enterprise';

  const handleUpgrade = async () => {
    try {
      const nextTier = currentTier === 'free' ? 'social' : 'small_business';
      const planConfig = {
        social: { amount: 1900, name: 'TalkWeb Link' },
        small_business: { amount: 5900, name: 'TalkWeb Core' }
      };
      
      await createCheckout(nextTier, {
        ...planConfig[nextTier],
        description: `Upgrade to ${nextTier} plan for higher limits`
      });
    } catch (error) {
      toast.error('Failed to start upgrade process');
      console.error('Upgrade error:', error);
    }
  };

  return (
    <Card variant="dashboardCard" className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <status.icon className={`w-5 h-5 ${
              status.color === 'destructive' ? 'text-destructive' : 
              status.color === 'default' ? 'text-orange-500' : 
              'text-primary'
            }`} />
            <div>
              <h3 className="font-semibold">Monthly Usage</h3>
              <p className="text-sm text-muted-foreground">
                {usage.conversations_used} of {usage.conversations_limit.toLocaleString()} conversations used
              </p>
            </div>
          </div>
          <Badge variant={status.color === 'destructive' ? 'destructive' : 'secondary'}>
            {usage.plan_type.charAt(0).toUpperCase() + usage.plan_type.slice(1)} Plan
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{percentage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={percentage} 
            className="h-2"
          />
        </div>

        <div className="flex justify-between items-center text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Remaining: <span className="font-medium text-foreground">{remaining.toLocaleString()}</span></p>
            <p className="text-muted-foreground">Resets: <span className="font-medium text-foreground">{formatDate(usage.reset_date)}</span></p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsage}>
            Refresh
          </Button>
        </div>

        {percentage >= 90 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive font-medium">
                Usage limit almost reached! Consider upgrading your plan.
              </p>
            </div>
            {canUpgrade && (
              <Button 
                onClick={handleUpgrade}
                size="sm"
                className="w-full"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};