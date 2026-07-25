/**
 * HorizontalScrollStory — Apple-style sticky horizontal 3D scroll
 *
 * Covers 4 panels:
 *  01 — Understanding Creates Independence
 *  02 — The Information Gap (research stats)
 *  03 — Compliance Alignment
 *  04 — Operational Cost & Risk
 *
 * Desktop: sticky section (500 vh tall) with horizontally-moving panels.
 * Mobile : regular vertical sections with whileInView stagger.
 */
import { useRef, useState } from "react"
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion"
import {
  Shield,
  Scale,
  Gavel,
  Phone,
  Users,
  TrendingDown,
  Sparkles,
  ArrowRight,
} from "lucide-react"

// ── image paths (served from /public/images) ──────────────────
const reliefImg           = "/images/talkweb-relief.webp"
const reasonableAdjImg    = "/images/talkweb-reasonable-adjustments.webp"
const compliantStuckImg   = "/images/talkweb-compliant-stuck.webp"
const introducingImg      = "/images/talkweb-introducing.webp"
const complianceImg       = "/images/talkweb-compliance-alignment.webp"
const complianceLifeImg   = "/images/talkweb-compliance-life.webp"
const operationalCostImg  = "/images/talkweb-operational-cost.webp"
const reducesRiskImg      = "/images/talkweb-reduces-risk.webp"

// ── scroll input range for each panel's "dwell + enter" ────────
// Container = 500 vh → scrollYProgress 0 → 1
// Panel 1 dwell: 0.00 – 0.12   transition to P2: 0.12 – 0.25
// Panel 2 dwell: 0.25 – 0.37   transition to P3: 0.37 – 0.50
// Panel 3 dwell: 0.50 – 0.62   transition to P4: 0.62 – 0.75
// Panel 4 dwell: 0.75 – 1.00

// ────────────────────────────────────────────────────────────────
// PANEL 1 — Understanding Creates Independence
// ────────────────────────────────────────────────────────────────
function P1Independence({ sp }: { sp: MotionValue<number> }) {
  const op  = useTransform(sp, [0, 0.07], [0, 1])
  const imgY = useTransform(sp, [0, 0.12], [40, 0])
  const txtY = useTransform(sp, [0, 0.12], [65, 0])

  return (
    <div
      className="relative flex w-screen flex-shrink-0 items-center overflow-hidden px-6 sm:px-12 lg:px-20"
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, hsl(258 70% 7%) 0%, hsl(222 60% 5%) 100%)",
      }}
      aria-label="Understanding creates independence"
    >
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] translate-x-1/3 -translate-y-1/3 rounded-full blur-3xl"
        style={{ background: "hsl(258 90% 58% / 0.10)" }} />
      {/* Watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden">
        <span className="font-black leading-none text-white/[0.025]"
          style={{ fontSize: "clamp(130px, 28vw, 340px)" }}>01</span>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-2">
        {/* Images */}
        <motion.div style={{ opacity: op, y: imgY }} className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <img src={reliefImg} alt="TalkWeb reduces council call volumes" className="h-auto w-full object-cover" loading="lazy" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-xl" style={{ opacity: 0.82 }}>
            <img src={reasonableAdjImg} alt="Reasonable adjustments via voice" className="h-auto w-full object-cover" loading="lazy" />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div style={{ opacity: op, y: txtY }} className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-violet-300" aria-hidden="true" />
            <span className="text-sm font-medium text-violet-200">Built on what you already have</span>
          </div>

          <h2 className="text-4xl font-bold leading-tight text-white lg:text-5xl xl:text-[3.5rem]">
            Understanding Creates{" "}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #a78bfa 0%, #67e8f9 100%)" }}>
              Independence
            </span>
          </h2>

          <p className="text-lg leading-relaxed text-white/65">
            Most online content expects people to read, scroll, and search. TalkWeb reads your
            existing websites, documents, and digital profiles — letting every visitor ask
            questions and get answers instantly, on their own terms.
          </p>

          <ul className="space-y-3">
            {[
              "No new content to write — works with what you have",
              "Visitors get answers without navigating complex pages",
              "Voice-first access removes barriers for all users",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-white/60">
                <ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// PANEL 2 — The Information Gap
// ────────────────────────────────────────────────────────────────
const researchStats = [
  { value: "90%",      label: "cannot understand financial or insurance documents",      source: "OECD / World Literacy Foundation" },
  { value: "773M+",   label: "adults worldwide have low literacy skills",                source: "UNESCO" },
  { value: "1 in 6",  label: "adults globally read below a functional level",            source: undefined },
  { value: "12%",     label: "can navigate complex policy documents",                    source: undefined },
]

function P2Gap({ sp }: { sp: MotionValue<number> }) {
  const op    = useTransform(sp, [0.22, 0.32], [0, 1])
  const y     = useTransform(sp, [0.22, 0.34], [55, 0])
  const imgSc = useTransform(sp, [0.22, 0.35], [0.9, 1])

  return (
    <div
      className="relative flex w-screen flex-shrink-0 items-center overflow-hidden px-6 sm:px-12 lg:px-20"
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, hsl(200 60% 5%) 0%, hsl(210 50% 4%) 100%)",
      }}
      aria-label="The information accessibility gap"
    >
      {/* Giant 90% watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden">
        <span className="font-black leading-none text-cyan-400/[0.04]"
          style={{ fontSize: "clamp(160px, 38vw, 460px)" }}>90%</span>
      </div>
      {/* Glow */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "hsl(194 85% 55% / 0.06)" }} />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
        {/* Stats */}
        <motion.div style={{ opacity: op, y }} className="space-y-7">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">The Research</p>
            <h2 className="text-4xl font-bold leading-tight text-white lg:text-5xl">
              The gap{" "}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #67e8f9 0%, #a78bfa 100%)" }}>
                most organisations miss
              </span>
            </h2>
            <p className="mt-4 text-white/55 leading-relaxed">
              Technical WCAG compliance ensures websites work with assistive technology.
              But it doesn't guarantee users can <em>understand</em> the content.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {researchStats.map((stat, i) => (
              <div key={i} className="rounded-2xl border border-cyan-400/10 bg-white/[0.04] p-5 backdrop-blur-sm"
                style={{ boxShadow: "0 4px 24px hsl(194 85% 55% / 0.06)" }}>
                <p className="text-2xl font-bold text-cyan-300 lg:text-3xl">{stat.value}</p>
                <p className="mt-1 text-sm leading-snug text-white/55">{stat.label}</p>
                {stat.source && <p className="mt-2 text-xs italic text-white/30">{stat.source}</p>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Images */}
        <motion.div style={{ opacity: op, y, scale: imgSc }} className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <img src={compliantStuckImg} alt="Users stuck despite WCAG compliance" className="h-auto w-full object-cover" loading="lazy" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-xl" style={{ opacity: 0.75 }}>
            <img src={introducingImg} alt="TalkWeb voice layer over existing content" className="h-auto w-full object-cover" loading="lazy" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// PANEL 3 — Compliance Alignment
// ────────────────────────────────────────────────────────────────
const complianceCards = [
  {
    icon: Scale, title: "FCA Consumer Duty",
    desc: "Firms must ensure customers can understand products and services clearly.",
    color: "#06b6d4", glow: "hsl(194 85% 55% / 0.14)",
  },
  {
    icon: Gavel, title: "Consumer Rights Act",
    desc: "Contract terms must be written in clear, intelligible language.",
    color: "#a78bfa", glow: "hsl(258 90% 65% / 0.14)",
  },
  {
    icon: Shield, title: "Equality Act 2010",
    desc: "Make reasonable adjustments for dyslexia, cognitive impairments, and low digital confidence.",
    color: "#34d399", glow: "hsl(160 64% 52% / 0.14)",
  },
]

function P3Compliance({ sp }: { sp: MotionValue<number> }) {
  const op     = useTransform(sp, [0.47, 0.57], [0, 1])
  const y      = useTransform(sp, [0.47, 0.59], [55, 0])
  const cardSc = useTransform(sp, [0.47, 0.60], [0.92, 1])

  return (
    <div
      className="relative flex w-screen flex-shrink-0 items-center overflow-hidden px-6 sm:px-12 lg:px-20"
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, hsl(240 60% 6%) 0%, hsl(222 55% 4%) 100%)",
      }}
      aria-label="Compliance alignment"
    >
      {/* Watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden">
        <span className="font-black leading-none text-white/[0.025]"
          style={{ fontSize: "clamp(130px, 28vw, 340px)" }}>03</span>
      </div>
      {/* Glow */}
      <div aria-hidden className="pointer-events-none absolute left-0 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "hsl(258 90% 58% / 0.07)" }} />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        {/* Header */}
        <motion.div style={{ opacity: op, y }} className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-400">
            Regulatory Alignment
          </p>
          <h2 className="text-4xl font-bold text-white lg:text-5xl">
            From compliance statements to{" "}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #a78bfa 0%, #34d399 100%)" }}>
              real accessibility
            </span>
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-white/55">
            True accessibility is whether users can successfully access <em>and understand</em> the
            information they need — not just whether the website meets technical standards.
          </p>
        </motion.div>

        {/* Compliance cards */}
        <motion.div style={{ opacity: op, y, scale: cardSc }}
          className="grid grid-cols-3 gap-6">
          {complianceCards.map((card, i) => (
            <div key={i}
              className="group rounded-2xl border bg-white/[0.04] p-7 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2"
              style={{ borderColor: `${card.color}35`, boxShadow: `0 8px 32px ${card.glow}` }}>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border"
                style={{ borderColor: `${card.color}35`, background: `${card.color}18` }}>
                <card.icon className="h-6 w-6" style={{ color: card.color }} aria-hidden="true" />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-white">{card.title}</h3>
              <p className="text-sm leading-relaxed text-white/60">{card.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Compliance images below cards */}
        <motion.div style={{ opacity: op }} className="mt-8 grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg">
            <img src={complianceImg} alt="Compliance alignment" className="h-auto w-full object-cover" loading="lazy" />
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg" style={{ opacity: 0.75 }}>
            <img src={complianceLifeImg} alt="From compliance to real practice" className="h-auto w-full object-cover" loading="lazy" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// PANEL 4 — Operational Cost & Risk
// ────────────────────────────────────────────────────────────────
const costItems = [
  { icon: Phone,       label: "High inbound call volumes" },
  { icon: Users,       label: "Contact centre pressure" },
  { icon: TrendingDown, label: "Slower response times" },
  { icon: Scale,       label: "Increased complaints" },
]

function P4Cost({ sp }: { sp: MotionValue<number> }) {
  const op     = useTransform(sp, [0.72, 0.82], [0, 1])
  const y      = useTransform(sp, [0.72, 0.84], [55, 0])
  const imgSc  = useTransform(sp, [0.72, 0.86], [0.9, 1])

  return (
    <div
      className="relative flex w-screen flex-shrink-0 items-center overflow-hidden px-6 sm:px-12 lg:px-20"
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, hsl(0 45% 6%) 0%, hsl(222 55% 4%) 100%)",
      }}
      aria-label="Operational cost and risk"
    >
      {/* Glow */}
      <div aria-hidden className="pointer-events-none absolute right-0 bottom-0 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full blur-3xl"
        style={{ background: "hsl(0 70% 40% / 0.08)" }} />
      {/* Watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden">
        <span className="font-black leading-none text-white/[0.025]"
          style={{ fontSize: "clamp(130px, 28vw, 340px)" }}>04</span>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
        {/* Text */}
        <motion.div style={{ opacity: op, y }} className="space-y-7">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">
              Operational Impact
            </p>
            <h2 className="text-4xl font-bold leading-tight text-white lg:text-5xl">
              Accessibility becomes a{" "}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #f87171 0%, #a78bfa 100%)" }}>
                cost-saving measure
              </span>
            </h2>
          </div>

          <p className="text-lg leading-relaxed text-white/60">
            When customers can't understand your information, they call your support team to ask
            questions already answered on your website — creating avoidable operational costs and
            regulatory risk.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {costItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                <item.icon className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                <span className="text-sm text-white/70">{item.label}</span>
              </div>
            ))}
          </div>

          <p className="text-sm leading-relaxed text-white/40">
            TalkWeb enables self-service conversational access — reducing repetitive support
            requests, staff explanation time, complaints, and regulatory exposure.
          </p>
        </motion.div>

        {/* Images */}
        <motion.div style={{ opacity: op, y, scale: imgSc }} className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <img src={operationalCostImg} alt="Operational cost of inaccessibility" className="h-auto w-full object-cover" loading="lazy" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-xl" style={{ opacity: 0.75 }}>
            <img src={reducesRiskImg} alt="TalkWeb reduces legal and reputational risk" className="h-auto w-full object-cover" loading="lazy" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// MOBILE — touch-swipe horizontal carousel with CSS snap
// ────────────────────────────────────────────────────────────────
const mobilePanels = [
  {
    label: "01 — Independence",
    title: "Understanding Creates",
    highlight: "Independence",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #67e8f9 100%)",
    accentColor: "#a78bfa",
    bg: "hsl(258 70% 7%)",
    body: "TalkWeb reads your existing websites, documents, and digital profiles — letting every visitor ask questions and get answers instantly, on their own terms.",
    img: reliefImg,
    imgAlt: "TalkWeb voice access",
  },
  {
    label: "02 — The Gap",
    title: "90% struggle with",
    highlight: "online information",
    gradient: "linear-gradient(135deg, #67e8f9 0%, #a78bfa 100%)",
    accentColor: "#67e8f9",
    bg: "hsl(200 60% 5%)",
    body: "773M+ adults worldwide have low literacy skills. WCAG compliance doesn't mean users aren't stuck — it means the website meets a technical standard, not that users understand it.",
    img: compliantStuckImg,
    imgAlt: "Users stuck despite WCAG compliance",
  },
  {
    label: "03 — Compliance",
    title: "From compliance to",
    highlight: "real accessibility",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #34d399 100%)",
    accentColor: "#34d399",
    bg: "hsl(240 60% 6%)",
    body: "FCA Consumer Duty, Consumer Rights Act, and the Equality Act all require organisations to make information genuinely understandable — not just technically accessible.",
    img: complianceImg,
    imgAlt: "Compliance alignment",
  },
  {
    label: "04 — Impact",
    title: "Accessibility becomes",
    highlight: "cost-saving",
    gradient: "linear-gradient(135deg, #f87171 0%, #a78bfa 100%)",
    accentColor: "#f87171",
    bg: "hsl(0 45% 6%)",
    body: "When users can't self-serve, they call your team, causing avoidable operational costs and regulatory risk. TalkWeb reduces repetitive support requests, complaints, and exposure.",
    img: operationalCostImg,
    imgAlt: "Operational cost of inaccessibility",
  },
]

function MobileStory() {
  const [active, setActive] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const onScroll = () => {
    if (!scrollRef.current) return
    const idx = Math.round(
      scrollRef.current.scrollLeft / scrollRef.current.offsetWidth
    )
    setActive(Math.max(0, Math.min(mobilePanels.length - 1, idx)))
  }

  const goTo = (i: number) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({ left: i * scrollRef.current.offsetWidth, behavior: "smooth" })
  }

  return (
    <div>
      {/* ── Dot / progress bar indicators ── */}
      <div
        className="flex items-center justify-center gap-2 py-4 transition-colors duration-500"
        style={{ background: mobilePanels[active].bg }}
        aria-hidden="true"
      >
        {mobilePanels.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="h-1.5 rounded-full bg-white transition-all duration-300"
            style={{
              width: i === active ? "28px" : "6px",
              opacity: i === active ? 0.9 : 0.30,
            }}
            aria-label={`Go to panel ${i + 1}`}
          />
        ))}
      </div>

      {/* ── Swipe strip ── */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {mobilePanels.map((panel, i) => (
          <section
            key={i}
            className="relative w-screen flex-shrink-0 snap-start overflow-hidden px-5 pb-16 pt-14"
            style={{ background: panel.bg }}
            aria-label={panel.label}
          >
            {/* Top accent line */}
            <div
              className="absolute left-0 right-0 top-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, ${panel.accentColor}, transparent)` }}
            />

            {/* Swipe hint — first panel only */}
            {i === 0 && (
              <div className="mb-4 flex items-center justify-end gap-1.5 text-white/30">
                <span className="text-xs font-medium uppercase tracking-widest">Swipe</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            )}

            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: panel.accentColor, opacity: 0.85 }}
            >
              {panel.label}
            </p>

            <h2 className="mb-4 text-3xl font-bold leading-tight text-white">
              {panel.title}{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: panel.gradient }}
              >
                {panel.highlight}
              </span>
            </h2>

            <p className="mb-6 text-base leading-relaxed text-white/65">{panel.body}</p>

            <div className="overflow-hidden rounded-2xl border border-white/10 shadow-xl">
              <img
                src={panel.img}
                alt={panel.imgAlt}
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Next panel nudge — all except last */}
            {i < mobilePanels.length - 1 && (
              <button
                onClick={() => goTo(i + 1)}
                className="mt-6 flex w-full items-center justify-center gap-2 text-xs text-white/30 uppercase tracking-widest"
                aria-label="Next panel"
              >
                <span>Next</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ────────────────────────────────────────────────────────────────
export function HorizontalScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  // Dwell keyframes — panels "snap" with smooth linear transitions
  const x = useTransform(
    scrollYProgress,
    [0, 0.12, 0.25, 0.37, 0.50, 0.62, 0.75, 1.00],
    ["0%", "0%", "-25%", "-25%", "-50%", "-50%", "-75%", "-75%"]
  )

  // Top progress bar
  const progressW = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])

  // Panel indicator dots
  const dot0 = useTransform(scrollYProgress, [0, 0.10, 0.20],             [1, 1, 0.30])
  const dot1 = useTransform(scrollYProgress, [0.18, 0.25, 0.44, 0.52],    [0.30, 1, 1, 0.30])
  const dot2 = useTransform(scrollYProgress, [0.44, 0.50, 0.70, 0.78],    [0.30, 1, 1, 0.30])
  const dot3 = useTransform(scrollYProgress, [0.70, 0.75, 1.0],            [0.30, 1, 1])
  const dotOps = [dot0, dot1, dot2, dot3]

  // Panel label text
  const labels = [
    "Understanding Creates Independence",
    "The Information Gap",
    "Compliance Alignment",
    "Operational Cost & Risk",
  ]

  // Current label fades per panel
  const lbl0op = useTransform(scrollYProgress, [0, 0.10, 0.20],          [1, 1, 0])
  const lbl1op = useTransform(scrollYProgress, [0.20, 0.28, 0.44, 0.50], [0, 1, 1, 0])
  const lbl2op = useTransform(scrollYProgress, [0.46, 0.53, 0.68, 0.75], [0, 1, 1, 0])
  const lbl3op = useTransform(scrollYProgress, [0.70, 0.77, 1.0],         [0, 1, 1])
  const lblOps = [lbl0op, lbl1op, lbl2op, lbl3op]

  return (
    <>
      {/* ══════════════════════════════════════════════════
          DESKTOP — sticky horizontal scroll
         ══════════════════════════════════════════════════ */}
      <div
        ref={containerRef}
        className="relative hidden md:block"
        style={{ height: "500vh" }}
        aria-label="TalkWeb story — scroll to explore"
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* ── Top progress bar ── */}
          <div className="absolute left-0 right-0 top-0 z-50 h-[2px] bg-white/[0.08]">
            <motion.div
              style={{ width: progressW, background: "linear-gradient(90deg, hsl(258 90% 65%), hsl(194 85% 55%))" }}
              className="h-full"
            />
          </div>

          {/* ── Panel indicator — top left ── */}
          <div className="absolute left-8 top-6 z-50 flex items-center gap-3">
            {dotOps.map((op, i) => (
              <motion.div
                key={i}
                style={{ opacity: op }}
                className="h-1.5 w-1.5 rounded-full bg-white"
              />
            ))}
          </div>

          {/* ── Current section label — top centre ── */}
          <div className="absolute top-5 left-1/2 z-50 -translate-x-1/2">
            {labels.map((lbl, i) => (
              <motion.p
                key={i}
                style={{ opacity: lblOps[i] }}
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.2em] text-white/50"
              >
                {lbl}
              </motion.p>
            ))}
          </div>

          {/* ── Scroll hint on panel 1 ── */}
          <motion.div
            style={{ opacity: lbl0op }}
            className="absolute bottom-10 right-10 z-50 flex items-center gap-2 text-white/30"
          >
            <span className="text-xs font-medium uppercase tracking-widest">Scroll to explore</span>
            <ArrowRight className="h-4 w-4 animate-bounce" style={{ animationDirection: "alternate", transform: "rotate(-90deg)" }} aria-hidden="true" />
          </motion.div>

          {/* ── Horizontally scrolling strip (width = 4 × 100vw = 400vw) ── */}
          <motion.div
            className="flex h-full"
            style={{ x, width: "400vw" }}
          >
            <P1Independence sp={scrollYProgress} />
            <P2Gap          sp={scrollYProgress} />
            <P3Compliance   sp={scrollYProgress} />
            <P4Cost         sp={scrollYProgress} />
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MOBILE — vertical sections
         ══════════════════════════════════════════════════ */}
      <div className="md:hidden">
        <MobileStory />
      </div>
    </>
  )
}
