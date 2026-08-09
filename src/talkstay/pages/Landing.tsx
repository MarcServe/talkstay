import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Mic, Sparkles, Clock, Users, PlayCircle, Hotel, House, KeyRound, Building2,
  QrCode, Volume2, BellRing,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";

// --- Imagery -----------------------------------------------------------------
// Drop your hospitality photos into `public/marketing/` with the filenames
// below and they appear automatically. Until then each slot shows a branded
// gradient (see <Photo>), so the page never looks broken.
const IMG = {
  hero: "/marketing/hero.jpg",         // a relaxed guest / warm room scene
  scan: "/marketing/step-scan.jpg",    // guest scanning the in-room QR
  speak: "/marketing/step-speak.jpg",  // guest speaking into their phone
  relax: "/marketing/step-relax.jpg",  // clean room / guest relaxing
};

/** Photo with a graceful, on-brand fallback. Shows the image if it loads;
 *  otherwise a violet gradient with the logo mark — intentional, not broken. */
function Photo({ src, alt, className = "", eager = false }: {
  src: string; alt: string; className?: string; eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-[#2e1065] ${className}`}>
      {!failed ? (
        <img
          src={src} alt={alt} loading={eager ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <TalkStayLogo size={44} className="opacity-60" />
        </div>
      )}
    </div>
  );
}

// Who it works for — hotels are the deepest use case, but any short-term stay
// with a room and a guest fits the same model.
const audiences = [
  { icon: Hotel, label: "Hotels" },
  { icon: House, label: "Short stays" },
  { icon: KeyRound, label: "Airbnb" },
  { icon: Building2, label: "Serviced apartments" },
];

// The 3-step "How it works", each with its own photo.
const steps = [
  { n: 1, icon: QrCode, img: IMG.scan, title: "Scan to connect", body: "Guests scan the QR code in their room — no app, no login, no waiting on hold." },
  { n: 2, icon: Volume2, img: IMG.speak, title: "Speak your request", body: "They just say what they need, in their own language. TalkStay understands and confirms." },
  { n: 3, icon: BellRing, img: IMG.relax, title: "We take care of it", body: "The request is routed to the right team, tracked to completion — and the guest can relax." },
];

// The dark section — what the product gives the business.
const pillars = [
  { icon: Mic, title: "Voice-first experience", body: "Guests speak naturally in their own language." },
  { icon: Sparkles, title: "Smart routing", body: "Requests go to the right department automatically." },
  { icon: Clock, title: "Real-time tracking", body: "Track progress from request to completion." },
  { icon: Users, title: "Staff collaboration", body: "Teams stay aligned and guests stay happy." },
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
          <a href="#how" className="transition-colors hover:text-foreground">Features</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
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
        {/* Hero — text left, hospitality photo right on desktop. */}
        <section className="mx-auto max-w-6xl px-6 pt-8 sm:pt-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Mic className="h-3.5 w-3.5" /> VOICE-FIRST GUEST SERVICE
              </div>
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                Guest requests.
                <br />
                Handled{" "}
                <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
                  beautifully.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0">
                TalkStay lets guests speak or chat naturally to request anything they need — in
                hotels, short stays and Airbnbs. Every request is routed to the right team,
                tracked in real time and completed with care.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700">
                  <Link to="/app">Get started</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#how"><PlayCircle className="mr-1.5 h-4 w-4" /> See how it works</a>
                </Button>
              </div>
            </div>

            <Photo
              src={IMG.hero} alt="A guest relaxing in a well-kept room" eager
              className="aspect-[4/3] w-full rounded-3xl shadow-xl lg:aspect-[5/4]"
            />
          </div>

          {/* Who it's for. */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-5 rounded-2xl border bg-card px-6 py-4 shadow-sm sm:gap-8 sm:px-8">
            <span className="text-sm font-medium text-muted-foreground">Perfect for</span>
            <span className="hidden h-8 w-px bg-border sm:block" />
            {audiences.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                  <Icon className="h-5 w-5 text-violet-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works — three photo steps. */}
        <section id="how" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Scan. Speak. Consider it done — the whole journey, from the guest's phone to your team.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map(({ n, icon: Icon, img, title, body }) => (
              <div key={n} className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                <Photo src={img} alt={title} className="aspect-[3/2] w-full" />
                <div className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{n}</span>
                    <Icon className="h-4 w-4 text-violet-600" />
                    <h3 className="font-semibold">{title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What the business gets. */}
        <section id="properties" className="mx-auto mt-20 max-w-6xl px-6 pb-24 sm:mt-28">
          <div className="rounded-3xl bg-[#4c2bb8] px-6 py-14 text-white sm:px-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for modern hospitality</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70">
                Everything you need to deliver exceptional guest service — for hotels, short
                stays, Airbnbs and serviced apartments alike.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pillars.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/70">{body}</p>
                </div>
              ))}
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
