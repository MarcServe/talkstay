import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  PlayCircle, ArrowRight, Volume2, VolumeX,
  Building2, KeyRound, Mic, CheckCircle2, Languages,
  Bath, Wifi, Wrench, Star, MessageCircleOff, BarChart3,
  ConciergeBell, DoorOpen, QrCode,
  type LucideIcon,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import { useAuth } from "@/hooks/useAuth";
import { MAILTO_SUPPORT } from "@/config/contact";

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
  heroWebp: "/marketing/hero.webp",
  heroWebpSrcSet: "/marketing/hero-720.webp 720w, /marketing/hero.webp 1215w",
  heroSizes: "(min-width: 1024px) 45vw, min(100vw, 40rem)",
  // Tiny blurred stand-in so the hero frame never looks empty while bytes arrive.
  heroLqip:
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAaABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDnYZvIQvb580ttXODxit+2MzxJvcKNwDSeWNq579KZp+kwXyiWWYp5ZG1Af1q7Gv2a4a1iO8BsySHoR2H8qi12adCGLR4ra6SVLsSnzPueWR1GOtFS6hc3xcrbGN4yASAQHB9OtFbxaSMpJtkehOqI4lYoCBjAzmrd9IigushZQuWJGMYrO0//AFYq3cAfZ5Bjgqawu9jZLqY7TxNeh+hMgIbtjFFZFsTucZ4HaihvoCP/2Q==",
  howItWorks: "/marketing/how-it-works.jpg",
  howItWorksWebp: "/marketing/how-it-works.webp",
  howItWorksWebpSrcSet:
    "/marketing/how-it-works-960.webp 960w, /marketing/how-it-works-1400.webp 1400w, /marketing/how-it-works.webp 1536w",
  howItWorksSizes: "(min-width: 1152px) 1152px, calc(100vw - 3rem)",
  howItWorksLqip:
    "data:image/jpeg;base64,/9j/2wBDABQUFBQVFBcZGRcfIh4iHy4rJycrLkYyNjI2MkZqQk5CQk5Cal5yXVZdcl6phXZ2hanDpJukw+zT0+z/////////2wBDARQUFBQVFBcZGRcfIh4iHy4rJycrLkYyNjI2MkZqQk5CQk5Cal5yXVZdcl6phXZ2hanDpJukw+zT0+z/////////wgARCAAQABgDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABQAE/8QAFQEBAQAAAAAAAAAAAAAAAAAAAgP/2gAMAwEAAhADEAAAACVStU6pxUj/AP/EACMQAAIBBAEDBQAAAAAAAAAAAAECAwAEERIhBRQxIiNRYXH/2gAIAQEAAT8AeKJFETMGk09B+z810+JO0uN1TIHGfynsrCOR8xoPYzy1WzAxKolAOSeT5pY5ZI0KRnbXG2fFQxEnaOYFRng1/8QAGBEBAAMBAAAAAAAAAAAAAAAAAQARQQL/2gAIAQIBAT8AGk2PdZP/xAAYEQADAQEAAAAAAAAAAAAAAAAAARESYf/aAAgBAwEBPwCVMx0//9k=",
  guestSquare: "/marketing/guest-square.jpg",
  guestSquareWebp: "/marketing/guest-square.webp",
  guestSquareWebpSrcSet:
    "/marketing/guest-square-640.webp 640w, /marketing/guest-square-1000.webp 1000w, /marketing/guest-square.webp 1100w",
  guestSquareSizes: "(min-width: 1024px) 532px, calc(100vw - 3rem)",
  guestSquareLqip:
    "data:image/jpeg;base64,/9j/2wBDABQUFBQVFBcZGRcfIh4iHy4rJycrLkYyNjI2MkZqQk5CQk5Cal5yXVZdcl6phXZ2hanDpJukw+zT0+z/////////2wBDARQUFBQVFBcZGRcfIh4iHy4rJycrLkYyNjI2MkZqQk5CQk5Cal5yXVZdcl6phXZ2hanDpJukw+zT0+z/////////wgARCAAWABgDASIAAhEBAxEB/8QAGQABAAMBAQAAAAAAAAAAAAAAAAQFBgID/8QAFgEBAQEAAAAAAAAAAAAAAAAAAwIE/9oADAMBAAIQAxAAAADO9W3oTQU9NUlqbg0IyL//xAAjEAACAgEDAwUAAAAAAAAAAAABAgMSABEhMQQFFBMyQUJh/9oACAEBAAE/AKiNVWSCrVHuGGB4pVsihjsFU84s7rN6AhDP+HIDISZ+ufcJRAw0zx45jE5Y6rwynOm7aolZtWdj9mzy3ahd2YqD8A8526R57CwoDuKgYpVV2Gf/xAAZEQACAwEAAAAAAAAAAAAAAAABAgARITH/2gAIAQIBAT8ALsBtS+ZHUFNA5DP/xAAZEQADAQEBAAAAAAAAAAAAAAAAAQIRITH/2gAIAQMBAT8AmE2Z70lvRH//2Q==",
  roleGuest: "/marketing/role-guest.jpg",
  roleGuestWebp: "/marketing/role-guest.webp",
  roleGuestWebpSrcSet:
    "/marketing/role-guest-960.webp 960w, /marketing/role-guest.webp 1536w",
  roleStaff: "/marketing/role-staff.jpg",
  roleStaffWebp: "/marketing/role-staff.webp",
  roleStaffWebpSrcSet:
    "/marketing/role-staff-960.webp 960w, /marketing/role-staff.webp 1536w",
  roleDemoSizes: "(min-width: 640px) 20rem, calc(100vw - 3rem)",
  hospitality: "/marketing/hospitality-icon.png",
};

const AUDIENCES = [
  { label: "Hotels", Icon: ConciergeBell },
  { label: "Short Stays", Icon: KeyRound },
  { label: "Serviced Apartments", Icon: Building2 },
  { label: "Airbnb", Icon: DoorOpen },
] as const;

/** Image with a graceful, on-brand fallback so a missing file never breaks. */
function Photo({ src, alt, className = "", eager = false, fit = "cover",
  webp, webpSrcSet, sizes, lqip, width, height,
}: {
  src: string; alt: string; className?: string; eager?: boolean;
  fit?: "cover" | "contain";
  webp?: string; webpSrcSet?: string; sizes?: string; lqip?: string;
  width?: number; height?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgClass = `h-full w-full transition-opacity duration-300 ${
    fit === "contain" ? "object-contain" : "object-cover"
  } ${lqip && !loaded ? "opacity-0" : "opacity-100"}`;
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-[#2e1065] ${className}`}
      style={lqip ? { backgroundImage: `url(${lqip})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {!failed ? (
        <picture>
          {webp || webpSrcSet ? (
            <source
              type="image/webp"
              srcSet={webpSrcSet ?? webp}
              sizes={sizes}
            />
          ) : null}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
            decoding={eager ? "sync" : "async"}
            fetchPriority={eager ? "high" : "auto"}
            ref={(el) => {
              // Cached images can be complete before React attaches onLoad.
              if (el?.complete && el.naturalWidth > 0) setLoaded(true);
            }}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={imgClass}
          />
        </picture>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <TalkStayLogo size={44} className="opacity-60" />
        </div>
      )}
    </div>
  );
}

/** Split hero: photo leads on mobile; copy left / photo right on desktop. */
function Hero({ signedIn }: { signedIn: boolean }) {
  const voiceBadge = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
      <Mic className="h-3.5 w-3.5" />
      Voice-first guest service
    </span>
  );

  return (
    <div className="space-y-8">
      <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        {/* Mobile: badge above image. Desktop: image in column 2. */}
        <div className="flex flex-col items-center gap-4 lg:col-start-2 lg:row-start-1 lg:contents">
          <div className="lg:hidden">{voiceBadge}</div>
          <Photo
            src={IMG.hero}
            webp={IMG.heroWebp}
            webpSrcSet={IMG.heroWebpSrcSet}
            sizes={IMG.heroSizes}
            lqip={IMG.heroLqip}
            width={1215}
            height={1295}
            alt="Guest in bed using TalkStay on their phone — QR bedside stand and live request chat with housekeeping"
            eager
            className="aspect-[1215/1295] w-full rounded-3xl shadow-xl ring-1 ring-black/5 lg:col-start-2 lg:row-start-1"
          />
        </div>

        <div className="text-center lg:col-start-1 lg:row-start-1 lg:text-left">
          <div className="hidden lg:block">{voiceBadge}</div>
          <h1 className="mt-0 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:mt-5 lg:text-[3.25rem] lg:leading-[1.1]">
            Guest requests.
            <br />
            Handled{" "}
            <span className="inline-block bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text px-0.5 py-0.5 pr-1.5 font-serif italic text-transparent">
              beautifully.
            </span>
          </h1>
          <p className="mt-2 text-center font-serif text-xs italic tracking-wide text-violet-600/80 lg:text-left">
            from anywhere
          </p>
          <p className="mt-4 text-base font-medium tracking-tight text-foreground sm:text-lg">
            Information, services and support — all at your fingertips
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground lg:mx-0">
            TalkStay is a voice-first guest service assistant that lets guests speak naturally
            to get instant property information or request room service, housekeeping,
            maintenance, extra towels, food, drinks and more. Every request is automatically
            routed to the right team, tracked from start to finish, and the guest is kept
            updated until it's done.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700">
              <Link to="/app">{signedIn ? "Open dashboard" : "Get started"}</Link>
            </Button>
            {!signedIn && (
              <Button asChild size="lg" variant="outline">
                <Link to="/demo">Experience TalkStay — no signup</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <a href="#how"><PlayCircle className="mr-1.5 h-4 w-4 text-violet-600" /> See how it works</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Value line + compact Ask/Request journey — one composition */}
      <div className="relative mx-auto max-w-3xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-[1.75rem] bg-gradient-to-r from-violet-400/25 via-indigo-400/20 to-violet-500/25 blur-xl"
        />
        <div className="relative rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-white to-indigo-50/80 px-5 py-4 shadow-[0_12px_40px_-18px_rgba(124,58,237,0.45)] ring-1 ring-violet-500/10 sm:px-8 sm:py-5">
          <p className="text-center font-serif text-xl leading-[1.45] tracking-tight text-foreground sm:text-2xl lg:text-[1.65rem] lg:leading-[1.4]">
            Every{" "}
            <span className="inline-block bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text px-0.5 py-0.5 italic text-transparent">
              repetitive
            </span>
            {" "}or{" "}
            <span className="inline-block bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text px-0.5 py-0.5 italic text-transparent">
              unnecessary
            </span>{" "}
            call to reception / host is a workflow your property should already have automated.
          </p>
          <div className="mx-auto mt-4 flex max-w-2xl flex-col items-center gap-2 border-t border-violet-200/60 pt-3.5 sm:mt-5 sm:pt-4">
            <p className="text-center text-[13px] leading-relaxed text-foreground/80 sm:text-sm">
              <span className="font-semibold text-violet-700">Ask</span>
              <span className="text-violet-400/90"> → </span>
              Scan → Speak → Instant answer
              <span className="mx-2 hidden text-violet-300 sm:inline" aria-hidden>
                ·
              </span>
              <br className="sm:hidden" />
              <span className="font-semibold text-teal-700">Request</span>
              <span className="text-teal-500/80"> → </span>
              Right team → Track → Complete
            </p>
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <QrCode className="h-3 w-3 text-violet-500" />
                No app, no login
              </span>
              <span className="inline-flex items-center gap-1">
                <Languages className="h-3 w-3 text-violet-500" />
                Every language
              </span>
            </p>
          </div>
        </div>
      </div>

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

/** Visual “old vs TalkStay” beats — colour + icon, with the full explanation intact. */
const cases: {
  title: string;
  old: string;
  now: string;
  win: string;
  Icon: LucideIcon;
  iconWrap: string;
  iconColor: string;
  tint: string;
}[] = [
  {
    title: "One towel request shouldn't involve three members of staff.",
    old: "Guest → reception → housekeeping → a follow-up call. Slow, and easy to forget.",
    now: "The guest asks once. It's routed straight to housekeeping and tracked to done.",
    win: "Less labour wasted on simple requests.",
    Icon: Bath,
    iconWrap: "bg-sky-100",
    iconColor: "text-sky-600",
    tint: "from-sky-50/80 to-transparent",
  },
  {
    title: "Your night manager shouldn't answer “What's the Wi-Fi password?” at 1am.",
    old: "Guests call or message staff for the same information, at all hours.",
    now: "Instant answers from your property's knowledge base — day or night.",
    win: "24/7 service without 24/7 interruptions.",
    Icon: Wifi,
    iconWrap: "bg-amber-100",
    iconColor: "text-amber-600",
    tint: "from-amber-50/80 to-transparent",
  },
  {
    title: "A broken AC isn't a message. It's a task with a deadline.",
    old: "The complaint gets passed around until someone finally acts.",
    now: "It becomes an assigned, trackable maintenance request the moment it's reported.",
    win: "Move from conversations to accountable action.",
    Icon: Wrench,
    iconWrap: "bg-orange-100",
    iconColor: "text-orange-600",
    tint: "from-orange-50/80 to-transparent",
  },
  {
    title: "The most expensive complaint is the one you find on Booking.com.",
    old: "The guest stays quiet, checks out, then posts two stars.",
    now: "Issues are easy to raise — and resolve — while the guest is still in the room.",
    win: "Recover unhappy guests before checkout.",
    Icon: Star,
    iconWrap: "bg-rose-100",
    iconColor: "text-rose-600",
    tint: "from-rose-50/80 to-transparent",
  },
  {
    title: "Your guest shouldn't WhatsApp you at 11:30pm to ask how the heating works.",
    old: "For short stays, the host becomes personal customer support all evening.",
    now: "Guests get instant, property-specific answers without messaging you.",
    win: "24/7 guest support without the host being available 24/7.",
    Icon: MessageCircleOff,
    iconWrap: "bg-violet-100",
    iconColor: "text-violet-600",
    tint: "from-violet-50/80 to-transparent",
  },
  {
    title: "You can't improve what you can't see.",
    old: "Managers hear anecdotes about complaints and slow service.",
    now: "See what guests request, which teams are slow and what gets escalated.",
    win: "Turn guest requests into operational intelligence.",
    Icon: BarChart3,
    iconWrap: "bg-emerald-100",
    iconColor: "text-emerald-600",
    tint: "from-emerald-50/80 to-transparent",
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
                <Link to="/demo">Try demo</Link>
              </Button>
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
        <section className="mx-auto max-w-6xl px-6 pt-3 sm:pt-10">
          <Hero signedIn={!!user} />
        </section>

        {/* Positioning — same request, three audiences, clear value. */}
        <section className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="rounded-3xl bg-[#4c2bb8] px-6 py-12 text-white sm:px-12 sm:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold leading-snug tracking-tight sm:text-4xl">
                One guest request shouldn't become three staff conversations.
              </h2>
              <p className="mt-4 text-white/75">
                Today a single ask gets passed guest → reception → team. TalkStay collapses that loop
                so each side only does their job once.
              </p>
            </div>
            <div className="mx-auto mt-10 grid max-w-4xl gap-8 text-left sm:grid-cols-3 sm:gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Guest</p>
                <p className="mt-2 text-base font-semibold tracking-tight">Ask once. Done.</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                  Scan the room QR / click a link, speak or type the request, and get progress without chasing the front desk.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Reception</p>
                <p className="mt-2 text-base font-semibold tracking-tight">Stop being the middleman.</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                  Towels, Wi‑Fi, and maintenance no longer need a phone call, a note, and a follow-up.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Your teams</p>
                <p className="mt-2 text-base font-semibold tracking-tight">A task, not a message.</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                  Housekeeping and maintenance get a clear, assigned request — tracked until it’s finished.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works — the storyboard graphic. */}
        <section id="how" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
              No app to download. Guests scan the room QR, speak, and it’s done — from their phone to your team.
            </p>
          </div>
          <Photo
            src={IMG.howItWorks}
            webp={IMG.howItWorksWebp}
            webpSrcSet={IMG.howItWorksWebpSrcSet}
            sizes={IMG.howItWorksSizes}
            lqip={IMG.howItWorksLqip}
            width={1536}
            height={1024}
            alt="Six steps: scan to connect, speak your request, we take care of it, come back to a clean room, relax, and guest requests handled beautifully."
            className="mt-10 aspect-[1536/1024] w-full rounded-3xl border shadow-sm"
          />
        </section>

        {/* Product demo — video + interactive hub CTAs. */}
        <section id="demo" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">See TalkStay in action</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Watch a short overview, then try the interactive demos — guest phone experience or the staff operations dashboard.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <DemoVideo videoId={DEMO_VIDEO_ID} />
          </div>

          {/* Clear break so the interactive CTAs don't crowd the video. */}
          <div className="mx-auto mt-14 max-w-3xl border-t border-slate-200/90 pt-10 sm:mt-16 sm:pt-12">
            <div className="mb-6 text-center sm:mb-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Then try it yourself
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Pick a side — guest phone or staff operations.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to="/demo/guest"
                className="group overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md"
              >
                <div className="aspect-[3/2] overflow-hidden bg-violet-50">
                  <picture>
                    <source type="image/webp" srcSet={IMG.roleGuestWebpSrcSet} sizes={IMG.roleDemoSizes} />
                    <img
                      src={IMG.roleGuest}
                      alt="Your Stay. Just Speak. — guest TalkStay experience"
                      width={1536}
                      height={1024}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                </div>
                <div className="border-t border-violet-100 bg-violet-50/80 px-5 py-4 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Guest</p>
                  <p className="mt-1 text-sm font-semibold text-violet-950">Guest Experience</p>
                  <p className="mt-0.5 text-xs text-violet-900/75">
                    Ask, request, track — like after scanning a room QR or link from email.
                  </p>
                </div>
              </Link>
              <Link
                to="/demo/operations"
                className="group overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md"
              >
                <div className="aspect-[3/2] overflow-hidden bg-teal-50">
                  <picture>
                    <source type="image/webp" srcSet={IMG.roleStaffWebpSrcSet} sizes={IMG.roleDemoSizes} />
                    <img
                      src={IMG.roleStaff}
                      alt="Manage Requests. Deliver Excellence. — host operations"
                      width={1536}
                      height={1024}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                </div>
                <div className="border-t border-teal-100 bg-teal-50/80 px-5 py-4 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700">Hotel staff</p>
                  <p className="mt-1 text-sm font-semibold text-teal-950">I'm Hotel Staff</p>
                  <p className="mt-0.5 text-xs text-teal-900/75">Live queue &amp; departments</p>
                </div>
              </Link>
            </div>
            <p className="mt-5 text-center text-sm">
              <Link to="/demo" className="font-medium text-violet-700 underline-offset-2 hover:underline">
                Or open the Experience TalkStay hub
              </Link>
            </p>
          </div>
        </section>

        {/* Old way vs TalkStay — colour + icon, full explanations kept. */}
        <section id="why" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">The old way vs TalkStay</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-bold text-foreground">
              Every repetitive or unnecessary call to reception / host is a workflow your property should already have automated.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map(({ title, old, now, win, Icon, iconWrap, iconColor, tint }) => (
              <div
                key={title}
                className={`relative flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-b ${tint} p-5`}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconWrap}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-base font-semibold leading-snug tracking-tight">{title}</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-600">
                      ×
                    </span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Old way</div>
                      <p className="mt-0.5 text-muted-foreground">{old}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-violet-600">TalkStay</div>
                      <p className="mt-0.5 text-foreground">{now}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 border-t border-black/[0.06] pt-3 text-sm font-medium text-violet-700">{win}</p>
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-50 ring-1 ring-indigo-200/60">
                <ConciergeBell className="h-5 w-5 text-indigo-600" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 text-lg font-semibold">For hotels</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Reception stops being your internal switchboard. Towels, wine, taxis and repairs go
                straight to the team that can solve them — tracked to completion — so your front desk
                is free for real guest service.
              </p>
            </div>
            <div className="ts-glass rounded-3xl border p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-50 ring-1 ring-teal-200/60">
                <KeyRound className="h-5 w-5 text-teal-700" strokeWidth={1.75} />
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
              webp={IMG.guestSquareWebp}
              webpSrcSet={IMG.guestSquareWebpSrcSet}
              sizes={IMG.guestSquareSizes}
              lqip={IMG.guestSquareLqip}
              width={1100}
              height={1008}
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
                  <Link to="/demo">Try demo</Link>
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
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2 transition-colors hover:text-foreground">
            <TalkStayLogo size={22} />
            <span>© {new Date().getFullYear()} TalkStay by TalkWeb</span>
          </Link>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a href={MAILTO_SUPPORT} className="transition-colors hover:text-foreground">Support</a>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link to="/cookies" className="transition-colors hover:text-foreground">Cookies</Link>
            <Link to="/acceptable-use" className="transition-colors hover:text-foreground">Acceptable use</Link>
            <Link to="/data-processing" className="transition-colors hover:text-foreground">Data processing</Link>
            <Link to="/app" className="transition-colors hover:text-foreground">
              {user ? "Open dashboard" : "Property sign in"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
