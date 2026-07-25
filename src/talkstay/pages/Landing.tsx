import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Route as RouteIcon, CheckCircle2, Languages } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Scan & speak",
    body: "Guests scan a room QR code and just talk — no app, no login, no waiting on hold.",
  },
  {
    icon: RouteIcon,
    title: "Auto-routed",
    body: "Every request is understood and sent to the right team — housekeeping, kitchen, bar, maintenance, front desk and more.",
  },
  {
    icon: CheckCircle2,
    title: "Tracked to done",
    body: "Staff accept, update and complete each task. Guests get quiet updates and confirm delivery.",
  },
  {
    icon: Languages,
    title: "Every language",
    body: "Guests speak their language; staff receive clear tasks in English. No multilingual staffing required.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">TalkStay</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">by TalkWeb</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app">Hotel sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            The voice-first guest-service platform for hotels & serviced stays
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Guests scan a QR code and speak naturally to request room service, housekeeping,
            laundry, maintenance or front-desk help. Every request is routed to the right team,
            tracked through completion and reviewed by the guest.
          </p>
          <p className="mt-8 text-xl font-medium">Scan. Speak. Consider it done.</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/app">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </div>
        </section>

        <section id="how" className="grid gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} TalkStay by TalkWeb
        </div>
      </footer>
    </div>
  );
}
