import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTrialManagement } from "@/hooks/useTrialManagement";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

export const TrialCreationHandler = () => {
  const { user } = useAuth();
  const { createTrial, trialData, checkTrialEligibility } = useTrialManagement();
  const { subscription } = useSubscription();

  useEffect(() => {
    const handleTrialCreation = async () => {
      // Only proceed if user is authenticated and doesn't have trial data yet
      if (!user?.email || trialData) return;

      // If user is already subscribed, don't check trial eligibility
      if (subscription?.subscribed) {
        console.log('User is already subscribed, skipping trial creation');
        return;
      }

      try {
        // Check if user is eligible for trial
        const eligibility = await checkTrialEligibility(user.email);
        
        if (eligibility?.eligible) {
          console.log('User is eligible for trial, creating...');
          
          // Create trial automatically for new users
          await createTrial('standard');
          
          toast.success(
            "Welcome! Your 7-day free trial has started.",
            {
              description: "Enjoy full access to all features during your trial period.",
              duration: 5000,
            }
          );
        } else {
          console.log('User not eligible for trial:', eligibility?.reason);
          
          // Check if user became subscribed during eligibility check
          if (subscription?.subscribed) {
            toast.success(
              "You're already subscribed!",
              {
                description: "You have full access to all features.",
                duration: 4000,
              }
            );
          } else if (eligibility?.reason && !eligibility.reason.includes('System error')) {
            // Only show toast for genuine ineligibility, not system errors
            toast.info(
              "Trial not available",
              {
                description: eligibility.reason,
                duration: 4000,
              }
            );
          }
        }
      } catch (error) {
        console.error('Error in trial creation handler:', error);
        
        // Only show error toast for user-facing issues
        if (error instanceof Error && !error.message.includes('System error')) {
          toast.error(
            "Could not start trial",
            {
              description: error.message,
              duration: 4000,
            }
          );
        }
      }
    };

    // Add a small delay to ensure user data is fully loaded
    const timer = setTimeout(handleTrialCreation, 1000);
    
    return () => clearTimeout(timer);
  }, [user?.email, trialData, createTrial, checkTrialEligibility, subscription?.subscribed]);

  // This component doesn't render anything
  return null;
};