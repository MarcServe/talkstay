import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Route as RouteIcon, CheckCircle2, Languages,
  Mic, Sparkles, Clock, Users, PlayCircle, Hotel, House, KeyRound, Building2,
} from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";

// Who it works for — hotels are the deepest use case, but any short-term stay
// with a room and a guest fits the same model.
const audiences = [
  { icon: Hotel, label: "Hotels" },
  { icon: House, label: "Short stays" },
  { icon: KeyRound, label: "Airbnb" },
  { icon: Building2, label: "Serviced apartments" },
];

// The 4-up strip under the hero — what a guest experiences, in order.
const features = [
  { icon: MessageSquare, title: "Scan & speak", body: "No app, no login" },
  { icon: RouteIcon, title: "Auto-routed", body: "Right team, instantly" },
  { icon: CheckCircle2, title: "Tracked to done", body: "Updates in real time" },
  { icon: Languages, title: "Every language", body: "Multi-language support" },
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
          <a href="#hotels" className="transition-colors hover:text-foreground">For properties</a>
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
        <section className="mx-auto max-w-6xl px-6">
          <div className="py-16 text-center sm:py-24">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Mic className="h-3.5 w-3.5" /> VOICE-FIRST GUEST SERVICE
            </div>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              Guest requests.
              <br />
              Handled{" "}
              <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
                beautifully.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              TalkStay lets guests speak or chat naturally to request anything they need — in
              hotels, short stays and Airbnbs. Every request is routed to the right team,
              tracked in real time and completed with care.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700">
                <Link to="/app">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how"><PlayCircle className="mr-1.5 h-4 w-4" /> See how it works</a>
              </Button>
            </div>

            {/* Who it's for — hotels are the deep case, but any short-term
                stay with a room and a guest fits the same model. */}
            <div className="mx-auto mt-8 inline-flex max-w-full flex-wrap items-center justify-center gap-5 rounded-2xl border bg-card px-6 py-4 shadow-sm sm:gap-8 sm:px-8">
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
          </div>

          {/* What the guest experiences */}
          <div id="how" className="mx-auto max-w-4xl rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, body }) => (
                <div key={title} className="text-center sm:text-left">
                  <Icon className="mx-auto h-5 w-5 text-violet-600 sm:mx-0" />
                  <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What the business gets */}
        <section id="hotels" className="mx-auto mt-16 max-w-6xl px-6 pb-24 sm:mt-24">
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
