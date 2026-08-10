import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  PlayCircle, Hotel, House, ArrowRight, Volume2, VolumeX,
  Building2, KeyRound, Mic, Route, CheckCircle2, Languages,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import { useAuth } from "@/hooks/useAuth";

const DEMO_VIDEO_ID = "83u9qLpVlQ8";

/** Tell the YouTube iframe player to run a command (requires enablejsapi=1). */
function ytCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func, args }),
    "*",
  );
}

/** Full-bleed-feel demo player: loops while the section is on screen, pauses
 *  when scrolled away, starts muted (browser autoplay policy), mute toggle. */
function DemoVideo({ videoId }: { videoId: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mutedRef = useRef(true);
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !ready) return;

    const setPlaying = (visible: boolean) => {
      ytCommand(iframeRef.current, visible ? "playVideo" : "pauseVideo");
      ytCommand(iframeRef.current, mutedRef.current ? "mute" : "unMute");
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        setPlaying(entry.isIntersecting && entry.intersectionRatio >= 0.4);
      },
      { threshold: [0, 0.4, 0.7] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    ytCommand(iframeRef.current, next ? "mute" : "unMute");
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const src =
    `https://www.youtube.com/embed/${videoId}` +
    `?enablejsapi=1&mute=1&autoplay=0&loop=1&playlist=${videoId}` +
    `&playsinline=1&rel=0&modestbranding=1&controls=1` +
    // Hide captions/auto-transcript by default (viewers can still turn CC on).
    `&cc_load_policy=0` +
    (origin ? `&origin=${encodeURIComponent(origin)}` : "");

  return (
    <div ref={wrapRef} className="relative overflow-hidden rounded-3xl border bg-black shadow-sm">
      <div className="aspect-video w-full">
        <iframe
          ref={iframeRef}
          title="TalkStay demo"
          src={src}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          onLoad={() => setReady(true)}
        />
      </div>
      <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white shadow-md backdrop-blur-sm transition hover:bg-black/85"
        aria-label={muted ? "Unmute video" : "Mute video"}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

// --- Imagery -----------------------------------------------------------------
// Marketing photos in public/marketing/. The hero headline is real HTML now
// (readable on mobile); only the scan photo stays as an image.
const IMG = {
  hero: "/marketing/hero.jpg",
  howItWorks: "/marketing/how-it-works.jpg",
  guestSquare: "/marketing/guest-square.jpg",
  hospitality: "/marketing/hospitality-icon.png",
};

const AUDIENCES = [
  { label: "Hotels", Icon: Hotel },
  { label: "Short Stays", Icon: KeyRound },
  { label: "Serviced Apartments", Icon: Building2 },
  { label: "Airbnb", Icon: House },
] as const;

/** Image with a graceful, on-brand fallback so a missing file never breaks. */
function Photo({ src, alt, className = "", eager = false, fit = "cover" }: {
  src: string; alt: string; className?: string; eager?: boolean;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-[#2e1065] ${className}`}>
      {!failed ? (
        <img src={src} alt={alt} loading={eager ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <TalkStayLogo size={44} className="opacity-60" />
        </div>
      )}
    </div>
  );
}

const HERO_PILLS = [
  { label: "Scan & speak", sub: "No app, no login", Icon: Mic },
  { label: "Auto-routed", sub: "Right team, instantly", Icon: Route },
  { label: "Tracked to done", sub: "Updates in real time", Icon: CheckCircle2 },
  { label: "Every language", sub: "Multi-language support", Icon: Languages },
] as const;

/** Split hero: design copy on the left, lifestyle/product photo on the right. */
function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="space-y-8">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
            <Mic className="h-3.5 w-3.5" />
            Voice-first guest service
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Guest requests.
            <br />
            Handled{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text font-serif italic text-transparent">
              beautifully.
            </span>
          </h1>
          <p className="mt-2 text-center font-serif text-xs italic tracking-wide text-violet-600/80 lg:text-left">
            from anywhere
          </p>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
            TalkStay lets guests speak naturally to request room service, housekeeping,
            maintenance, property information and more. Every request is routed, tracked and
            completed with care.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700">
              <Link to="/app">{signedIn ? "Open dashboard" : "Get started"}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how"><PlayCircle className="mr-1.5 h-4 w-4 text-violet-600" /> See how it works</a>
            </Button>
          </div>
        </div>

        <Photo
          src={IMG.hero}
          alt="Guest scanning a TalkStay room QR code — scan to speak with TalkStay"
          eager
          fit="contain"
          className="aspect-[1024/682] w-full rounded-3xl bg-[#1a1035] shadow-xl ring-1 ring-black/5"
        />
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {HERO_PILLS.map(({ label, sub, Icon }) => (
          <li key={label} className="flex items-start gap-2.5 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e1458] via-[#2d1b69] to-[#3b2178] px-5 py-5 text-white shadow-xl sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <img
              src={IMG.hospitality}
              alt=""
              width={48}
              height={34}
              className="mt-0.5 h-11 w-auto shrink-0 rounded-xl object-contain shadow-lg shadow-violet-950/40 ring-1 ring-white/15"
            />
            <div>
              <p className="text-base font-semibold tracking-tight sm:text-lg">Built for modern hospitality.</p>
              <p className="mt-0.5 text-sm text-white/70">
                Everything you need to deliver exceptional guest service, every time.
              </p>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
            {AUDIENCES.map(({ label, Icon }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-white/90">
                <Icon className="h-4 w-4 shrink-0 text-violet-200" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
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
  const { user } = useAuth();

  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <TalkStayLogo size={30} />
          <span className="text-lg font-semibold tracking-tight">TalkStay</span>
          <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">by TalkWeb</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#demo" className="transition-colors hover:text-foreground">Watch demo</a>
          <a href="#why" className="transition-colors hover:text-foreground">Why TalkStay</a>
          <a href="#properties" className="transition-colors hover:text-foreground">For properties</a>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700">
              <Link to="/app">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/app">Property sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700">
                <Link to="/app">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main>
        {/* Hero — design copy (left) + product photo (right), matching the TalkStay board. */}
        <section className="mx-auto max-w-6xl px-6 pt-6 sm:pt-10">
          <Hero signedIn={!!user} />
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
              No app to download. Guests scan the room QR, speak, and it’s done — from their phone to your team.
            </p>
          </div>
          <Photo
            src={IMG.howItWorks}
            alt="Six steps: scan to connect, speak your request, we take care of it, come back to a clean room, relax, and guest requests handled beautifully."
            className="mt-10 aspect-[1536/1024] w-full rounded-3xl border shadow-sm"
          />
        </section>

        {/* Product demo — plays only while this section is on screen. */}
        <section id="demo" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">See TalkStay in action</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Scroll to watch. The video pauses when you leave this section — unmute anytime with the control.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <DemoVideo videoId={DEMO_VIDEO_ID} />
          </div>
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
              <div key={c.title} className="ts-glass flex flex-col rounded-2xl border p-6">
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
            <div className="ts-glass rounded-3xl border p-8">
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
            <div className="ts-glass rounded-3xl border p-8">
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
                  <Link to="/app">Property sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground">
          <Link to="/" className="flex items-center gap-2 transition-colors hover:text-foreground">
            <TalkStayLogo size={22} />
            <span>© {new Date().getFullYear()} TalkStay by TalkWeb</span>
          </Link>
          <Link to="/app" className="transition-colors hover:text-foreground">
            {user ? "Open dashboard" : "Property sign in"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
