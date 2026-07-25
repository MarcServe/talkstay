import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gift, Clock, CheckCircle, AlertTriangle, Mail } from "lucide-react";
import { useTrialManagement } from "@/hooks/useTrialManagement";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

export const TrialBanner = () => {
  const { user } = useAuth();
  const { trialData, hasActiveTrial, trialDaysRemaining } = useTrialManagement();
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (trialData?.trial_end_date) {
      const updateTimeRemaining = () => {
        const now = new Date();
        const endDate = new Date(trialData.trial_end_date);
        const timeDiff = endDate.getTime() - now.getTime();

        if (timeDiff > 0) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          
          if (days > 0) {
            setTimeRemaining(`${days} day${days > 1 ? 's' : ''} remaining`);
          } else if (hours > 0) {
            setTimeRemaining(`${hours} hour${hours > 1 ? 's' : ''} remaining`);
          } else {
            setTimeRemaining("Less than 1 hour remaining");
          }
        } else {
          setTimeRemaining("Trial expired");
        }
      };

      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [trialData?.trial_end_date]);

  const calculateProgress = () => {
    if (!trialData?.trial_start_date || !trialData?.trial_end_date) return 0;
    
    const start = new Date(trialData.trial_start_date);
    const end = new Date(trialData.trial_end_date);
    const now = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  const getDaysIntoTrial = () => {
    if (!trialData?.trial_start_date) return 0;
    
    const start = new Date(trialData.trial_start_date);
    const now = new Date();
    
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isTrialExpired = () => {
    return !hasActiveTrial;
  };

  if (!user || !trialData) {
    return null;
  }

  const progress = calculateProgress();
  const daysIntoTrial = getDaysIntoTrial();
  const isExpiringSoon = trialDaysRemaining <= 3;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isTrialExpired() ? (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            ) : (
              <Gift className="w-6 h-6 text-primary" />
            )}
            <div>
              <CardTitle className="text-lg">
                {isTrialExpired() ? "Trial Expired" : "Free Trial Active"}
              </CardTitle>
              <CardDescription>
                {isTrialExpired() 
                  ? "Your 7-day trial has ended" 
                   : `Day ${daysIntoTrial + 1} of 7 - ${timeRemaining}`
                }
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {daysIntoTrial >= 7 && !isTrialExpired() && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Email reminders active
              </Badge>
            )}
            
            {hasActiveTrial && (
              <Badge 
                variant={isExpiringSoon ? "destructive" : "outline"} 
                className="flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                {trialDaysRemaining} days left
              </Badge>
            )}
            
            {isTrialExpired() && (
              <Badge variant="destructive">
                Expired
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {hasActiveTrial && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Trial Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="space-y-1">
            {isTrialExpired() ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Don't lose access to your voice AI assistant! Upgrade now to continue using all features.
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">20% discount on annual plans</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Enjoying your trial? Upgrade anytime to secure your settings and continue without interruption.
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    {daysIntoTrial >= 7 ? "You'll receive upgrade reminders via email" : "Full access to all features"}
                  </span>
                </div>
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            {isTrialExpired() ? (
              <Button asChild size="sm" className="whitespace-nowrap">
                <Link to="/pricing">
                  Reactivate Now
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard">
                    View Dashboard
                  </Link>
                </Button>
                <Button asChild size="sm" className="whitespace-nowrap">
                  <Link to="/pricing">
                    Upgrade Early
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Email Reminder Status */}
        {hasActiveTrial && daysIntoTrial >= 7 && (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Email Reminders Enabled</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {daysIntoTrial >= 12 
                ? "You'll receive final upgrade reminders as your trial ends"
                : "You'll receive helpful reminders about upgrading before your trial expires"
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};