import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import { Eye, EyeOff, Linkedin, Lock, Mail } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";

const SIDE_PHOTO = "/marketing/auth-side.jpg";

/** Subtle curved-line texture on the dark auth panel (matches TalkAuth mock). */
const PANEL_TEXTURE = `url("data:image/svg+xml,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='800' height='900' viewBox='0 0 800 900' fill='none'>
  <path d='M-40 720 Q 220 560 520 680 T 900 620' stroke='rgba(139,92,246,0.14)' stroke-width='1.2'/>
  <path d='M-60 520 Q 260 360 560 500 T 920 440' stroke='rgba(167,139,250,0.10)' stroke-width='1'/>
  <path d='M-20 860 Q 300 700 620 820 T 940 760' stroke='rgba(109,40,217,0.12)' stroke-width='1.1'/>
  <path d='M120 980 Q 420 820 720 940' stroke='rgba(139,92,246,0.08)' stroke-width='1'/>
</svg>`)}")`;

export interface PropertyBrand {
  name: string; slug: string; logoUrl: string | null; primaryColor: string | null;
}

/** Which property is this sign-in for? Invite and reset links carry
 *  `?property=<slug>`; we remember it so the SAME person coming back later
 *  still lands on their own property's branded page rather than a generic one. */
const PROPERTY_KEY = "talkstay:property";

function usePropertyBrand(): PropertyBrand | null {
  const [brand, setBrand] = useState<PropertyBrand | null>(null);

  useEffect(() => {
    let slug = "";
    try {
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith("#")
        ? new URLSearchParams(window.location.hash.slice(1)) : new URLSearchParams();
      slug = (search.get("property") || hash.get("property") || localStorage.getItem(PROPERTY_KEY) || "").trim();
    } catch { /* private browsing */ }
    if (!slug) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("talkstay-staff", {
        body: { action: "public_branding", slug },
      });
      if (cancelled) return;
      const b = (data as any)?.branding as PropertyBrand | null | undefined;
      if (error || !b) {
        try { localStorage.removeItem(PROPERTY_KEY); } catch { /* ignore */ }
        return;
      }
      try { localStorage.setItem(PROPERTY_KEY, b.slug); } catch { /* ignore */ }
      setBrand(b);
    })();
    return () => { cancelled = true; };
  }, []);

  return brand;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.35 11.1h-9.18v2.96h5.28c-.23 1.28-.92 2.36-1.96 3.08l3.17 2.46c1.85-1.71 2.9-4.22 2.9-7.23 0-.7-.06-1.37-.22-2.03z" />
      <path fill="#34A853" d="M12.17 22c2.62 0 4.82-.87 6.43-2.36l-3.17-2.46c-.87.58-1.99.93-3.26.93-2.5 0-4.62-1.69-5.38-3.96H3.49v2.5C4.2 19.32 7.88 22 12.17 22z" />
      <path fill="#FBBC05" d="M6.79 13.15a6.19 6.19 0 010-3.92v-2.5H3.49a9.83 9.83 0 000 8.92l3.3-2.5z" />
      <path fill="#EA4335" d="M12.17 4.58c1.42 0 2.7.49 3.72 1.45l2.78-2.78C16.93 1.67 14.73.8 12.17.8 7.88.8 4.2 3.48 3.12 7.13l3.3 2.5c.76-2.27 2.88-4.05 5.75-4.05z" />
    </svg>
  );
}

/** Full-viewport split: dark patterned form panel + hospitality photo. */
function AuthShell({ children, brand }: { children: React.ReactNode; brand: PropertyBrand | null }) {
  return (
    <div data-talkstay className="flex min-h-screen">
      {/* Form panel */}
      <div
        className="relative flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-[46%] lg:px-14"
        style={{
          backgroundColor: "#0f0c29",
          backgroundImage: `${PANEL_TEXTURE}, radial-gradient(ellipse 80% 60% at 20% 0%, rgba(109,40,217,0.18), transparent 55%)`,
          backgroundSize: "cover, auto",
        }}
      >
        <div className="relative mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 transition-opacity hover:opacity-80">
            {brand?.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name}
                className="h-10 max-w-[160px] object-contain" />
            ) : (
              <>
                <TalkStayLogo size={36} />
                <span className="text-xl font-semibold tracking-tight text-white">TalkStay</span>
              </>
            )}
          </Link>
          {brand && (
            <p className="-mt-5 mb-6 text-sm font-medium text-violet-300/80">{brand.name}</p>
          )}
          {children}
          {brand && (
            <p className="mt-8 text-center text-xs text-white/35">Powered by TalkStay</p>
          )}
        </div>
      </div>

      {/* Photo panel — desktop only */}
      <div className="relative hidden flex-1 overflow-hidden lg:block">
        <img src={SIDE_PHOTO} alt="" aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center" />
      </div>
    </div>
  );
}

function AuthInput({
  id, type, value, onChange, placeholder, autoComplete, icon: Icon, trailing,
}: {
  id: string; type: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string;
  icon: typeof Mail; trailing?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        id={id} type={type} required value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
        className="h-11 rounded-xl border-0 bg-white pl-11 pr-10 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:ring-violet-500/40 md:h-11 md:px-0 md:pl-11 md:pr-10"
      />
      {trailing && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
      )}
    </div>
  );
}

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
  const brand = usePropertyBrand();
  const accent = brand?.primaryColor || "#7c3aed";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const [setupMode, setSetupMode] = useState(false);
  const [isInvite, setIsInvite] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    if (isPasswordSetupUrl()) {
      setSetupMode(true);
      const search = new URLSearchParams(window.location.search);
      setIsInvite(search.get("type") === "invite" || window.location.hash.includes("type=invite"));
    }

    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith("#")
      ? new URLSearchParams(window.location.hash.slice(1)) : new URLSearchParams();

    // OAuth / magic-link failures land here with ?error=… (and often a duplicate
    // in the hash). Surface them — otherwise Apple/Google look like a silent
    // "didn't redirect" when the callback actually succeeded but auth failed.
    const oauthErr = params.get("error_description") || params.get("error")
      || hash.get("error_description") || hash.get("error");
    if (oauthErr) {
      const decoded = decodeURIComponent(oauthErr.replace(/\+/g, " "));
      const appleSecretHint = /unable to exchange external code/i.test(decoded);
      toast.error(
        appleSecretHint
          ? "Apple sign-in failed — the Apple Secret Key in Supabase is likely expired. Regenerate it (Apple JWTs last 6 months) and try again."
          : decoded,
      );
      const property = params.get("property") || hash.get("property");
      const type = params.get("type") || hash.get("type");
      const keep = new URLSearchParams();
      if (property) keep.set("property", property);
      if (type) keep.set("type", type);
      const qs = keep.toString();
      window.history.replaceState({}, document.title, qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
      return;
    }

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
      const type = params.get("type");
      const clean = type ? `${window.location.pathname}?type=${type}` : window.location.pathname;
      window.history.replaceState({}, document.title, clean);
    })();
    return () => { cancelled = true; };
  }, []);

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

  /** Same OAuth providers as TalkWeb — shared Supabase project. Always return
   *  to TalkStay `/app` (never TalkWeb `/auth`), or the allowlist falls through
   *  to talkweb.io. */
  const signInWithProvider = async (provider: Provider, scopes: string, label: string) => {
    setBusy(true);
    try {
      const qs = brand ? `?property=${encodeURIComponent(brand.slug)}` : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          scopes,
          redirectTo: `${window.location.origin}/app${qs}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err?.message ?? `Couldn't open ${label} sign-in.`);
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
        redirectTo: `${window.location.origin}/app?type=recovery${brand ? `&property=${encodeURIComponent(brand.slug)}` : ""}`,
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

  const primaryBtnStyle = brand
    ? { backgroundColor: accent }
    : { backgroundImage: "linear-gradient(90deg, #7c3aed 0%, #5b21b6 100%)" };

  if (setupMode) {
    return (
      <AuthShell brand={brand}>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {isInvite ? "Join the team" : "Set a new password"}
        </h1>
        <p className="mt-1.5 text-sm text-white/50">
          {isInvite ? "Choose a password to finish setting up your account." : "Choose a new password for your account."}
        </p>
        <div className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-sm text-white/80">New password</Label>
            <AuthInput id="new-password" type="password" autoFocus autoComplete="new-password"
              value={newPassword} onChange={setNewPassword} icon={Lock} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-sm text-white/80">Confirm password</Label>
            <AuthInput id="confirm-password" type="password" autoComplete="new-password"
              value={confirmPassword} onChange={setConfirmPassword} icon={Lock} />
          </div>
          <Button
            className="h-11 w-full rounded-xl border-0 text-white shadow-lg hover:opacity-90"
            style={primaryBtnStyle}
            disabled={busy || !newPassword || !confirmPassword}
            onClick={finishSetup}
          >
            {busy ? "Please wait…" : isInvite ? "Join the team" : "Update password"}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell brand={brand}>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1.5 text-sm text-white/50">
        {mode === "signin" ? "Sign in to your operations dashboard." : "Set up your property's operations dashboard."}
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-white/80">Email address</Label>
          <AuthInput id="email" type="email" autoComplete="email"
            value={email} onChange={setEmail} placeholder="you@yourproperty.com" icon={Mail} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm text-white/80">Password</Label>
            {mode === "signin" && (
              <button type="button" className="text-xs text-white/45 hover:text-white/70"
                onClick={() => setShowForgot(true)}>
                Forgot password?
              </button>
            )}
          </div>
          <AuthInput
            id="password" type={showPassword ? "text" : "password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password} onChange={setPassword} icon={Lock}
            trailing={
              <button type="button" tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </div>
        <Button
          type="submit"
          className="h-11 w-full rounded-xl border-0 text-white shadow-lg hover:opacity-90"
          style={primaryBtnStyle}
          disabled={busy}
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/40">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="space-y-2.5">
        <Button
          type="button" variant="outline"
          className="h-11 w-full rounded-xl border-white/10 bg-white text-gray-800 hover:bg-white/90"
          disabled={busy} onClick={() => signInWithProvider("google", "openid email profile", "Google")}
        >
          <GoogleIcon />
          <span className="ml-2">{busy ? "Opening…" : "Continue with Google"}</span>
        </Button>
        <Button
          type="button" variant="outline"
          className="h-11 w-full rounded-xl border-white/10 bg-white text-gray-800 hover:bg-white/90"
          disabled={busy} onClick={() => signInWithProvider("linkedin_oidc", "openid email profile", "LinkedIn")}
        >
          <Linkedin className="h-4 w-4 text-[#0A66C2]" />
          <span className="ml-2">{busy ? "Opening…" : "Continue with LinkedIn"}</span>
        </Button>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
        <p className="text-sm text-white/70">Just exploring? No account needed.</p>
        <Link
          to="/demo"
          className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-violet-300 hover:text-violet-200"
        >
          Try the interactive demo <span aria-hidden>→</span>
        </Link>
      </div>

      {mode === "signup" && (
        <div className="mt-3 text-center text-sm">
          <button type="button" className="text-white/45 hover:text-white/70" onClick={resendConfirmation}>
            Didn't get the confirmation email? Resend
          </button>
        </div>
      )}

      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowForgot(false)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-left" onClick={(e) => e.stopPropagation()}>
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

      <p className="mt-6 text-center text-sm text-white/45">
        {mode === "signin" ? "Need an account? " : "Have an account? "}
        <button
          type="button"
          className="font-medium text-violet-400 hover:text-violet-300"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </AuthShell>
  );
}
