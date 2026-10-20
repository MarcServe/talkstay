import { Link } from "react-router-dom";
import { ArrowRight, Mail, Phone, Linkedin, MapPin, LifeBuoy } from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import DemoRequestForm from "@/talkstay/components/DemoRequestForm";
import {
  SALES_EMAIL, MAILTO_SALES,
  SUPPORT_PHONE, TEL_SUPPORT,
  SUPPORT_ADDRESS, LINKEDIN_URL,
} from "@/config/contact";

/**
 * The sales door.
 *
 * The enquiry form already existed, but behind a single button near the foot
 * of the landing page — nothing in the nav, no route of its own, and nothing
 * at all on /demo or /videos, which is where an interested property actually
 * ends up. Anyone who did not scroll to the bottom of the home page had no
 * way to reach a human.
 *
 * The form is the primary path because it reaches the right inbox and files a
 * lead; the direct channels are there because some buyers will simply never
 * fill in a form.
 */
export default function ContactPage() {
  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <TalkStayLogo size={28} />
          <span className="text-lg font-semibold tracking-tight">TalkStay</span>
        </Link>
        <Link
          to="/demo"
          className="inline-flex items-center text-sm font-semibold text-violet-700 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
        >
          Try the demo
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            For properties
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Talk to us</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Hotels, serviced apartments, guesthouses, short-stay operators — tell us about your
            property and we'll show you TalkStay running on a real one.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-10">
          {/* The form first: it files a lead rather than landing in a mailbox. */}
          <div className="rounded-3xl border border-violet-200 bg-white/80 p-6 shadow-sm dark:border-violet-500/30 dark:bg-card/80 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">Book a live demo</h2>
            <div className="mt-4">
              <DemoRequestForm idPrefix="c" />
            </div>
          </div>

          {/* For buyers who would rather just email or ring someone. */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card/60 p-6">
              <h2 className="text-lg font-semibold tracking-tight">Or reach us directly</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
                  <span>
                    <span className="block text-xs text-muted-foreground">Sales</span>
                    <a href={MAILTO_SALES} className="font-medium text-violet-700 underline-offset-4 hover:underline dark:text-violet-300">
                      {SALES_EMAIL}
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
                  <span>
                    <span className="block text-xs text-muted-foreground">Phone</span>
                    <a href={TEL_SUPPORT} className="font-medium text-violet-700 underline-offset-4 hover:underline dark:text-violet-300">
                      {SUPPORT_PHONE}
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Linkedin className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
                  <span>
                    <span className="block text-xs text-muted-foreground">LinkedIn</span>
                    <a
                      href={LINKEDIN_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-violet-700 underline-offset-4 hover:underline dark:text-violet-300"
                    >
                      TalkWeb
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
                  <span>
                    <span className="block text-xs text-muted-foreground">Where we are</span>
                    <span className="font-medium">{SUPPORT_ADDRESS}</span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Sales and support are different inboxes; say so rather than
                letting an existing customer queue behind an enquiry. */}
            <div className="rounded-3xl border border-border bg-card/60 p-6">
              <div className="flex items-start gap-3">
                <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Already using TalkStay?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Help with a property you already run goes to the support team.
                  </p>
                  <Link
                    to="/support"
                    className="mt-2 inline-flex items-center text-sm font-semibold text-violet-700 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
                  >
                    Go to support
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm text-muted-foreground">
            Rather look around first?{" "}
            <Link to="/demo" className="font-semibold text-violet-700 underline-offset-4 hover:underline dark:text-violet-300">
              Try the interactive demo
            </Link>
            {" or "}
            <Link to="/videos" className="font-semibold text-violet-700 underline-offset-4 hover:underline dark:text-violet-300">
              watch a two-minute walkthrough
            </Link>
            . No signup either way.
          </p>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2 transition-colors hover:text-foreground">
            <TalkStayLogo size={22} />
            <span>© {new Date().getFullYear()} TalkStay by TalkWeb</span>
          </Link>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/demo" className="transition-colors hover:text-foreground">Demos</Link>
            <Link to="/videos" className="transition-colors hover:text-foreground">Videos</Link>
            <Link to="/support" className="transition-colors hover:text-foreground">Support</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
