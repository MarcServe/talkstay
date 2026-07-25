import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Stethoscope,
  Landmark,
  HeartHandshake,
  Users,
  Accessibility,
  ArrowRight,
} from "lucide-react";

export type Sector = {
  slug: string;
  name: string;
  icon: typeof GraduationCap;
  outcome: string;
  problems: string[];
  accent: string;
};

export const SECTORS: Sector[] = [
  {
    slug: "universities",
    name: "Universities",
    icon: GraduationCap,
    outcome: "Students find answers instantly — without searching pages and PDFs.",
    problems: [
      "Students can't find course, fees, or admissions info on cluttered sites",
      "International applicants need 24/7 support across time zones",
      "Staff buried under repeat enquiries that an assistant can answer",
    ],
    accent: "#7c3aed",
  },
  {
    slug: "nhs",
    name: "NHS & Healthcare",
    icon: Stethoscope,
    outcome: "Patients access information without waiting on hold.",
    problems: [
      "Long phone queues for routine questions",
      "Patients struggle to navigate service pages and PDFs",
      "Accessibility gaps for older or disabled patients",
    ],
    accent: "#06b6d4",
  },
  {
    slug: "councils",
    name: "Councils",
    icon: Landmark,
    outcome: "Citizens find services through conversation, not navigation.",
    problems: [
      "Residents can't locate the right service or form",
      "High call-centre volume for repeat questions",
      "Accessibility and inclusion obligations under the Equality Act",
    ],
    accent: "#0ea5e9",
  },
  {
    slug: "housing-charities",
    name: "Housing & Charities",
    icon: HeartHandshake,
    outcome: "Beneficiaries find the support they need, faster.",
    problems: [
      "Vulnerable users can't navigate complex sites or forms",
      "Limited staff time for repetitive enquiries",
      "Out-of-hours support is hard to staff",
    ],
    accent: "#ec4899",
  },
  {
    slug: "hr",
    name: "HR & Professional Services",
    icon: Users,
    outcome: "Employees get answers without emailing HR.",
    problems: [
      "Policy questions buried in PDFs and intranets",
      "HR team overwhelmed by repeat queries",
      "Onboarding documentation rarely read in full",
    ],
    accent: "#f59e0b",
  },
  {
    slug: "accessibility",
    name: "Accessibility-First Organisations",
    icon: Accessibility,
    outcome: "Built for dyslexia, autism, low-vision, and motor accessibility — WCAG-aligned.",
    problems: [
      "Users with dyslexia or low-vision struggle with text-heavy sites",
      "Neurodivergent users benefit from conversational interfaces",
      "Compliance with the Equality Act and WCAG 2.2",
    ],
    accent: "#10b981",
  },
];

export const SectorsGrid = ({ heading = "Who we deploy for", showHeader = true }: { heading?: string; showHeader?: boolean }) => (
  <section className="border-t border-border bg-background py-16 md:py-24" aria-label="Organisations we deploy for">
    <div className="container mx-auto px-4">
      {showHeader && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            Built for organisations
          </p>
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">{heading}</h2>
          <p className="text-muted-foreground">
            We deploy AI assistants for organisations that care about access, inclusion, and outcomes.
          </p>
        </div>
      )}
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
        {SECTORS.map((s, i) => (
          <motion.div
            key={s.slug}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              to={`/sectors/${s.slug}`}
              className="group relative block h-full overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className="absolute left-0 right-0 top-0 h-[3px]"
                style={{ background: `linear-gradient(90deg, ${s.accent}, ${s.accent}40)` }}
              />
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-background"
              >
                <s.icon className="h-5 w-5" style={{ color: s.accent }} aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">{s.name}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.outcome}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Explore <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
