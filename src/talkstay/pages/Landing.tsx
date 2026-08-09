import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlayCircle, Hotel, House, ArrowRight } from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";

// --- Imagery -----------------------------------------------------------------
// The owner's marketing graphics (text + branding baked in), used as full
// showcase bands. Swap by replacing the file in public/marketing/ (same name).
const IMG = {
  heroBanner: "/marketing/hero-banner.jpg",
  howItWorks: "/marketing/how-it-works.jpg",
  guestSquare: "/marketing/guest-square.jpg",
};

/** Image with a graceful, on-brand fallback so a missing file never breaks. */
function Photo({ src, alt, className = "", eager = false }: {
  src: string; alt: string; className?: string; eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-[#2e1065] ${className}`}>
      {!failed ? (
        <img src={src} alt={alt} loading={eager ? "eager" : "lazy"}
          onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <TalkStayLogo size={44} className="opacity-60" />
        </div>
      )}
    </div>
  );
}

// Old-way / TalkStay contrasts — the operator's pain, not just guest convenience.
const cases = [
  {
    title: "One towel request shouldn't involve three members of staff.",
    old: "Guest → reception → housekeeping → a follow-up call. Slow, and easy to forget.",
    now: "The guest asks once. It's routed straight to housekeeping and tracked to done.",
    win: "Less labour wasted on simple requests.",
  },
  {
    title: "Your night manager shouldn't answer “What's the Wi-Fi password?” at 1am.",
    old: "Guests call or message staff for the same information, at all hours.",
    now: "Instant answers from your property's knowledge base — day or night.",
    win: "24/7 service without 24/7 interruptions.",
  },
  {
    title: "A broken AC isn't a message. It's a task with a deadline.",
    old: "The complaint gets passed around until someone finally acts.",
    now: "It becomes an assigned, trackable maintenance request the moment it's reported.",
    win: "Move from conversations to accountable action.",
  },
  {
    title: "The most expensive complaint is the one you find on Booking.com.",
    old: "The guest stays quiet, checks out, then posts two stars.",
    now: "Issues are easy to raise — and resolve — while the guest is still in the room.",
    win: "Recover unhappy guests before checkout.",
  },
  {
    title: "Your guest shouldn't WhatsApp you at 11:30pm to ask how the heating works.",
    old: "For short stays, the host becomes personal customer support all evening.",
    now: "Guests get instant, property-specific answers without messaging you.",
    win: "24/7 guest support without the host being available 24/7.",
  },
  {
    title: "You can't improve what you can't see.",
    old: "Managers hear anecdotes about complaints and slow service.",
    now: "See what guests request, which teams are slow and what gets escalated.",
    win: "Turn guest requests into operational intelligence.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <TalkStayLogo size={30} />
          <span className="text-lg font-semibold tracking-tight">TalkStay</span>
          <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">by TalkWeb</span>
        </div>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#why" className="transition-colors hover:text-foreground">Why TalkStay</a>
          <a href="#properties" className="transition-colors hover:text-foreground">For properties</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/app">Hotel sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700">
            <Link to="/app">Get started</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero — the brand banner ends on "Handled beautifully"; the serif
            "from anywhere." continues the line in a different, smaller face. */}
        <section className="mx-auto max-w-6xl px-6 pt-6 sm:pt-10">
          <h1 className="sr-only">TalkStay — voice-first guest service. Guest requests, handled beautifully, from anywhere.</h1>
          <Photo
            src={IMG.heroBanner}
            alt="TalkStay — guest requests, handled beautifully. Voice-first guest service for hotels, short stays, serviced apartments and Airbnb."
            eager
            className="aspect-[1672/941] w-full rounded-3xl shadow-xl"
          />
          <p className="mt-5 text-center font-serif text-2xl italic text-muted-foreground sm:text-3xl">
            from anywhere.
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-muted-foreground">
            TalkStay lets guests scan a QR code and simply speak. Requests are understood, routed
            to the right team and tracked to completion — without another app for the guest.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700">
              <Link to="/app">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how"><PlayCircle className="mr-1.5 h-4 w-4" /> See how it works</a>
            </Button>
          </div>
        </section>

        {/* The positioning line. */}
        <section className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="rounded-3xl bg-[#4c2bb8] px-6 py-14 text-center text-white sm:px-12">
            <h2 className="mx-auto max-w-3xl text-2xl font-bold leading-snug tracking-tight sm:text-4xl">
              One guest request shouldn't become three staff conversations.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/75">
              The guest sees a simple request. The operator sees staff time, delays, complaints
              and reviews. TalkStay fixes both — it removes the repetitive communication layer
              between guests, reception and your teams.
            </p>
          </div>
        </section>

        {/* How it works — the storyboard graphic. */}
        <section id="how" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Scan. Speak. Consider it done — the whole journey, from the guest's phone to your team.
            </p>
          </div>
          <Photo
            src={IMG.howItWorks}
            alt="Six steps: scan to connect, speak your request, we take care of it, come back to a clean room, relax, and guest requests handled beautifully."
            className="mt-10 aspect-[1536/1024] w-full rounded-3xl border shadow-sm"
          />
        </section>

        {/* Old way vs TalkStay. */}
        <section id="why" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">The old way vs TalkStay</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Every unnecessary call to reception is a workflow your property should have automated already.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <div key={c.title} className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
                <h3 className="text-base font-semibold leading-snug">{c.title}</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Old way</div>
                    <p className="mt-0.5 text-muted-foreground">{c.old}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-violet-600">TalkStay</div>
                    <p className="mt-0.5">{c.now}</p>
                  </div>
                </div>
                <p className="mt-4 border-t pt-3 text-sm font-medium text-violet-700">{c.win}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Two audiences, two stories. */}
        <section id="properties" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for hotels and short stays alike</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border bg-card p-8 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
                <Hotel className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">For hotels</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Reception stops being your internal switchboard. Towels, wine, taxis and repairs go
                straight to the team that can solve them — tracked to completion — so your front desk
                is free for real guest service.
              </p>
            </div>
            <div className="rounded-3xl border bg-card p-8 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
                <House className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">For short stays &amp; Airbnb</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                You may not have a reception — and you shouldn't have to be one. Give every property a
                24/7 guest-service layer that answers repetitive questions and logs requests, without
                you being available around the clock.
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA — the square "from anywhere" graphic beside the ask. */}
        <section className="mx-auto mt-20 max-w-6xl px-6 pb-24 sm:mt-28">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Photo
              src={IMG.guestSquare}
              alt="A guest relaxing — guest requests handled beautifully, from anywhere."
              className="aspect-[1310/1201] w-full rounded-3xl shadow-xl"
            />
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready when your guests are.</h2>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground lg:mx-0">
                Set up your property in minutes, print your room QR codes, and turn every guest
                request into a trackable task automatically — by voice or chat, in any language.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700">
                  <Link to="/app">Get started <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/app">Hotel sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TalkStayLogo size={22} />
            <span>© {new Date().getFullYear()} TalkStay by TalkWeb</span>
          </div>
          <Link to="/app" className="transition-colors hover:text-foreground">Hotel sign in</Link>
        </div>
      </footer>
    </div>
  );
}
