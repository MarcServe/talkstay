import { useMemo } from "react";
import { useSubscription } from "./useSubscription";
import { useTrialManagement } from "./useTrialManagement";
import { FeatureGate, FeatureName, PlanTier } from "@/utils/featureGating";

export const useFeatureGating = () => {
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { hasActiveTrial, trialDaysRemaining, loading: trialLoading } = useTrialManagement();

  const featureGate = useMemo(() => {
    return new FeatureGate(
      subscription.subscription_tier,
      hasActiveTrial,
      trialDaysRemaining
    );
  }, [subscription.subscription_tier, hasActiveTrial, trialDaysRemaining]);

  const loading = subscriptionLoading || trialLoading;

  // Core feature checking functions
  const hasFeature = (feature: FeatureName): boolean => {
    return featureGate.hasFeature(feature);
  };

  const canUseFeature = (feature: FeatureName, currentUsage?: number): boolean => {
    return featureGate.canUseFeature(feature, currentUsage);
  };

  const getFeatureLimit = (limitType: 'assistants' | 'conversations' | 'firecrawl_usage' | 'knowledge_sources' | 'calendar_integrations'): number => {
    return featureGate.getFeatureLimit(limitType);
  };

  const getUpgradeMessage = (feature: FeatureName): string => {
    return featureGate.getUpgradeMessage(feature);
  };

  // Convenience functions for common checks
  const canCreateAssistant = (currentCount?: number): boolean => {
    return canUseFeature('create_assistant', currentCount);
  };

  const canUseFirecrawl = (currentUsage?: number): boolean => {
    return canUseFeature('firecrawl_usage', currentUsage);
  };

  const canIntegrateCalendar = (currentIntegrations?: number): boolean => {
    return canUseFeature('calendar_integration', currentIntegrations);
  };

  // Plan information
  const currentTier = featureGate.getCurrentTier();
  const planInfo = featureGate.getPlanInfo();

  // Feature status helpers
  const getFeatureStatus = (feature: FeatureName, currentUsage?: number) => {
    const hasAccess = hasFeature(feature);
    const canUse = canUseFeature(feature, currentUsage);
    const limit = getFeatureLimit(
      feature === 'create_assistant' ? 'assistants' :
      feature === 'firecrawl_usage' ? 'firecrawl_usage' :
      feature === 'calendar_integration' ? 'calendar_integrations' :
      feature === 'knowledge_sync' ? 'knowledge_sources' :
      'conversations'
    );

    return {
      hasAccess,
      canUse,
      limit: limit === -1 ? Infinity : limit,
      upgradeMessage: hasAccess ? null : getUpgradeMessage(feature),
      limitReached: hasAccess && !canUse,
    };
  };

  return {
    // Core functions
    hasFeature,
    canUseFeature,
    getFeatureLimit,
    getUpgradeMessage,
    getFeatureStatus,
    
    // Convenience functions
    canCreateAssistant,
    canUseFirecrawl,
    canIntegrateCalendar,
    
    // Plan information
    currentTier,
    planInfo,
    
    // State
    loading,
    
    // Raw feature gate for advanced usage
    featureGate,
  };
};