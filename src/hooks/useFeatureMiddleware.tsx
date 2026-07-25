import { useNavigate } from "react-router-dom";
import { useFeatureGating } from "./useFeatureGating";
import { FeatureName } from "@/utils/featureGating";
import { toast } from "sonner";

const ROUTE_FEATURE_MAP: Record<string, FeatureName> = {
  '/api-keys': 'api_access',
  '/analytics': 'advanced_analytics',
  '/calendar': 'calendar_integration',
  '/whatsapp': 'whatsapp_integration',
};

export const useFeatureMiddleware = () => {
  const navigate = useNavigate();
  const { hasFeature, loading } = useFeatureGating();

  const canNavigateTo = (path: string): boolean => {
    const requiredFeature = ROUTE_FEATURE_MAP[path];
    if (!requiredFeature) return true;
    return hasFeature(requiredFeature);
  };

  const navigateWithFeatureCheck = (path: string) => {
    if (canNavigateTo(path)) {
      navigate(path);
    } else {
      toast.error('Upgrade your plan to access this feature.');
    }
  };

  return { canNavigateTo, navigateWithFeatureCheck, loading };
};

export const useFeatureCheck = () => {
  const { hasFeature, canUseFeature, getUpgradeMessage } = useFeatureGating();

  const checkFeatureAccess = (feature: FeatureName, currentUsage?: number, showToast = true): boolean => {
    const canUse = canUseFeature(feature, currentUsage);
    if (!canUse && showToast) {
      toast.error(getUpgradeMessage(feature));
    }
    return canUse;
  };

  return { checkFeatureAccess, hasFeature, canUseFeature, getUpgradeMessage };
};
