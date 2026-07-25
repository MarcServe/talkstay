import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mic, ArrowLeft, Linkedin, Apple } from "lucide-react";
import { Link } from "react-router-dom";
export const Auth = () => {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isEmailVerificationFlow, setIsEmailVerificationFlow] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isPasswordRecoveryUrl = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash || "";
    const hashParams = hash.startsWith("#") ? new URLSearchParams(hash.slice(1)) : new URLSearchParams();
    return searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery";
  };

  useEffect(() => {
    // If we're coming from an auth email link (PKCE), we must NOT redirect away before exchanging the code.
    const params = new URLSearchParams(window.location.search);
    if (params.has("code")) return;

    // Don't auto-redirect during password recovery flows (we need the user to set a new password).
    if (isPasswordRecoveryUrl()) {
      setIsRecoveryMode(true);
      return;
    }

    // Check if user is already logged in
    const checkUser = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session) {
        const next = params.get("next") || "/dashboard";
        navigate(next, {
          replace: true
        });
      }
    };

    checkUser();
  }, [navigate]);

  // PKCE email links (confirm email / reset password) return with ?code=... which must be exchanged for a session.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    const isRecoveryHint = isPasswordRecoveryUrl();
    if (isRecoveryHint) {
      setIsRecoveryMode(true);
    } else {
      // This is an email verification flow (signup confirmation)
      setIsEmailVerificationFlow(true);
    }

    let cancelled = false;

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (cancelled) return;

      if (error) {
        toast({
          title: isRecoveryHint ? "Password reset link expired or invalid" : "Email link expired or invalid",
          description: isRecoveryHint ? "Please click “Forgot password?” to request a new reset link." : "Please request a new confirmation email.",
          variant: "destructive"
        });
      }

      // Clean up URL but preserve the 'next' parameter
      const next = params.get("next");
      const cleanUrl = next ? `${window.location.pathname}?next=${encodeURIComponent(next)}` : window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  // SEO: title, description, canonical
  useEffect(() => {
    document.title = "Sign in to TalkWeb | The Voice Layer for the Internet";
    const desc = "Sign in or create your TalkWeb account. Too much to read? Let your visitors just ask.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
    const canonicalHref = `${window.location.origin}/auth`;
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonicalHref);
  }, []);

  // Surface auth error messages if present in URL (email verification or OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error") || params.get("error_description");
    const errorCode = params.get("error_code");

    if (err) {
      // Check if this is an email verification error vs OAuth error
      const isEmailVerificationError = errorCode === 'otp_expired' || errorCode === 'otp_disabled' || errorCode === 'invalid_token' || err.includes('expired') || err.includes('invalid') || err.includes('Email link');

      if (isEmailVerificationError) {
        toast({
          title: "Email link expired or invalid",
          description: "Your confirmation link has expired or was already used. Please request a new confirmation email by signing up again with the same email.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sign-in failed",
          description: decodeURIComponent(err),
          variant: "destructive"
        });
      }
      // Clean up URL but preserve the 'next' parameter
      const next = params.get("next");
      const cleanUrl = next ? `${window.location.pathname}?next=${encodeURIComponent(next)}` : window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [toast]);

  // Handle successful email verification and password recovery
  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      const recoveryFromUrl = isPasswordRecoveryUrl();

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && recoveryFromUrl)) {
        setIsRecoveryMode(true);
        toast({
          title: "Set your new password",
          description: "Please enter your new password below."
        });
        return;
      }

      if (event === 'SIGNED_IN' && session && !isRecoveryMode) {
        // Only show email verification toast if this was an email verification flow
        if (isEmailVerificationFlow) {
          toast({
            title: "Email verified successfully!",
            description: "Welcome to TalkWeb. Redirecting to your dashboard..."
          });
        }
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next") || "/dashboard";
        setTimeout(() => navigate(next, {
          replace: true
        }), 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast, isRecoveryMode]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/auth?next=/dashboard`;
    const {
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Check your email!",
        description: "We sent you a confirmation link to verify your account. Please check your email to complete registration."
      });
    }
    setIsLoading(false);
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const {
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/dashboard";
      navigate(next);
    }
    setIsLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to resend the confirmation.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?next=/dashboard`
      }
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Confirmation email sent!",
        description: "Please check your inbox for the new confirmation link.",
      });
    }
    setIsLoading(false);
  };

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/auth?type=recovery`
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Password reset email sent!",
        description: "Please check your inbox for the password reset link.",
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Password updated successfully!",
        description: "Redirecting to your dashboard...",
      });
      setIsRecoveryMode(false);
      setNewPassword("");
      setConfirmPassword("");
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    toast({
      title: "Redirecting to Google…",
      description: "Please complete sign-in in the Google window."
    });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "openid email profile",
          redirectTo: `${window.location.origin}/auth?next=/dashboard`
        }
      });
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedInAuth = async () => {
    setIsLoading(true);
    toast({
      title: "Redirecting to LinkedIn…",
      description: "Please complete sign-in in the LinkedIn window."
    });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: {
          scopes: "openid email profile",
          redirectTo: `${window.location.origin}/auth?next=/dashboard`
        }
      });
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setIsLoading(true);
    toast({
      title: "Redirecting to Apple…",
      description: "Please complete sign-in in the Apple window."
    });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          scopes: "name email",
          redirectTo: `${window.location.origin}/auth?next=/dashboard`
        }
      });
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      
      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Link to="/" aria-label="TalkWeb Home">
              <img src="/lovable-uploads/d8670dc7-02cf-487b-8267-ebcdb13bffb5.png" alt="TalkWeb Logo" className="w-[120px] h-[120px] hover:opacity-90 transition-opacity" />
            </Link>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Sign in or create your TalkWeb account</h1>
          <p className="text-muted-foreground">Build AI voice assistants for your website</p>
        </div>

        <Card className="bg-glass border-glass backdrop-blur-md p-6">
          {isRecoveryMode ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center">Set New Password</h2>
              <p className="text-sm text-muted-foreground text-center">
                Enter your new password below.
              </p>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>
              <Button
                onClick={handleUpdatePassword}
                variant="hero"
                size="xl"
                className="w-full"
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="w-full text-sm text-muted-foreground hover:text-primary underline"
              >
                Cancel
              </button>
            </div>
          ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
                </div>
                <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <div className="mt-3 text-center">
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(true)} 
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Forgot Password Modal */}
              {showForgotPassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="mb-4"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setForgotPasswordEmail('');
                        }}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleForgotPassword}
                        disabled={isLoading || !forgotPasswordEmail}
                      >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="my-4 text-center text-sm text-muted-foreground">or</div>
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogleAuth} disabled={isLoading}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.35 11.1h-9.18v2.96h5.28c-.23 1.28-.92 2.36-1.96 3.08l3.17 2.46c1.85-1.71 2.9-4.22 2.9-7.23 0-.7-.06-1.37-.22-2.03z"></path>
                  <path d="M12.17 22c2.62 0 4.82-.87 6.43-2.36l-3.17-2.46c-.87.58-1.99.93-3.26.93-2.5 0-4.62-1.69-5.38-3.96H3.49v2.5C4.2 19.32 7.88 22 12.17 22z"></path>
                  <path d="M6.79 13.15a6.19 6.19 0 010-3.92v-2.5H3.49a9.83 9.83 0 000 8.92l3.3-2.5z"></path>
                  <path d="M12.17 4.58c1.42 0 2.7.49 3.72 1.45l2.78-2.78C16.93 1.67 14.73.8 12.17.8 7.88.8 4.2 3.48 3.12 7.13l3.3 2.5c.76-2.27 2.88-4.05 5.75-4.05z"></path>
                </svg>
                <span>{isLoading ? "Opening Google…" : "Continue with Google"}</span>
              </Button>
              <Button type="button" variant="outline" className="w-full mt-2" onClick={handleLinkedInAuth} disabled={isLoading}>
                <Linkedin className="w-4 h-4" />
                <span>{isLoading ? "Opening LinkedIn…" : "Continue with LinkedIn"}</span>
              </Button>
              <Button type="button" variant="outline" className="w-full mt-2" onClick={handleAppleAuth} disabled={isLoading}>
                <Apple className="w-4 h-4" />
                <span>{isLoading ? "Opening Apple…" : "Continue with Apple"}</span>
              </Button>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" required minLength={6} />
                </div>
                <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
              <div className="my-4 text-center text-sm text-muted-foreground">or</div>
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogleAuth} disabled={isLoading}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.35 11.1h-9.18v2.96h5.28c-.23 1.28-.92 2.36-1.96 3.08l3.17 2.46c1.85-1.71 2.9-4.22 2.9-7.23 0-.7-.06-1.37-.22-2.03z"></path>
                  <path d="M12.17 22c2.62 0 4.82-.87 6.43-2.36l-3.17-2.46c-.87.58-1.99.93-3.26.93-2.5 0-4.62-1.69-5.38-3.96H3.49v2.5C4.2 19.32 7.88 22 12.17 22z"></path>
                  <path d="M6.79 13.15a6.19 6.19 0 010-3.92v-2.5H3.49a9.83 9.83 0 000 8.92l3.3-2.5z"></path>
                  <path d="M12.17 4.58c1.42 0 2.7.49 3.72 1.45l2.78-2.78C16.93 1.67 14.73.8 12.17.8 7.88.8 4.2 3.48 3.12 7.13l3.3 2.5c.76-2.27 2.88-4.05 5.75-4.05z"></path>
                </svg>
                <span>{isLoading ? "Opening Google…" : "Continue with Google"}</span>
              </Button>
              <Button type="button" variant="outline" className="w-full mt-2" onClick={handleLinkedInAuth} disabled={isLoading}>
                <Linkedin className="w-4 h-4" />
                <span>{isLoading ? "Opening LinkedIn…" : "Continue with LinkedIn"}</span>
              </Button>
              <Button type="button" variant="outline" className="w-full mt-2" onClick={handleAppleAuth} disabled={isLoading}>
                <Apple className="w-4 h-4" />
                <span>{isLoading ? "Opening Apple…" : "Continue with Apple"}</span>
              </Button>
              <div className="mt-3 text-center">
                <button 
                  type="button" 
                  onClick={handleResendConfirmation} 
                  className="text-sm text-muted-foreground hover:text-primary underline"
                  disabled={isLoading}
                >
                  Didn't receive confirmation email? Resend
                </button>
              </div>
            </TabsContent>
          </Tabs>
          )}
          <div className="mt-6 text-xs text-muted-foreground space-y-2 text-center">
            <p>
              By continuing, you agree to our <a href="/terms-of-service" className="underline hover:text-primary">Terms of Service</a> and acknowledge our
              <a href="/privacy-policy" className="underline hover:text-primary ml-1">Privacy Policy</a> and <a href="/cookie-policy" className="underline hover:text-primary">Cookie Policy</a>.
            </p>
            <p className="max-w-prose mx-auto">
              Google OAuth disclosure: We use your Google account email and basic profile to authenticate you into TalkWeb. We do not access other Google data or share your information. You can revoke access anytime in your Google Account permissions.
            </p>
            <p>Need help? <a href="/contact" className="underline hover:text-primary">Contact support</a>.</p>
          </div>
        </Card>
      </div>
    </div>;
};