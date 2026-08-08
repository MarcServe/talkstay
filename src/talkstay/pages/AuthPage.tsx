import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "signin" | "signup";

/** True for a password-reset or team-invite link. Both exchange a one-time
 *  code into a real session immediately, but the person hasn't chosen a real
 *  password yet — callers (see HotelApp) must keep showing the "set a
 *  password" screen instead of letting the dashboard render underneath it
 *  just because a session now exists. Detected via a `type=` marker WE
 *  append to our own redirectTo/emailRedirectTo URLs (see sendReset below
 *  and talkstay-staff's invite link), so it survives regardless of how
 *  Supabase encodes the token itself. */
export function isPasswordSetupUrl(): boolean {
  if (typeof window === "undefined") return false;
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? new URLSearchParams(window.location.hash.slice(1)) : new URLSearchParams();
  const type = search.get("type") || hash.get("type");
  return type === "recovery" || type === "invite";
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const [setupMode, setSetupMode] = useState(false);
  const [isInvite, setIsInvite] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Exchange the one-time code from a confirmation / reset / invite email link.
  useEffect(() => {
    if (isPasswordSetupUrl()) {
      setSetupMode(true);
      const search = new URLSearchParams(window.location.search);
      setIsInvite(search.get("type") === "invite" || window.location.hash.includes("type=invite"));
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    let cancelled = false;
    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (cancelled) return;
      if (error) {
        toast.error(isPasswordSetupUrl()
          ? "That link has expired or was already used — request a new one."
          : "That confirmation link has expired or is invalid.");
      }
      // Strip the token from the URL but keep our own type= marker so
      // setupMode survives the cleanup.
      const type = params.get("type");
      const clean = type ? `${window.location.pathname}?type=${type}` : window.location.pathname;
      window.history.replaceState({}, document.title, clean);
    })();
    return () => { cancelled = true; };
  }, []);

  // Older (hash-token) recovery links skip the `code` query param entirely —
  // Supabase's client still fires this event once it picks the token up.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { setSetupMode(true); setIsInvite(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm it before signing in.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (!email.trim()) { toast.error("Enter your email above first."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup", email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
      toast.success("Confirmation email sent.");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't resend the confirmation email.");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!forgotEmail.trim()) { toast.error("Enter your email."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/app?type=recovery`,
      });
      if (error) throw error;
      toast.success("Password reset email sent — check your inbox.");
      setShowForgot(false);
      setForgotEmail("");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't send the reset email.");
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(isInvite ? "Welcome to the team!" : "Password updated.");
      setSetupMode(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't set your password.");
    } finally {
      setBusy(false);
    }
  };

  if (setupMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-8">
          <div className="mb-6 text-center">
            <div className="text-lg font-semibold">TalkStay</div>
            <p className="text-sm text-muted-foreground">
              {isInvite ? "Set a password to join the team" : "Set a new password"}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password" type="password" minLength={6} autoFocus
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password" type="password" minLength={6}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button className="w-full" disabled={busy || !newPassword || !confirmPassword} onClick={finishSetup}>
              {busy ? "Please wait…" : isInvite ? "Join the team" : "Update password"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8">
        <div className="mb-6 text-center">
          <div className="text-lg font-semibold">TalkStay</div>
          <p className="text-sm text-muted-foreground">Hotel operations sign in</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-3 text-center text-sm">
          {mode === "signin" ? (
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setShowForgot(true)}>
              Forgot password?
            </button>
          ) : (
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={resendConfirmation}>
              Didn't get the confirmation email? Resend
            </button>
          )}
        </div>

        {showForgot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForgot(false)}>
            <div className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-1 font-semibold">Reset your password</h3>
              <p className="mb-4 text-sm text-muted-foreground">We'll email you a link to set a new one.</p>
              <Input
                type="email" placeholder="you@example.com" autoFocus
                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendReset(); }}
              />
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForgot(false)}>Cancel</Button>
                <Button className="flex-1" disabled={busy} onClick={sendReset}>
                  {busy ? "Sending…" : "Send link"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <button
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
