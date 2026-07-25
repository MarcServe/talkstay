import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { FeatureName } from "@/utils/featureGating";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredFeature?: FeatureName;
  redirectTo?: string;
  fallbackComponent?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredFeature,
  redirectTo = "/auth",
  fallbackComponent,
}) => {
  const { user, loading: authLoading } = useAuth();
  const { hasFeature, getUpgradeMessage, loading: featureLoading } = useFeatureGating();
  const { createCheckout } = useSubscription();

  const loading = authLoading || featureLoading;

  const handleUpgrade = async () => {
    // For protected routes, if user doesn't have the feature, start free trial
    if (!hasFeature(requiredFeature)) {
      window.location.href = '/create-assistant';
      return;
    }
    
    // If they have the feature but need more limits, upgrade
    try {
      await createCheckout('starter', {
        amount: 1999,
        name: 'Starter Plan',
        description: 'Perfect for small businesses'
      });
    } catch (error) {
      toast.error('Failed to start upgrade process');
      console.error('Upgrade error:', error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check authentication
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check feature access if requiredFeature is specified
  if (requiredFeature && !hasFeature(requiredFeature)) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    const message = getUpgradeMessage(requiredFeature);

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Feature Locked</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button onClick={handleUpgrade} className="gap-2">
            Upgrade Now <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

// Higher-order component version
export const withProtectedRoute = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    requireAuth?: boolean;
    requiredFeature?: FeatureName;
    redirectTo?: string;
    fallbackComponent?: React.ReactNode;
  } = {}
) => {
  return (props: P) => (
    <ProtectedRoute {...options}>
      <WrappedComponent {...props} />
    </ProtectedRoute>
  );
};