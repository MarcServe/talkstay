import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HorizontalScrollStory } from "@/components/HorizontalScrollStory";
import { ChannelsSection } from "@/components/ChannelsSection";
import { ServiceOverview } from "@/components/ServiceOverview";
import { SectorsGrid } from "@/components/SectorsGrid";

import { SimplifiedVoiceInterface } from "@/components/SimplifiedVoiceInterface";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import {
  Sparkles,
  ArrowRight,
  ExternalLink,
  Mic,
  Globe,
  Link2,
  Settings2,
  Rocket,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
const talkwebDemoQr = "/images/talkweb-demo-qr.webp";
import { useAuth } from "@/hooks/useAuth";

/* ─── How It Works — 3-step process ─────────────────────────── */
const steps = [
  {
    number: "01",
    icon: Link2,
    title: "Connect Your Content",
    desc: "Paste your website URL, upload a document, or link your Google Business profile. TalkWeb reads everything you already have. Takes 2 minutes.",
    accent: "#7c3aed",
  },
  {
    number: "02",
    icon: Settings2,
    title: "Customise Your AI",
    desc: "Set the tone, add your business details, and choose your channels — web widget, WhatsApp, or hosted link. We guide you through every step.",
    accent: "#c026d3",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Embed & Go Live",
    desc: "Copy one line of code to your website, share a QR code, or send a link. No developers needed. Your AI is live in under 5 minutes.",
    accent: "#06b6d4",
  },
];

function HowItWorksSection() {
  return (
    <section
      className="border-t border-border bg-background py-16 md:py-24"
      aria-label="How TalkWeb works"
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            Get Started in Minutes
          </p>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Three steps to a{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
              }}
            >
              voice-powered website
            </span>
          </h2>
          <p className="text-muted-foreground">
            No code. No rebuild. No technical knowledge required.
          </p>
        </motion.div>

        <div className="mx-auto max-w-5xl">
          {/* Steps */}
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => {
              // Fan-out: left card slides from left, centre from below, right from right
              const slideFrom =
                i === 0 ? { x: -80, y: 0 } :
                i === 2 ? { x:  80, y: 0 } :
                           { x:   0, y: 48 };
              return (
              <motion.div
                key={i}
                initial={{ opacity: 0, ...slideFrom }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Accent top bar */}
                <div
                  className="absolute left-0 right-0 top-0 h-[3px]"
                  style={{ background: `linear-gradient(90deg, ${s.accent}, ${s.accent}40)` }}
                />
                {/* Hover glow */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at 30% 20%, ${s.accent}0d 0%, transparent 70%)`,
                  }}
                />

                {/* Number */}
                <div
                  className="mb-5 inline-flex text-5xl font-black leading-none tracking-tight opacity-15"
                  style={{ color: s.accent }}
                >
                  {s.number}
                </div>

                {/* Icon */}
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-background"
                >
                  <s.icon
                    className="h-5 w-5"
                    style={{ color: s.accent }}
                    aria-hidden="true"
                  />
                </div>

                <h3 className="mb-2 text-base font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </motion.div>
              );
            })}
          </div>

          {/* Connector (desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 hidden items-center justify-center gap-4 md:flex"
          >
            <Link to="/create-assistant">
              <Button
                size="lg"
                className="gap-2 border-0 text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",
                  boxShadow: "0 8px 24px hsl(258 90% 58% / 0.30)",
                }}
              >
                <Mic className="h-5 w-5" aria-hidden="true" />
                Start Free — 5 Minutes Setup
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
const Index = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* PWA Install Button */}
      <div className="fixed bottom-24 right-4 z-[60]" role="complementary" aria-label="Install app">
        <PWAInstallButton />
      </div>

      <main>
        <HeroSection />

        {/* ── Who we deploy for ── */}
        <SectorsGrid />

        {/* ── How It Works ── */}
        <HowItWorksSection />

        {/* ── See TalkWeb Widget on a Website ── */}
        <section
          className="border-t border-border bg-background py-16 md:py-24"
          aria-label="See TalkWeb on a real website"
        >
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-10 text-center"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                See It Live
              </p>
              <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                TalkWeb{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
                  }}
                >
                  on a Real Website
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Here's what TalkWeb looks like when embedded on a live business website. The
                floating widget sits in the corner, ready for visitors to engage.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-5xl"
            >
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex flex-1 items-center justify-center">
                    <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                      <span>www.bizboosters.co.uk</span>
                    </div>
                  </div>
                </div>

                {/* Website iframe */}
                <div className="relative" style={{ height: "520px" }}>
                  <iframe
                    src="https://www.bizboosters.co.uk"
                    title="Biz Boosters website with TalkWeb widget demo"
                    className="h-full w-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    loading="lazy"
                  />
                </div>

                {/* Caption */}
                <div className="flex flex-wrap items-center justify-center gap-4 border-t border-border bg-muted/50 px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Biz Boosters</span> — the
                    TalkWeb widget sits in the bottom-right corner, ready for voice or chat.
                  </p>
                  <a
                    href="https://talkweb.io/preview/e7fa0f16-ba8e-4277-bd80-70f0aa25cbad?mode=widget-only"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="hero" size="sm" className="gap-2">
                      <Mic className="h-4 w-4" aria-hidden="true" />
                      Try the widget live
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Accessibility & Convenience ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="border-b border-border bg-muted/30 py-16"
        >
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
              Built For Convenience. Powerful For Accessibility.
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground md:text-lg leading-relaxed">
              TalkWeb helps all users navigate faster — while providing an alternative access route
              for people who struggle with reading, digital complexity, or traditional web interfaces.
            </p>

            {/* Inclusion badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-accent"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
              <span className="text-sm font-medium text-accent">
                AI for Disability Inclusion — Breaking Web Barriers
              </span>
            </div>

            {/* Compliance chips */}
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
                <span className="text-xs font-semibold text-primary">FCA Consumer Duty</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                <span className="text-xs font-semibold text-primary">Consumer Rights Act</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                <span className="text-xs font-semibold text-primary">Equality Act</span>
              </div>
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "WCAG Compliant" },
                { label: "5-Minute Setup" },
                { label: "No Code Required" },
                { label: "Voice Forms" },
              ].map((chip, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 12 2 2 4-4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                  <span className="text-sm font-medium">{chip.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Video showcase ── */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-8 text-center text-2xl font-bold text-foreground md:text-3xl"
            >
              Create your Assistant in{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
                }}
              >
                60 seconds
              </span>
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            >
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <video
                  src="https://oujqkygfmyapmrgxmhvt.supabase.co/storage/v1/object/public/Videos/0413%20(1)(2).mp4"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  poster="https://oujqkygfmyapmrgxmhvt.supabase.co/storage/v1/object/public/Videos/0413%20(1)(2).mp4#t=0.5"
                  className="absolute left-0 top-0 h-full w-full bg-black object-contain"
                />
              </div>
            </motion.div>
          </div>
        </section>

        <ChannelsSection />

        {/* ── Apple-style horizontal scroll story (Independence → Gap → Compliance → Cost) ── */}
        <HorizontalScrollStory />

        <div className="border-t border-border">
          <ServiceOverview />
        </div>

        {/* ── Voice Forms Feature Section ── */}
        <section
          className="border-t border-border bg-muted/30 py-16 md:py-24"
          aria-label="Voice Forms feature"
        >
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16">
              {/* Text */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  Voice Forms
                </div>
                <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl lg:text-5xl">
                  Collect Data Through{" "}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
                    }}
                  >
                    Conversation
                  </span>
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Replace clunky web forms with natural voice conversations. Visitors simply talk,
                  and TalkWeb collects the information you need — names, emails, project details —
                  without a single form field.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  {[
                    "Higher completion rates than traditional forms",
                    "Accessible to users who struggle with typing or reading",
                    "Instant email notifications with collected data",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <ArrowRight
                        className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/voice-form-demo">
                  <Button variant="hero" size="lg" className="gap-2">
                    <Mic className="h-5 w-5" aria-hidden="true" />
                    Try Voice Forms Demo
                  </Button>
                </Link>
              </motion.div>

              {/* Feature card */}
              <motion.div
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center"
              >
                <div className="relative max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
                  {/* Accent top */}
                  <div
                    className="absolute left-0 right-0 top-0 h-[3px]"
                    style={{
                      background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                    }}
                  />
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Mic className="h-10 w-10 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-foreground">No More Form Fatigue</h3>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Your visitors just speak naturally. TalkWeb asks the right questions, validates
                    responses, and delivers structured data to your inbox.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["Lead Capture", "Surveys", "Intake Forms"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── See TalkWeb in Action ── */}
        <section
          className="border-t border-border bg-background py-16 md:py-24"
          aria-label="See TalkWeb in action"
        >
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-10 text-center"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Try It Now
              </p>
              <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                See TalkWeb{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
                  }}
                >
                  in Action
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Ask it anything. Just like your visitors will.
              </p>
            </motion.div>

            <div className="mx-auto grid max-w-4xl items-center gap-6 md:grid-cols-2">
              {/* CTA card */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-lg"
              >
                <div
                  className="absolute left-0 right-0 top-0 h-[3px]"
                  style={{ background: "linear-gradient(90deg, #7c3aed, #c026d3)" }}
                />
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Mic className="h-8 w-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground">Try the Live Demo</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Click below and just ask. Explore services, get answers, and see exactly how
                  TalkWeb works.
                </p>
                <a
                  href="https://talkweb.io/preview/05750dee-98db-460b-a235-db5ef7bcef2d?mode=widget-only"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="hero" size="lg" className="w-full gap-2">
                    <ExternalLink className="h-5 w-5" aria-hidden="true" />
                    Talk to TalkWeb Now
                  </Button>
                </a>
                <p className="mt-4 text-xs text-muted-foreground">
                  No sign-up required · Works on any device
                </p>
              </motion.div>

              {/* QR card */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-lg"
              >
                <div
                  className="absolute left-0 right-0 top-0 h-[3px]"
                  style={{ background: "linear-gradient(90deg, #06b6d4, #7c3aed)" }}
                />
                <h3 className="mb-3 text-xl font-bold text-foreground">Scan to Try on Mobile</h3>
                <p className="mb-5 text-sm text-muted-foreground">
                  Point your phone camera at this QR code to experience TalkWeb on your mobile
                  device.
                </p>
                <img
                  src={talkwebDemoQr}
                  alt="QR code to try TalkWeb on your phone"
                  className="mx-auto h-48 w-48 rounded-xl border border-border"
                />
                <p className="mt-4 text-xs text-muted-foreground">Scan with your phone camera</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section
          className="relative overflow-hidden py-16 md:py-24"
          aria-label="Get started"
          style={{
            background:
              "linear-gradient(135deg, hsl(258 90% 58% / 0.12) 0%, hsl(194 85% 42% / 0.08) 100%)",
          }}
        >
          {/* Grid overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--border) / 0.4) 1px, transparent 1px)," +
                "linear-gradient(90deg, hsl(var(--border) / 0.4) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 80% 100% at 50% 50%, black, transparent)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 100% at 50% 50%, black, transparent)",
              opacity: 0.35,
            }}
          />

          {/* Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: "hsl(258 90% 58% / 0.15)" }}
          />

          <motion.div
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="container relative z-10 mx-auto max-w-2xl px-4 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Too much to read?{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
                }}
              >
                Let them just ask.
              </span>
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Give every visitor a voice — set up TalkWeb in minutes, or see it in action with a
              personalised demo.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/book-demo">
                <Button
                  size="lg"
                  className="w-full gap-2 border-0 text-white shadow-lg sm:w-auto"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",
                    boxShadow: "0 8px 24px hsl(258 90% 58% / 0.30)",
                  }}
                >
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  Book a Demo
                </Button>
              </Link>
              <Link to="/create-assistant">
                <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
                  Try It Yourself
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <SimplifiedVoiceInterface
        assistantId="d872e528-d39d-4d53-9f03-1eb7bd724048"
        showChatButton={true}
      />
    </div>
  );
};

export default Index;
