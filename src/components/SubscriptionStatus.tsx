import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Zap, Sparkles, CreditCard, Calendar, Phone } from "lucide-react";
import { useState } from "react";
import { PricingSection } from "@/components/PricingSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TEL_SUPPORT } from "@/config/contact";

export const SubscriptionStatus = () => {
  const { subscription, loading, openCustomerPortal } = useSubscription();
  const [showPricing, setShowPricing] = useState(false);

  const getTierIcon = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'starter':
        return <Zap className="w-5 h-5 text-blue-500" />;
      case 'professional':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'enterprise':
        return <Crown className="w-5 h-5 text-amber-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTierColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'starter':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'professional':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'enterprise':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card variant="dashboardCard" className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.subscribed ? (
          <div className="space-y-4">
            {/* Current Plan */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTierIcon(subscription.subscription_tier)}
                <span className="font-medium">Current Plan</span>
              </div>
              <Badge className={getTierColor(subscription.subscription_tier)}>
                {subscription.subscription_tier || 'Unknown'}
              </Badge>
            </div>

            {/* Subscription End Date */}
            {subscription.subscription_end && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Renews on {formatDate(subscription.subscription_end)}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={openCustomerPortal}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Loading...' : 'Manage Subscription'}
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <a href={TEL_SUPPORT} aria-label="Call TalkWeb Support">
                  <Phone className="w-4 h-4 mr-2" /> Call Support
                </a>
              </Button>
              
              <Dialog open={showPricing} onOpenChange={setShowPricing}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    Upgrade Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Choose Your Plan</DialogTitle>
                  </DialogHeader>
                  <PricingSection />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">No Active Subscription</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Subscribe to unlock premium features and unlimited voice assistants
              </p>
              
              <Dialog open={showPricing} onOpenChange={setShowPricing}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="w-full">
                    Choose a Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Choose Your Plan</DialogTitle>
                  </DialogHeader>
                  <PricingSection />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};