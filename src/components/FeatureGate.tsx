import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureName } from "@/utils/featureGating";
import { Lock, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface FeatureGateProps {
  feature: FeatureName;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  currentUsage?: number;
  showUpgradePrompt?: boolean;
  className?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  currentUsage,
  showUpgradePrompt = true,
  className,
}) => {
  const { hasFeature, canUseFeature, getUpgradeMessage, currentTier, loading } = useFeatureGating();
  const { createCheckout } = useSubscription();

  // While loading, show children to prevent flash of upgrade UI
  if (loading) {
    return <>{children}</>;
  }

  const hasAccess = hasFeature(feature);
  const canUse = canUseFeature(feature, currentUsage);

  if (hasAccess && canUse) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const message = getUpgradeMessage(feature);

  // Determine next tier upgrade based on current tier
  const getNextTierCheckout = () => {
    switch (currentTier) {
      case 'free':
        return { plan: 'social', amount: 1900, name: 'TalkWeb Link', description: 'AI voice bio link for creators' };
      case 'social':
        return { plan: 'small_business', amount: 5900, name: 'TalkWeb Core', description: 'Website widget, WhatsApp, booking & more' };
      case 'small_business':
        return { plan: 'large_business', amount: 12900, name: 'TalkWeb Pro', description: 'Scale across multiple sites with API access' };
      default:
        return { plan: 'small_business', amount: 5900, name: 'TalkWeb Core', description: 'Unlock more features' };
    }
  };

  const handleUpgrade = async () => {
    try {
      const next = getNextTierCheckout();
      await createCheckout(next.plan, {
        amount: next.amount,
        name: next.name,
        description: next.description,
      });
    } catch (error) {
      toast.error('Failed to start upgrade process');
    }
  };

  return (
    <Card className={`p-6 text-center space-y-4 ${className || ''}`}>
      <div className="flex justify-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <Badge variant="secondary" className="gap-1">
          <Zap className="h-3 w-3" /> Upgrade Required
        </Badge>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button onClick={handleUpgrade} className="gap-2">
        Upgrade Now <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
};

// Higher-order component for feature gating
export const withFeatureGate = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: FeatureName,
  options?: {
    fallback?: React.ReactNode;
    showUpgradePrompt?: boolean;
  }
) => {
  return (props: P) => (
    <FeatureGate 
      feature={feature} 
      fallback={options?.fallback}
      showUpgradePrompt={options?.showUpgradePrompt}
    >
      <WrappedComponent {...props} />
    </FeatureGate>
  );
};