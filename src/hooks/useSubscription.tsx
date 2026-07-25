import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  is_trial_user?: boolean;
  trial_expires_at?: string;
  email_verified?: boolean;
  can_use_firecrawl?: boolean;
  trial_firecrawl_usage?: number;
}

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({ subscribed: false });
  const [loading, setLoading] = useState(false);

  const checkSubscription = async () => {
    if (!user || !session) {
      setSubscription({ subscribed: false });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setSubscription({ subscribed: false });
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription({ subscribed: false });
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (plan: string, planData?: { amount: number; name: string; description: string; interval?: string }, currency?: string, interval?: string) => {
    if (!user || !session) {
      throw new Error('User must be authenticated to subscribe');
    }

    try {
      console.log('Creating checkout for authenticated user:', { plan, email: user.email });
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { plan, email: user.email, planData, currency, interval },
      });

      console.log('Create checkout response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (data?.url) {
        console.log('Redirecting to Stripe checkout:', data.url);
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw error;
    }
  };

  const openCustomerPortal = async () => {
    if (!user || !session) {
      throw new Error('User must be authenticated to access customer portal');
    }

    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    // Redirect to Stripe customer portal
    window.location.href = data.url;
  };

  useEffect(() => {
    if (user && session) {
      checkSubscription();
    }
  }, [user, session]);

  // Helper functions for trial management
  const isTrialUser = subscription.is_trial_user || false;
  const emailVerified = subscription.email_verified || false;
  const canUseFirecrawl = subscription.can_use_firecrawl || false;
  const trialFirecrawlUsage = subscription.trial_firecrawl_usage || 0;
  const trialFirecrawlLimit = 5;
  
  const getTrialDaysRemaining = () => {
    if (!subscription.trial_expires_at) return 0;
    const expiresAt = new Date(subscription.trial_expires_at);
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return {
    subscription,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    // Trial-specific fields
    isTrialUser,
    emailVerified,
    canUseFirecrawl,
    trialFirecrawlUsage,
    trialFirecrawlLimit,
    getTrialDaysRemaining,
  };
};