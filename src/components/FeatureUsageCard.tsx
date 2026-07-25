import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureName } from "@/utils/featureGating";
import { AlertTriangle, CheckCircle, Zap, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface FeatureUsageCardProps {
  feature: FeatureName;
  currentUsage: number;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const FeatureUsageCard: React.FC<FeatureUsageCardProps> = ({
  feature,
  currentUsage,
  title,
  description,
  icon,
  className = "",
}) => {
  const { getFeatureStatus, currentTier, loading } = useFeatureGating();
  const { createCheckout, subscription } = useSubscription();

  if (loading) {
    return (
      <Card variant="dashboardCard" className={`p-6 ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-5 h-5 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      </Card>
    );
  }
  
  const status = getFeatureStatus(feature, currentUsage);
  const limit = status.limit === Infinity ? null : status.limit;
  const percentage = limit ? (currentUsage / limit) * 100 : 0;

  const getStatusIcon = () => {
    if (!status.hasAccess) return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    if (percentage >= 90) return <AlertTriangle className="w-5 h-5 text-destructive" />;
    if (percentage >= 70) return <Zap className="w-5 h-5 text-orange-500" />;
    return <CheckCircle className="w-5 h-5 text-primary" />;
  };

  const getStatusColor = () => {
    if (!status.hasAccess) return 'secondary';
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'default';
    return 'secondary';
  };

  const handleUpgrade = async () => {
    // If user doesn't have access to the feature at all
    if (!status.hasAccess) {
      // If already subscribed, don't show trial option - go to pricing
      if (subscription?.subscribed) {
        window.location.href = '/pricing';
        return;
      }
      // Otherwise, start free trial
      window.location.href = '/create-assistant';
      return;
    }
    
    // If user has access but reached limits, upgrade to paid plan
    try {
      const nextTier = currentTier === 'free' ? 'social' : 'small_business';
      const planConfig = {
        social: { amount: 1900, name: 'TalkWeb Link' },
        small_business: { amount: 5900, name: 'TalkWeb Core' }
      };
      
      await createCheckout(nextTier, {
        ...planConfig[nextTier],
        description: `Upgrade to ${nextTier} plan for more features`
      });
    } catch (error) {
      toast.error('Failed to start upgrade process');
      console.error('Upgrade error:', error);
    }
  };

  return (
    <Card variant="dashboardCard" className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon || getStatusIcon()}
            <div>
              <h3 className="font-semibold">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <Badge variant={getStatusColor()}>
            {status.hasAccess ? (
              limit ? `${currentUsage}/${limit}` : `${currentUsage}`
            ) : (
              'Locked'
            )}
          </Badge>
        </div>

        {/* Progress bar (only if feature is accessible and has limits) */}
        {status.hasAccess && limit && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
            <Progress 
              value={percentage} 
              className="h-2"
            />
          </div>
        )}

        {/* Status messages and actions */}
        <div className="space-y-3">
          {!status.hasAccess && (
            <div className="p-3 bg-muted/50 border border-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {status.upgradeMessage}
                </p>
              </div>
            </div>
          )}

          {status.hasAccess && status.limitReached && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive font-medium">
                  Limit reached! Upgrade to continue using this feature.
                </p>
              </div>
            </div>
          )}

          {status.hasAccess && percentage >= 70 && percentage < 100 && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <p className="text-sm text-orange-600 font-medium">
                  Approaching limit. Consider upgrading your plan.
                </p>
              </div>
            </div>
          )}

          {/* Upgrade button - hide "Start Free Trial" for subscribed users */}
          {(!status.hasAccess || status.limitReached || percentage >= 70) && (
            <Button 
              onClick={handleUpgrade}
              variant={status.limitReached ? "default" : "outline"}
              size="sm"
              className="w-full"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {status.limitReached || !status.hasAccess 
                ? (status.hasAccess 
                  ? 'Upgrade Now' 
                  : (subscription?.subscribed ? 'Upgrade Plan' : 'Start Free Trial'))
                : 'Upgrade Plan'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};