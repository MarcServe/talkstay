import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Building2, Mic, QrCode, Shield, Users,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";

/**
 * Marketing demo hub — one CTA destination that offers Guest vs Staff experiences.
 * Deep links: /demo/guest · /demo/operations
 */
export default function DemoHub() {
  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <TalkStayLogo size={28} />
          <span className="text-lg font-semibold tracking-tight">TalkStay</span>
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/app">Property sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            Interactive demos · no signup · no download
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Experience TalkStay
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Pick a side. See exactly what guests do after scanning a room QR —
            and what hotel staff see when requests come in.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            to="/demo/guest"
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-white p-6 shadow-sm transition hover:border-violet-400 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
              <Mic className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">I'm a Guest</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              See how guests ask, request and get help — towels, breakfast, cleaning,
              food prices, problems, and request status.
            </p>
            <span className="mt-5 inline-flex items-center text-sm font-semibold text-violet-700 group-hover:gap-2">
              Guest Experience Demo
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Opens Room 306 · The Grand Hotel II
            </p>
          </Link>

          <Link
            to="/demo/operations"
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-white p-6 shadow-sm transition hover:border-teal-400 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">I'm Hotel Staff</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              See how requests are routed, tracked and completed — live queue, departments,
              status changes, guest reviews, and Insights.
            </p>
            <span className="mt-5 inline-flex items-center text-sm font-semibold text-teal-800 group-hover:gap-2">
              Operations Dashboard Demo
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Owner view · switch to a department role anytime
            </p>
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border bg-card/80 p-5 sm:p-6">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight">Each department gets its own dashboard</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                The owner or manager invites staff and assigns a role. Housekeeping only sees
                housekeeping tickets. Kitchen and bar see theirs. Managers and owners see every
                department plus Insights. Switch roles inside the Operations demo to feel that
                difference.
              </p>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <li className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <span><span className="font-medium text-foreground">Staff</span> — one department queue</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  <span><span className="font-medium text-foreground">Manager</span> — all queues + Insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span><span className="font-medium text-foreground">Owner</span> — full setup + team invites</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Deep links for campaigns:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">/demo/guest</code>
          {" · "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">/demo/operations</code>
          {" · "}
          hub{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">/demo</code>
        </p>

        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline">
            <Link to="/app">Create a real property account</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
