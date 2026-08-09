import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, Clock, Users, PlayCircle } from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";

// --- Imagery -----------------------------------------------------------------
// These are the owner's marketing graphics (text + branding baked in), used as
// full showcase bands. To swap one, replace the file in public/marketing/ with
// the same name. See public/marketing/README.md.
const IMG = {
  heroBanner: "/marketing/hero-banner.jpg",   // wide hero (headline + branding)
  howItWorks: "/marketing/how-it-works.jpg",   // 6-step storyboard
  guestSquare: "/marketing/guest-square.jpg",  // square "handled from anywhere"
};

/** Image with a graceful, on-brand fallback (violet gradient + logo) so a
 *  missing/renamed file never shows a broken image. */
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

// The dark section — what the product gives the business (distinct from the
// audiences shown in the hero graphic).
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
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#why" className="transition-colors hover:text-foreground">Why TalkStay</a>
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
        {/* Hero — the wide brand banner carries the headline; the h1 is kept
            for screen readers and SEO, and the CTAs live in crisp HTML below. */}
        <section className="mx-auto max-w-6xl px-6 pt-6 sm:pt-10">
          <h1 className="sr-only">TalkStay — voice-first guest service. Guest requests, handled beautifully.</h1>
          <Photo
            src={IMG.heroBanner}
            alt="TalkStay — guest requests, handled beautifully. Voice-first guest service for hotels, short stays, serviced apartments and Airbnb."
            eager
            className="aspect-[1672/941] w-full rounded-3xl shadow-xl"
          />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700">
              <Link to="/app">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how"><PlayCircle className="mr-1.5 h-4 w-4" /> See how it works</a>
            </Button>
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

        {/* Why TalkStay — dark pillar section. */}
        <section id="why" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-28">
          <div className="rounded-3xl bg-[#4c2bb8] px-6 py-14 text-white sm:px-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why teams choose TalkStay</h2>
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

        {/* Closing CTA — the square "from anywhere" graphic beside the ask. */}
        <section className="mx-auto mt-20 max-w-6xl px-6 pb-24 sm:mt-28">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Photo
              src={IMG.guestSquare}
              alt="A guest relaxing — guest requests handled beautifully, from anywhere."
              className="aspect-[1310/1201] w-full rounded-3xl shadow-xl"
            />
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ready when your guests are.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground lg:mx-0">
                Set up your property in minutes, print your room QR codes, and let guests reach
                you the moment they need anything — by voice or chat, in any language.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700">
                  <Link to="/app">Get started</Link>
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
