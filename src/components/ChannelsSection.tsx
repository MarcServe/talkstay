import { CheckCircle2 } from "lucide-react";
import {
  WhatsAppIcon,
  PhoneCallIcon,
  WebWidgetIcon,
  VoiceAIIcon,
  EmailForwardIcon,
  BioLinkIcon,
  VoiceFormIcon,
} from "@/components/ui/brand-icons";
import { motion } from "framer-motion";

const channels = [
  {
    icon: WebWidgetIcon,
    label: "Website Widget",
    desc: "Embed on any site",
    accent: "#4285F4",
  },
  {
    icon: VoiceAIIcon,
    label: "Voice AI",
    desc: "Real-time voice Q&A",
    accent: "#7c3aed",
  },
  {
    icon: WhatsAppIcon,
    label: "WhatsApp",
    desc: "Conversations forwarded",
    accent: "#25D366",
  },
  {
    icon: PhoneCallIcon,
    label: "Phone",
    desc: "Trigger calls & route",
    accent: "#34A853",
  },
  {
    icon: EmailForwardIcon,
    label: "Email Forwarding",
    desc: "Leads to your inbox",
    accent: "#EA4335",
  },
  {
    icon: BioLinkIcon,
    label: "Bio Link",
    desc: "Social media pages",
    accent: "#FBBC05",
  },
  {
    icon: VoiceFormIcon,
    label: "Voice Forms",
    desc: "Conversational intake",
    accent: "#06b6d4",
  },
];

const trustSignals = [
  "7-day free trial",
  "Cancel anytime",
  "UK-based support team",
  "WCAG compliant",
];

export const ChannelsSection = () => {
  return (
    <section
      className="border-t border-border bg-muted/30 py-14 md:py-20"
      aria-label="TalkWeb works everywhere"
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            All Channels Included
          </p>
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            TalkWeb Works{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
              }}
            >
              Everywhere
            </span>
          </h2>
          <p className="text-muted-foreground">
            Reach your customers on every channel they use. All plans include conversation
            forwarding to your email and WhatsApp.
          </p>
        </motion.div>

        {/* Channel cards */}
        <div className="mx-auto mb-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {channels.map((ch, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-border bg-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{
                "--ch-accent": ch.accent,
              } as React.CSSProperties}
            >
              {/* Accent glow on hover */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${ch.accent}18 0%, transparent 70%)`,
                  borderColor: `${ch.accent}30`,
                }}
              />
              <div
                className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-background transition-transform duration-300 group-hover:scale-110"
              >
                <ch.icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{ch.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ch.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
          className="flex flex-wrap justify-center gap-6 md:gap-10"
        >
          {trustSignals.map((signal, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium">{signal}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
