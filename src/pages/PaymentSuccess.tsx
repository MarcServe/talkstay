import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingWizard } from "@/components/OnboardingWizard";

export const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'verify-payment' | 'create-account' | 'login-existing' | 'onboarding' | 'complete'>('verify-payment');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [onboardingInitialData, setOnboardingInitialData] = useState<any>(undefined);


  const plan = searchParams.get('plan');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      console.log('Starting payment verification for session:', sessionId);
      
      // Call edge function to verify payment and get customer email
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { session_id: sessionId }
      });

      console.log('Payment verification response:', { data, error });

      if (error) {
        console.error('Payment verification error from function:', error);
        throw new Error(error.message || 'Payment verification failed');
      }

      if (data?.success && data?.customer_email) {
        console.log('Payment verified successfully for:', data.customer_email);
        setCustomerEmail(data.customer_email);
        setEmail(data.customer_email);
        
        // Check if user already exists
        setCheckingUser(true);
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id, email')
          .eq('email', data.customer_email)
          .single();
        
        setCheckingUser(false);
        
        if (existingProfile) {
          console.log('Existing user found:', existingProfile.email);
          setIsExistingUser(true);
          setStep('login-existing');
          toast.success('Payment verified! Please sign in to upgrade your account.');
        } else {
          console.log('New user, proceeding with account creation');
          setIsExistingUser(false);
          setStep('create-account');
          toast.success('Payment verified successfully!');
        }
      } else {
        throw new Error('Invalid payment verification response');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Show specific error messages based on error type
      if (errorMessage.includes('Session not found')) {
        toast.error('Payment session expired or not found. Please try purchasing again.');
      } else if (errorMessage.includes('Payment not completed')) {
        toast.error('Payment was not completed. Please try again or contact support.');
      } else if (errorMessage.includes('configuration error')) {
        toast.error('Payment system error. Please contact support.');
      } else {
        toast.error(`Payment verification failed: ${errorMessage}`);
      }
      
      // Redirect to pricing page after 3 seconds
      setTimeout(() => {
        navigate('/pricing');
      }, 3000);
    }
  };

  const createAccount = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // For paid users, skip email verification and auto-confirm
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            email_confirmed: true, // Auto-confirm for paid users
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw new Error(error.message);
      }

      if (data.user) {
        // Store the actual user ID for onboarding
        console.log('✅ User created successfully, setting userId:', data.user.id);
        setUserId(data.user.id);
        
        // Create subscription record for new user
        try {
          const { error: subscriptionError } = await supabase
            .from('subscribers')
            .insert({
              user_id: data.user.id,
              email: email,
              subscribed: true,
              subscription_tier: plan,
              subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });

          if (subscriptionError) {
            console.error('Subscription creation error:', subscriptionError);
            // Don't block the flow, just log it
          }
        } catch (subError) {
          console.error('Error creating subscription:', subError);
          // Don't block the flow
        }
        
        // Wait for state to update before transitioning to onboarding
        console.log('⏳ Waiting for state propagation before showing onboarding...');
        setTimeout(() => {
          console.log('➡️ Transitioning to onboarding with userId:', data.user!.id);
          setStep('onboarding');
          toast.success(`Account created! Welcome to TalkWeb ${plan?.toUpperCase()} plan.`);
        }, 100);
      }
    } catch (error: any) {
      console.error('Account creation error:', error);
      
      // Provide helpful error messages
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please use the login option instead.');
      } else if (error.message.includes('invalid email')) {
        toast.error('Please enter a valid email address.');
      } else {
        toast.error(error.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExistingUserLogin = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect password. Please try again or reset your password using the link below.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in.');
        }
        throw new Error(error.message);
      }

      if (data.user) {
        console.log('✅ User signed in successfully, setting userId:', data.user.id);
        setUserId(data.user.id);
        
        // Update subscription status in subscribers table
        console.log('Updating subscription for existing user:', data.user.id);
        
        try {
          const { error: subscriptionError } = await supabase
            .from('subscribers')
            .upsert({
              user_id: data.user.id,
              email: email,
              subscribed: true,
              subscription_tier: plan,
              subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            });

          if (subscriptionError) {
            console.error('Subscription update error:', subscriptionError);
            // Don't block the flow, just log it
          } else {
            console.log('Subscription updated successfully for user:', data.user.id);
          }
        } catch (subError) {
          console.error('Error updating subscription:', subError);
          // Don't block the flow
        }
        
        // Check existing profile to decide whether to skip onboarding
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, company_name, business_type, website_url, business_description, phone, onboarding_completed')
          .eq('user_id', data.user.id)
          .maybeSingle();

        const profileComplete =
          existingProfile?.onboarding_completed === true ||
          !!(existingProfile?.first_name && existingProfile?.last_name && existingProfile?.company_name);

        if (profileComplete) {
          toast.success(`Welcome back! Your account has been upgraded to ${plan?.toUpperCase()} plan.`);
          setTimeout(() => navigate('/dashboard'), 300);
          return;
        }

        if (existingProfile) {
          setOnboardingInitialData({
            firstName: existingProfile.first_name || '',
            lastName: existingProfile.last_name || '',
            companyName: existingProfile.company_name || '',
            businessType: existingProfile.business_type || '',
            websiteUrl: existingProfile.website_url || '',
            businessDescription: existingProfile.business_description || '',
            phone: existingProfile.phone || '',
          });
        }

        // Wait for state to update before transitioning to onboarding
        console.log('⏳ Waiting for state propagation before showing onboarding...');
        setTimeout(() => {
          console.log('➡️ Transitioning to onboarding with userId:', data.user!.id);
          setStep('onboarding');
          toast.success(`Welcome back! Finish a quick setup to activate your ${plan?.toUpperCase()} plan.`);
        }, 100);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const resendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Verification email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'verify-payment':
        return (
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verifying Payment</h2>
            <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
          </div>
        );

      case 'login-existing':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-2">
                Welcome back! Sign in to upgrade your account to <span className="font-semibold text-primary">{plan?.toUpperCase()}</span> plan.
              </p>
              <p className="text-sm text-muted-foreground">
                We found an existing account with this email. Please sign in to complete your upgrade.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password) {
                      handleExistingUserLogin();
                    }
                  }}
                  autoFocus
                />
              </div>

              <Button 
                onClick={handleExistingUserLogin} 
                disabled={loading || !password}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In & Upgrading...
                  </>
                ) : (
                  'Sign In & Upgrade Account'
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Forgot your password?{' '}
                <a 
                  href="/auth?reset=true" 
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Reset it here
                </a>
              </div>
            </div>
          </div>
        );

      case 'create-account':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-2">
                Welcome to TalkWeb <span className="font-semibold text-primary">{plan?.toUpperCase()}</span> plan!
              </p>
              <p className="text-sm text-muted-foreground">
                Let's create your account to get started with your AI voice assistant.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={customerEmail !== ''}
                  className={customerEmail ? 'bg-muted' : ''}
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a secure password (min. 6 characters)"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 6 characters long
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email && password && confirmPassword) {
                      createAccount();
                    }
                  }}
                />
              </div>

              <Button 
                onClick={createAccount} 
                disabled={loading || !email || !password || !confirmPassword}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Your Account...
                  </>
                ) : (
                  'Create Account & Get Started'
                )}
              </Button>
            </div>
          </div>
        );

      case 'onboarding':
        return (
          <OnboardingWizard 
            plan={plan || 'Premium'} 
            userEmail={email}
            userId={userId || ''} // Use actual user ID from signup
            initialData={onboardingInitialData}
          />

        );

      default:
        return null;
    }
  };

  if (step === 'onboarding') {
    return renderStep();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        {renderStep()}
      </Card>
    </div>
  );
};