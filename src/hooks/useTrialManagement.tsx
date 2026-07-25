import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TrialData {
  id: string;
  user_id: string;
  email: string;
  trial_start_date: string;
  trial_end_date: string;
  trial_status: 'active' | 'expired' | 'cancelled';
  trial_type: 'standard' | 'extended';
  features_used: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface TrialEligibility {
  eligible: boolean;
  reason: string;
  existing_trial_id?: string;
  existing_trial_status?: string;
}

export const useTrialManagement = () => {
  const { user, session } = useAuth();
  const [trialData, setTrialData] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<TrialEligibility | null>(null);

  // Generate a simple device fingerprint
  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return btoa(fingerprint).slice(0, 50);
  };

  // Get user's IP address (simplified)
  const getUserIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Could not get IP address:', error);
      return null;
    }
  };

  // Check trial eligibility
  const checkTrialEligibility = async (email?: string) => {
    if (!email && !user?.email) return null;
    
    setLoading(true);
    try {
      const userEmail = email || user?.email;
      const ip_address = await getUserIP();
      const device_fingerprint = generateDeviceFingerprint();

      const { data, error } = await supabase.functions.invoke('check-trial-eligibility', {
        body: {
          email: userEmail,
          ip_address,
          device_fingerprint
        }
      });

      if (error) {
        console.error('Error checking trial eligibility:', error);
        return null;
      }

      setEligibility(data);
      return data;
    } catch (error) {
      console.error('Error checking trial eligibility:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create a new trial
  const createTrial = async (trialType: 'standard' | 'extended' = 'standard') => {
    if (!user || !session) {
      throw new Error('User must be authenticated to create trial');
    }

    setLoading(true);
    try {
      const ip_address = await getUserIP();
      const device_fingerprint = generateDeviceFingerprint();

      const { data, error } = await supabase.functions.invoke('create-trial', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          ip_address,
          device_fingerprint,
          trial_type: trialType
        }
      });

      if (error) {
        console.error('Error creating trial:', error);
        throw new Error(error.message || 'Failed to create trial');
      }

      if (!data.success) {
        throw new Error(data.reason || 'Failed to create trial');
      }

      // Refresh trial data
      await fetchTrialData();
      
      return data;
    } catch (error) {
      console.error('Error creating trial:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's trial data
  const fetchTrialData = async () => {
    if (!user?.email) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_trials')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error fetching trial data:', error);
        return;
      }

      setTrialData(data);
    } catch (error) {
      console.error('Error fetching trial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has active trial
  const hasActiveTrial = () => {
    if (!trialData) return false;
    
    return trialData.trial_status === 'active' && 
           new Date(trialData.trial_end_date) > new Date();
  };

  // Get days remaining in trial
  const getTrialDaysRemaining = () => {
    if (!trialData || !hasActiveTrial()) return 0;
    
    const endDate = new Date(trialData.trial_end_date);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Update trial feature usage
  const updateFeatureUsage = async (feature: string, usage: any) => {
    if (!trialData) return;

    try {
      const updatedFeatures = {
        ...trialData.features_used,
        [feature]: usage
      };

      const { error } = await supabase
        .from('user_trials')
        .update({ features_used: updatedFeatures })
        .eq('id', trialData.id);

      if (error) {
        console.error('Error updating feature usage:', error);
        return;
      }

      // Update local state
      setTrialData(prev => prev ? {
        ...prev,
        features_used: updatedFeatures
      } : null);
    } catch (error) {
      console.error('Error updating feature usage:', error);
    }
  };

  // Fetch trial data on user change
  useEffect(() => {
    if (user?.email) {
      fetchTrialData();
    } else {
      setTrialData(null);
    }
  }, [user?.email]);

  return {
    trialData,
    loading,
    eligibility,
    hasActiveTrial: hasActiveTrial(),
    trialDaysRemaining: getTrialDaysRemaining(),
    checkTrialEligibility,
    createTrial,
    fetchTrialData,
    updateFeatureUsage,
  };
};