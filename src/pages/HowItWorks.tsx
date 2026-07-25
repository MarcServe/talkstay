import { Header } from "@/components/Header";
import { VideoShowcase } from "@/components/VideoShowcase";
import { Link } from "react-router-dom";
import {
  Rocket,
  Globe,
  FileText,
  MessageSquare,
  Calendar,
  Phone,
  QrCode,
  BarChart3,
  Settings,
  Mic,
  Share2,
  Code2,
} from "lucide-react";

const steps = [
  {
    icon: Rocket,
    title: "1. Create your account",
    body: "Sign up in seconds. Every new account gets a 7-day trial assistant with up to 25 free conversations so you can test everything end-to-end before paying.",
  },
  {
    icon: Settings,
    title: "2. Create your first assistant",
    body: "Open the Dashboard → New Assistant. Give it a business name, pick a voice (Ballad is the recommended default), choose a tone, and add a short description. You can edit any of this later.",
  },
  {
    icon: Globe,
    title: "3. Connect your knowledge",
    body: "Paste your website URL and we'll crawl it automatically (up to 20 / 100 / 500 pages depending on your plan). Add PDFs, docs, FAQs and price lists in the Content tab — everything is vector-indexed so the AI answers from your own data.",
  },
  {
    icon: MessageSquare,
    title: "4. Test the chat",
    body: "Open the Preview tab and have a real conversation. Ask the questions your customers actually ask. If something is wrong, add a manual knowledge entry — those are treated as the highest-priority source of truth.",
  },
  {
    icon: Mic,
    title: "5. Try voice mode",
    body: "Click the mic to switch to voice. The AI listens, transcribes you live, and replies in natural speech. You can interrupt at any time. Voice and chat share the same knowledge, so answers stay consistent.",
  },
  {
    icon: Calendar,
    title: "6. Wire up bookings",
    body: "Add a Calendly link or use the built-in booking modal. The AI collects name, email, phone, date, time and service, confirms back, then creates the booking and emails both sides.",
  },
  {
    icon: Phone,
    title: "7. Capture casual leads",
    body: "Not every visitor wants to book a slot. If someone just wants a callback or a quote, the AI collects their name plus an email or phone number, confirms it, and emails the lead to your inbox with an AI summary.",
  },
  {
    icon: Share2,
    title: "8. Deploy anywhere",
    body: "Embed the floating widget on any site with one line of code, share the public preview link, drop the QR code on print or menus, or use white-label widget-only mode for a fully branded experience.",
  },
  {
    icon: QrCode,
    title: "9. Customise your QR & links",
    body: "Generate a branded QR with your logo and colours from the QR tab. Use the built-in /a/:slug short links for bios, posters and SMS — every scan and click is tracked.",
  },
  {
    icon: FileText,
    title: "10. Build voice forms",
    body: "Need to collect structured info (applications, intake, surveys)? Create a voice form, define the fields, and share the link. Visitors fill it out by talking — the AI handles the typing.",
  },
  {
    icon: BarChart3,
    title: "11. Watch the analytics",
    body: "The Analytics tab shows conversations, top topics, bookings, leads, link clicks and ROI. Use it to spot gaps in your knowledge and refine your prompts.",
  },
  {
    icon: Code2,
    title: "12. Scale up when ready",
    body: "Upgrade for more pages, more conversations, multi-department setups (one assistant per team), team seats, and removal of branding.",
  },
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border/40">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <Rocket className="w-3.5 h-3.5" />
            Quick Start Guide
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
            How It Works
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            From sign-up to a live AI assistant on your site in under 10 minutes. Here's the
            full path — every feature, in order.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Start free trial
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Video */}
      <VideoShowcase />

      {/* Steps */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            12 steps. One assistant. Zero guesswork.
          </h2>
          <p className="text-muted-foreground">
            Follow these in order the first time. After that, jump around and refine whichever
            piece needs attention.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {steps.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/60 bg-card p-6 hover:border-primary/40 hover:shadow-lg transition"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pro tips */}
      <section className="border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 py-16 md:py-20 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-foreground">
            Pro tips
          </h2>
          <ul className="space-y-4 text-sm md:text-base text-foreground">
            <li className="flex gap-3">
              <span className="text-primary font-bold">→</span>
              <span><strong>Re-crawl after big content changes.</strong> Auto-Refresh merges new pages without losing your manual entries.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">→</span>
              <span><strong>Manual entries beat scraped content.</strong> If the AI keeps getting something wrong, type the correct answer once into the Knowledge Editor — it's prioritised over everything else.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">→</span>
              <span><strong>Use one assistant per department.</strong> Sales, support and recruitment each get their own knowledge, voice and analytics.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">→</span>
              <span><strong>Open links in a new tab during voice calls.</strong> That keeps the conversation alive while the visitor reads.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">→</span>
              <span><strong>Always end the voice session.</strong> Tap the End button to release the mic — privacy first.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 md:py-20 text-center">
        <h2 className="text-2xl md:text-4xl font-bold mb-4 text-foreground">
          Ready to launch yours?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          The 7-day trial includes everything above. No card required to start.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          Create my assistant
        </Link>
      </section>
    </div>
  );
};

export default HowItWorks;
