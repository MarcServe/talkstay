import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronDown,
  Mic,
  Zap,
  Calendar,
  Globe,
  TrendingUp,
  Accessibility,
  CheckCircle2,
} from "lucide-react";
import { BrandedMicIcon } from "@/components/ui/branded-mic-icon";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HeroMicVisual } from "@/components/HeroMicVisual";
import { openBookDemo } from "@/components/PricingSection";

// ── animation variants ─────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

interface HeroSectionProps {
  isBasicMode?: boolean;
}

export const HeroSection = ({ isBasicMode = false }: HeroSectionProps) => {
  const navigate = useNavigate();
  const handleCreateAssistant = () => navigate("/create-assistant");

  const benefits = [
    { icon: Zap,           text: "Instant Answers" },
    { icon: Mic,           text: "Voice Conversations" },
    { icon: Calendar,      text: "Smart Booking" },
    { icon: Globe,         text: "All Channels" },
    { icon: Accessibility, text: "Better Accessibility" },
    { icon: TrendingUp,    text: "More Conversions" },
  ];

  const stats = [
    { value: "24/7",    label: "AI Availability" },
    { value: "Instant", label: "Voice Responses" },
    { value: "57+",     label: "Languages" },
  ];

  const trustedBrands = ["WordPress", "Webflow", "Wix", "Google Business"];

  return (
    <section
      id="hero"
      className="relative overflow-hidden flex flex-col"
      aria-label="Hero"
      style={{
        background:
          "radial-gradient(ellipse at 65% 0%, hsl(258 90% 58% / 0.10) 0%, transparent 55%), " +
          "radial-gradient(ellipse at 5% 90%, hsl(194 85% 42% / 0.07) 0%, transparent 50%), " +
          "hsl(var(--background))",
      }}
    >
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border) / 0.5) 1px, transparent 1px)," +
            "linear-gradient(90deg, hsl(var(--border) / 0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 0%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 0%, black 30%, transparent 100%)",
          opacity: 0.4,
        }}
      />

      {/* Ambient glow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/4 rounded-full blur-3xl"
        style={{ background: "hsl(258 90% 58% / 0.09)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/4 rounded-full blur-3xl"
        style={{ background: "hsl(194 85% 42% / 0.07)" }}
      />

      {/* Main content */}
      <div className="container relative z-10 mx-auto px-4 pb-10 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-8">

          {/* ── Left column ── */}
          <div className="order-2 space-y-6 lg:order-1">

            {/* Badge */}
            <motion.div
              {...fadeUp(0)}
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 backdrop-blur-sm"
            >
              <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-primary">
                Implementation-led · Outcome-first
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...fadeUp(0.08)}
              className="text-5xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
            >
              Instant Access to
              <br />
              <span className="inline-flex items-center gap-2">
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #06b6d4 100%)",
                  }}
                >
                  → Information
                </span>
                <Mic
                  className="h-[0.65em] w-[0.65em] text-primary"
                  aria-hidden="true"
                />
              </span>
            </motion.h1>

            {/* Subtitle — the requested text */}
            <motion.div {...fadeUp(0.14)} className="space-y-1">
              <p className="text-xl font-semibold text-foreground">
                We deploy AI assistants for your organisation.
              </p>
              <p className="text-base text-muted-foreground">
                So your people find answers instantly — without scrolling long pages, searching PDFs, waiting on hold, or emailing support.
              </p>
              <p className="text-base font-bold italic text-primary pt-1">
                Skip scrolling. Just ask.
              </p>
            </motion.div>

            {/* Formula strip */}
            <motion.div
              {...fadeUp(0.2)}
              className="flex max-w-xl flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm backdrop-blur-sm"
            >
              <span className="text-muted-foreground/55 line-through">
                search&nbsp;·&nbsp;scroll&nbsp;·&nbsp;wait on hold
              </span>
              <span className="text-muted-foreground/35 font-light">·</span>
              <span className="font-semibold text-foreground">
                ask&nbsp;
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #06b6d4 100%)" }}
                >
                  →&nbsp;listen&nbsp;→&nbsp;act
                </span>
              </span>
            </motion.div>

            {/* Sub-copy */}
            <motion.p
              {...fadeUp(0.26)}
              className="max-w-xl text-base leading-relaxed text-muted-foreground"
            >
              Built for <strong className="text-foreground">universities, NHS, councils, housing, charities, HR teams, and accessibility-first organisations</strong>. Trained on your content. Available on web, WhatsApp, phone, and voice.
            </motion.p>

            {/* 6 benefits — 3-col compact grid */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid max-w-xl grid-cols-3 gap-2"
              style={{ transitionDelay: "0.32s" }}
            >
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors duration-200 hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <b.icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">{b.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Closing statement */}
            <motion.div
              {...fadeUp(0.46)}
              className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm text-foreground">
                <strong>Stop making people search.</strong>{" "}
                <span className="text-muted-foreground">
                  TalkWeb listens, understands, and responds instantly — turning every question into an answer.
                </span>
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div {...fadeUp(0.52)} className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="xl"
                onClick={openBookDemo}
                className="gap-2 border-0 text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",
                  boxShadow: "0 8px 24px hsl(258 90% 58% / 0.35)",
                }}
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Book a Discovery Call
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>

              <a
                href="https://talkweb.io/preview/05750dee-98db-460b-a235-db5ef7bcef2d?mode=widget-only"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="xl" variant="outline" className="w-full gap-2 sm:w-auto">
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  See Demo
                </Button>
              </a>
            </motion.div>

            {/* Legal */}
            <motion.p {...fadeUp(0.58)} className="text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="/privacy-policy" className="underline underline-offset-2 transition-colors hover:text-primary">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms-of-service" className="underline underline-offset-2 transition-colors hover:text-primary">
                Terms of Service
              </a>.
            </motion.p>
          </div>

          {/* ── Right column — Voice AI visual ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const }}
            className="relative order-1 lg:order-2"
          >
            <div className="relative overflow-hidden rounded-3xl" style={{ height: "520px" }}>
              {/* Dark backdrop */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-3xl"
                style={{ background: "radial-gradient(ellipse at 50% 40%, #1e0840 0%, #08091a 100%)" }}
              />

              {/* Purple grid */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(139,92,246,0.35) 1px, transparent 1px)," +
                    "linear-gradient(90deg, rgba(139,92,246,0.35) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                  maskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 30%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 30%, transparent 100%)",
                }}
              />

              {/* Mic visual */}
              <div className="absolute inset-0" style={{ bottom: "56px" }}>
                <HeroMicVisual />
              </div>

              {/* ── Bubble: user asks to book ── */}
              <motion.div
                initial={{ opacity: 0, y: -12, x: 8 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ delay: 0.9, duration: 0.55, ease: "easeOut" }}
                className="pointer-events-none absolute"
                style={{ top: "5%", right: "4%" }}
              >
                <motion.div
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex max-w-[178px] items-start gap-2 rounded-2xl rounded-tr-sm border border-white/10 bg-white/[0.08] px-3 py-2 shadow-lg backdrop-blur-md"
                >
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-400/30 text-[10px] font-bold text-violet-200">A</div>
                  <p className="text-xs leading-tight text-white/90">"I'd like to book an appointment."</p>
                </motion.div>
              </motion.div>

              {/* ── Bubble: AI booking response ── */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3, duration: 0.55, ease: "easeOut" }}
                className="pointer-events-none absolute"
                style={{ top: "28%", right: "3%" }}
              >
                <motion.div
                  animate={{ y: [3, -3, 3] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                  className="flex max-w-[192px] items-start gap-2 rounded-2xl rounded-br-sm border border-violet-400/20 bg-violet-950/60 px-3 py-2 shadow-lg backdrop-blur-md"
                >
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-600">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs leading-tight text-white/90">"I can help with that." Available times shown instantly.</p>
                    <span className="mt-1.5 inline-block rounded-full bg-violet-500/40 px-2 py-0.5 text-[10px] font-semibold text-violet-200">View Times →</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* ── Bubble: user asks about services ── */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.7, duration: 0.55, ease: "easeOut" }}
                className="pointer-events-none absolute"
                style={{ top: "54%", left: "3%" }}
              >
                <motion.div
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="flex max-w-[168px] items-start gap-2 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.08] px-3 py-2 shadow-lg backdrop-blur-md"
                >
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/30 text-[10px] font-bold text-cyan-200">B</div>
                  <p className="text-xs leading-tight text-white/90">"What services do you offer?"</p>
                </motion.div>
              </motion.div>

              {/* ── Bubble: AI services response ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.1, duration: 0.55, ease: "easeOut" }}
                className="pointer-events-none absolute"
                style={{ bottom: "19%", right: "4%" }}
              >
                <motion.div
                  animate={{ y: [2, -4, 2] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                  className="flex max-w-[186px] items-start gap-2 rounded-2xl rounded-br-sm border border-cyan-400/20 bg-violet-950/60 px-3 py-2 shadow-lg backdrop-blur-md"
                >
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-600">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs leading-tight text-white/90">"Here are the services available." Answers appear instantly.</p>
                    <span className="mt-1.5 inline-block rounded-full bg-cyan-500/40 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">View Services →</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* ── Stats strip ── */}
              <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.07] bg-black/30 backdrop-blur-sm">
                <div className="flex divide-x divide-white/10">
                  {stats.map((s, i) => (
                    <div key={i} className="flex-1 px-3 py-3.5 text-center">
                      <div className="text-base font-bold leading-none text-white">{s.value}</div>
                      <div className="mt-0.5 text-[10px] text-white/50">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Trust strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto mt-16 max-w-7xl rounded-2xl border border-border bg-card/60 px-6 py-5 backdrop-blur-sm"
        >
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Trusted by businesses and creators using
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {trustedBrands.map((brand, i) => (
              <span key={i} className="text-lg font-bold text-muted-foreground/60 transition-colors hover:text-foreground">
                {brand}
              </span>
            ))}
            <span className="text-sm text-muted-foreground/40">& More</span>
          </div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <button
        type="button"
        onClick={() => {
          const hero = document.getElementById("hero");
          const next = hero?.nextElementSibling as HTMLElement | null;
          (next ?? document.body).scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="relative z-10 mx-auto mb-8 mt-2 flex flex-col items-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
        aria-label="Scroll to next section"
      >
        <span className="mb-2 text-xs font-semibold uppercase tracking-[0.25em]">
          Scroll to explore
        </span>
        <ChevronDown className="h-5 w-5 animate-bounce group-hover:translate-y-0.5 transition-transform" aria-hidden="true" />
      </button>
    </section>
  );
};
