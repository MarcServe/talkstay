import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, CalendarCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * "Book a live demo" — a lead form, deliberately not a scheduler. There is no
 * calendar integration yet, so this captures the request and a human confirms
 * with a meeting link. Fewer fields than a booking flow: every extra one costs
 * conversions, and the rest can be asked on the call.
 */
export default function BookDemoDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSend = name.trim().length > 1 && emailOk && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    try {
      let source: string | undefined;
      try { source = localStorage.getItem("talkstay:referral") ?? undefined; } catch { /* ignore */ }

      const { data, error } = await supabase.functions.invoke("talkstay-admin", {
        body: {
          action: "submit_demo_request",
          name: name.trim(), email: email.trim(), company: company.trim(),
          phone: phone.trim(), preferredTime: preferredTime.trim(),
          message: message.trim(), source,
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send that — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <CalendarCheck className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">Book a live demo</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <div>
              <p className="font-semibold">Thanks — we'll be in touch.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll email <strong>{email.trim()}</strong> to confirm a time and send
                your meeting link.
              </p>
            </div>
            <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              See TalkStay running on a real property — about 20 minutes, no slides.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="d-name" className="text-xs font-medium text-muted-foreground">Your name *</label>
              <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah Campbell" autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="d-email" className="text-xs font-medium text-muted-foreground">Work email *</label>
              <Input id="d-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourproperty.com" autoComplete="email" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="d-company" className="text-xs font-medium text-muted-foreground">Property</label>
                <Input id="d-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="The Grand Hotel" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="d-phone" className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input id="d-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" autoComplete="tel" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="d-when" className="text-xs font-medium text-muted-foreground">When suits you?</label>
              <Input id="d-when" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} placeholder="e.g. weekday mornings, UK time" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="d-msg" className="text-xs font-medium text-muted-foreground">Anything specific you'd like to see?</label>
              <Textarea id="d-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Optional" />
            </div>
            <Button type="submit" disabled={!canSend} className="w-full bg-violet-600 hover:bg-violet-700">
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Request a demo
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              We'll only use these details to arrange your demo.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
