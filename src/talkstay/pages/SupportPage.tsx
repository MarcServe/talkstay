import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import {
  MAILTO_SUPPORT,
  SUPPORT_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  TEL_SUPPORT,
} from "@/config/contact";
import { LifeBuoy, Mail, Phone, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import GuestAccessTip from "@/talkstay/components/GuestAccessTip";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do guests request help?",
    a: "Each room or named area has a QR code guests can scan to open the TalkStay Room Assistant and ask by voice or chat. You can also email them a direct Room Assistant link (with their check-in details) so they open the same assistant from anywhere — hotel Wi‑Fi, mobile data, or another device — with no app to download. Requests route to the right department on your Operations board automatically.",
  },
  {
    q: "Can guests use TalkStay without scanning the QR in the room?",
    a: "Yes. From Rooms & QR, email the guest their check-in code and Room Assistant link. Opening that link on their phone works from anywhere. Scanning the printed QR is still the fastest in-room option; email is ideal when they’re busy at arrival or away from the property.",
  },
  {
    q: "Can someone order without being checked into a room?",
    a: "Yes. Open Rooms & QR → Venues & tables. Add Lobby, Bar, Pool, Restaurant (or a custom table name) — those are Public QR areas with no check-in code. Orders attach to the location (and optional guest/table note), not a bedroom. Scan your menu under Knowledge or Departments → Menu, then print the venue QRs for the tables.",
  },
  {
    q: "How do payments work for rooms vs public areas?",
    a: "Resident guests can pay now or charge to room / settle at checkout. Walk-ins on a Public QR can pay now or at the counter. To charge a lobby order to a room, the guest must enter their room check-in code — TalkStay never accepts a typed room number alone, and only occupied private rooms qualify.",
  },
  {
    q: "How do staff log phone or walk-in orders?",
    a: "Use Log order for calls and walk-ups that aren’t already on the board. Pick the room or a Public QR area, add an optional guest/table note, and choose whether it’s chargeable. Guest-app tickets appear on Operations without logging again.",
  },
  {
    q: "How do my team get notified?",
    a: "Enable alert sounds and notifications from the dashboard sidebar. Department notify emails and escalation timers are set under Departments. Push works best when the ops app is installed to the home screen on phones.",
  },
  {
    q: "I was referred by a partner — who do I contact?",
    a: "If your property has a referral code on file, Support in your signed-in Account routes to that partner. Otherwise email TalkStay at the address below. You can also open Account in the dashboard for a direct, property-aware Support link.",
  },
  {
    q: "Where are privacy and terms?",
    a: "See Privacy, Terms, Cookies, Acceptable use, and Data processing linked in the footer of this site.",
  },
];

export default function SupportPage() {
  const { user } = useAuth();

  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <TalkStayLogo size={28} />
            <span className="font-semibold tracking-tight">TalkStay</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <Link to="/app" className="text-muted-foreground hover:text-foreground">
                Open dashboard
              </Link>
            ) : (
              <Link to="/app" className="text-muted-foreground hover:text-foreground">
                Property sign in
              </Link>
            )}
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <div className="flex items-center gap-2 text-violet-700">
          <LifeBuoy className="h-5 w-5" />
          <p className="text-xs font-semibold uppercase tracking-wide">Support</p>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Help & FAQ</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Answers for property teams and partners. Signed-in users also get direct Support from Account in the dashboard — routed to your partner when one is assigned.
        </p>
        <GuestAccessTip className="mt-6" />

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a
            href={MAILTO_SUPPORT}
            className="flex items-start gap-3 rounded-2xl border bg-card/80 p-4 transition-colors hover:border-violet-300"
          >
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
            <div>
              <p className="text-sm font-semibold text-foreground">Email Support</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
            </div>
          </a>
          <a
            href={TEL_SUPPORT}
            className="flex items-start gap-3 rounded-2xl border bg-card/80 p-4 transition-colors hover:border-violet-300"
          >
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
            <div>
              <p className="text-sm font-semibold text-foreground">Phone</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{SUPPORT_PHONE}</p>
            </div>
          </a>
        </div>

        {user && (
          <div className="mt-4 rounded-2xl border border-violet-200/80 bg-violet-50/60 px-4 py-3 text-sm text-violet-950">
            <p className="font-medium">You’re signed in</p>
            <p className="mt-1 text-xs text-violet-900/80">
              For property-aware help (and partner routing), open Account in your dashboard — Direct Support includes your property name.
            </p>
            <Button asChild size="sm" className="mt-3 bg-violet-600 hover:bg-violet-700">
              <Link to="/app?tab=account">
                Open Account <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}

        <h2 className="mt-10 text-lg font-semibold tracking-tight">Frequently asked</h2>
        <Accordion type="single" collapsible className="mt-3">
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm font-medium">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">TalkStay by TalkWeb</p>
          <p className="mt-1">{SUPPORT_ADDRESS}</p>
          <p className="mt-2">
            <a href={MAILTO_SUPPORT} className="text-violet-700 underline">{SUPPORT_EMAIL}</a>
            {" · "}
            <a href={TEL_SUPPORT} className="text-violet-700 underline">{SUPPORT_PHONE}</a>
          </p>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-4 gap-y-2 px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} TalkStay by TalkWeb</span>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
        </div>
      </footer>
    </div>
  );
}
