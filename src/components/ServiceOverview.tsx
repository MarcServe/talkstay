import { motion } from "framer-motion";
import {
  VoiceAIIcon,
  CalendarIcon,
  GlobeIcon,
  ShieldCheckIcon,
  DocumentIcon,
  NoCodeIcon,
} from "@/components/ui/brand-icons";

const features = [
  {
    icon: VoiceAIIcon,
    title: "Voice AI Assistant",
    desc: "Visitors ask questions instead of searching pages — and get instant, step-by-step answers from your existing content.",
    accent: "#7c3aed",
    wide: true,
  },
  {
    icon: GlobeIcon,
    title: "57+ Languages",
    desc: "Multilingual support with plain language simplification for non-native speakers.",
    accent: "#06b6d4",
    wide: false,
  },
  {
    icon: CalendarIcon,
    title: "Booking & Connection",
    desc: "Book appointments, trigger calls, and route to departments — reducing inbound calls and staff workload.",
    accent: "#4285F4",
    wide: false,
  },
  {
    icon: ShieldCheckIcon,
    title: "Equality Act Aligned",
    desc: "Supports reasonable adjustments for people with disabilities — including dyslexia, cognitive impairments, and low digital confidence.",
    accent: "#34A853",
    wide: false,
  },
  {
    icon: DocumentIcon,
    title: "Document Explainers",
    desc: "Transform static PDFs and policies into interactive, conversational experiences anyone can understand.",
    accent: "#EA4335",
    wide: false,
  },
  {
    icon: NoCodeIcon,
    title: "No Rebuild Required",
    desc: "Layers over your existing content via widget, QR code, or hosted link. Works on any platform in under 5 minutes.",
    accent: "#10b981",
    wide: false,
  },
];

export const ServiceOverview = () => {
  return (
    <section className="bg-background py-20" aria-label="Services overview">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            It doesn't replace your content.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
              }}
            >
              It makes it understandable.
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Every link today is scroll → search → read. TalkWeb changes it to{" "}
            <strong className="text-foreground">ask → listen → act</strong>.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 48, rotateX: -8 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ transformPerspective: 1200 }}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                f.wide ? "sm:col-span-2 lg:col-span-2" : ""
              }`}
            >
              {/* Top accent line */}
              <div
                className="absolute left-0 right-0 top-0 h-[3px] transition-opacity duration-300"
                style={{
                  background: `linear-gradient(90deg, ${f.accent}, ${f.accent}40)`,
                }}
              />

              {/* Hover glow */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at 20% 20%, ${f.accent}0d 0%, transparent 60%)`,
                }}
              />

              {/* Icon */}
              <div
                className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-background"
              >
                <f.icon className="h-7 w-7" aria-hidden="true" />
              </div>

              {/* Content */}
              <h3 className="mb-2 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>

              {/* Wide card badge */}
              {f.wide && (
                <div
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: `${f.accent}40`,
                    color: f.accent,
                    background: `${f.accent}0f`,
                  }}
                >
                  Core Feature
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
