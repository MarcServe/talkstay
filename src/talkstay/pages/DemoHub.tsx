import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, QrCode, Shield, Users,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";

const GUEST_IMG = {
  jpg: "/marketing/guest-square.jpg",
  webp: "/marketing/guest-square.webp",
  srcSet: "/marketing/guest-square-640.webp 640w, /marketing/guest-square-1000.webp 1000w, /marketing/guest-square.webp 1100w",
};

const STAFF_IMG = "/marketing/auth-side.jpg";

/**
 * Marketing demo hub — one CTA destination that offers Guest vs Staff experiences.
 * Deep links: /demo/guest · /demo/operations
 */
export default function DemoHub() {
  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <TalkStayLogo size={28} />
          <span className="text-lg font-semibold tracking-tight">TalkStay</span>
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/app">Property sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
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

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {/* Guest — violet identity + guest phone photo */}
          <Link
            to="/demo/guest"
            className="group flex flex-col overflow-hidden rounded-3xl border border-violet-300/70 bg-white shadow-sm ring-1 ring-violet-500/10 transition hover:-translate-y-0.5 hover:border-violet-500 hover:shadow-lg"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-violet-950">
              <picture>
                <source type="image/webp" srcSet={GUEST_IMG.srcSet} sizes="(min-width: 1024px) 28rem, 100vw" />
                <img
                  src={GUEST_IMG.jpg}
                  alt="Guest using TalkStay on a phone in their room"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  loading="eager"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-violet-950/85 via-violet-900/25 to-transparent" />
              <span className="absolute left-4 top-4 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                Guest
              </span>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">I'm a Guest</p>
                <p className="mt-0.5 text-sm text-violet-100/90">After the room QR scan</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col border-t border-violet-100 bg-gradient-to-b from-violet-50/90 to-white p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-slate-600">
                Tap to Talk with the real in-room voice assistant — ask for towels, breakfast hours,
                room cleaning, food &amp; drink, report a problem, and track request status.
              </p>
              <span className="mt-5 inline-flex items-center text-sm font-semibold text-violet-700">
                Guest Experience Demo
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <p className="mt-2 text-[11px] text-violet-800/60">
                Opens Room 306 · The Grand Hotel II
              </p>
            </div>
          </Link>

          {/* Staff — teal identity + hospitality ops photo */}
          <Link
            to="/demo/operations"
            className="group flex flex-col overflow-hidden rounded-3xl border border-teal-300/70 bg-white shadow-sm ring-1 ring-teal-600/10 transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-lg"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-teal-950">
              <img
                src={STAFF_IMG}
                alt="Hotel property — staff operations side of TalkStay"
                className="h-full w-full object-cover object-[center_35%] transition duration-500 group-hover:scale-[1.03]"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/85 via-teal-900/35 to-teal-950/10" />
              <span className="absolute left-4 top-4 rounded-full bg-teal-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                Hotel staff
              </span>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">I'm Hotel Staff</p>
                <p className="mt-0.5 text-sm text-teal-100/90">Live queue &amp; departments</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col border-t border-teal-100 bg-gradient-to-b from-teal-50/90 to-white p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-slate-600">
                See incoming requests, auto-routing by department, accept → complete,
                guest confirmation, reviews, and Insights — then switch roles to feel each queue.
              </p>
              <span className="mt-5 inline-flex items-center text-sm font-semibold text-teal-800">
                Operations Dashboard Demo
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            <p className="mt-3 text-[11px] text-teal-900/60">
              Owner view · switch to a department role anytime · linked with Guest demo
            </p>
            </div>
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
                <li className="flex items-start gap-2 rounded-lg border border-violet-100 bg-violet-50/60 px-2.5 py-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <span><span className="font-medium text-violet-950">Staff</span> — one department queue</span>
                </li>
                <li className="flex items-start gap-2 rounded-lg border border-teal-100 bg-teal-50/60 px-2.5 py-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  <span><span className="font-medium text-teal-950">Manager</span> — all queues + Insights</span>
                </li>
                <li className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-2">
                  <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span><span className="font-medium text-amber-950">Owner</span> — full setup + team invites</span>
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
