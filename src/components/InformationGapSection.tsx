import { Shield, Scale, Gavel, Phone, Users, TrendingDown } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";

const insuranceFlowImg = "/images/talkweb-insurance-flow.webp";
const introducingImg = "/images/talkweb-introducing.webp";
const complianceImg = "/images/talkweb-compliance-alignment.webp";
const operationalCostImg = "/images/talkweb-operational-cost.webp";
const reliefImg = "/images/talkweb-relief.webp";
const reasonableAdjustmentsImg = "/images/talkweb-reasonable-adjustments.webp";
const compliantStuckImg = "/images/talkweb-compliant-stuck.webp";
const complianceLifeImg = "/images/talkweb-compliance-life.webp";
const reducesRiskImg = "/images/talkweb-reduces-risk.webp";


const researchStats = [
  { value: "90%", label: "of adults globally cannot fully understand financial or insurance documents", source: "OECD / World Literacy Foundation" },
  { value: "773M+", label: "adults worldwide have low literacy skills", source: "UNESCO Institute for Statistics" },
  { value: "1 in 6", label: "adults globally read below a functional level" },
  { value: "Only 12%", label: "of the global population can navigate complex policy documents" },
];

const regulatoryCards = [
  {
    icon: Scale,
    title: "FCA Consumer Duty",
    description: "Firms must ensure customers can understand products and services clearly. TalkWeb helps improve customer understanding and information accessibility.",
  },
  {
    icon: Gavel,
    title: "Consumer Rights Act 2015",
    description: "Contract terms must be written in clear, intelligible language. TalkWeb makes complex information easier to navigate, access, and interpret.",
  },
  {
    icon: Shield,
    title: "Equality Act 2010",
    description: "Organisations must make reasonable adjustments for people with disabilities — including dyslexia, cognitive impairments, autism, and visual impairments. Voice interaction provides alternative ways to access and understand information.",
  },
];

export const InformationGapSection = () => {
  return (
    <section className="py-12 md:py-28 bg-background" aria-label="The information accessibility gap">
      <div className="container mx-auto px-4">

        {/* Intro — Access + Inclusion + Reasonable Adjustments */}
        <div className="max-w-5xl mx-auto mb-16 md:mb-24">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="w-full md:w-1/2">
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden shadow-md">
                  <OptimizedImage
                    src={reliefImg}
                    alt="Council staff and public self-serving with TalkWeb voice and QR features, showing reduced calls and clearer operations"
                    className="w-full h-auto object-cover"
                  />
                </div>
                <div className="rounded-xl overflow-hidden shadow-md">
                  <OptimizedImage
                    src={reasonableAdjustmentsImg}
                    alt="How TalkWeb supports reasonable adjustments under the Equality Act through voice-first access"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 text-center md:text-left">
              <div className="border-l-4 border-primary pl-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Why TalkWeb</p>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                  Access, Inclusion <span className="ai-gradient-text">& Reasonable Adjustments</span>
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed mb-4 font-medium">
                  Every website today expects visitors to scroll, search, and read. TalkWeb offers a new way: ask, listen, act.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  When users can't self-serve, they call your team, visit physical locations, or abandon the process entirely. TalkWeb provides a voice-first layer that enables independent access for people with disabilities — including dyslexia, autism, cognitive impairments, and low digital confidence — supporting the Equality Act's requirement for reasonable adjustments while reducing operational cost and inequality of access.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* The Information Accessibility Gap */}
        <div className="max-w-5xl mx-auto mb-16 md:mb-24">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">The Research</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              The information accessibility gap{" "}
              <span className="ai-gradient-text">most organisations miss</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Technical compliance ensures websites work with assistive technology. But it doesn't guarantee users can <strong className="text-foreground">understand</strong> the content. Being WCAG compliant doesn't mean your users aren't stuck.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden shadow-md">
                <OptimizedImage
                  src={compliantStuckImg}
                  alt="Illustration showing users stuck despite websites being technically WCAG compliant"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="rounded-xl overflow-hidden shadow-md">
                <OptimizedImage
                  src={introducingImg}
                  alt="Diagram showing insurance website content flowing through TalkWeb voice layer to help users understand policies faster"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-4">
                {researchStats.map((stat, i) => (
                  <div key={i} className="p-5 rounded-xl border border-border bg-card">
                    <p className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</p>
                    <p className="text-sm text-muted-foreground leading-snug">{stat.label}</p>
                    {stat.source && (
                      <p className="text-xs text-muted-foreground/60 mt-2 italic">{stat.source}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-6 text-sm leading-relaxed">
                Across industries, critical information is written in ways that are difficult for the average person to understand. This creates a significant gap between how information is written and how people actually process it.
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Alignment */}
        <div className="max-w-5xl mx-auto mb-16 md:mb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Regulatory Alignment</p>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                From compliance statements to{" "}
                <span className="ai-gradient-text">real accessibility in practice</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Many organisations publish accessibility statements describing the steps they're taking. But true accessibility is measured by whether users can successfully access <strong className="text-foreground">and understand</strong> the information they need — not just whether the website meets technical standards.
              </p>
              <div className="space-y-4">
                {regulatoryCards.map((card, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <card.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{card.title}</h4>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden shadow-md">
                <OptimizedImage
                  src={complianceImg}
                  alt="Visual showing alignment with Consumer Rights Act, FCA Consumer Duty, and Equality Act"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="rounded-xl overflow-hidden shadow-md">
                <OptimizedImage
                  src={complianceLifeImg}
                  alt="From compliance documentation to real-life accessibility — showing the journey from policy to practice"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* The Operational Cost + Risk Reduction */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-3 order-2 md:order-1">
              <div className="rounded-xl overflow-hidden shadow-md">
                <OptimizedImage
                  src={operationalCostImg}
                  alt="Diagram showing how unclear information creates contact centre pressure and increased operational costs"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="rounded-xl overflow-hidden shadow-md">
                <OptimizedImage
                  src={reducesRiskImg}
                  alt="How TalkWeb reduces regulatory risk, complaints, and operational overhead"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Operational Impact</p>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                Accessibility becomes a{" "}
                <span className="ai-gradient-text">cost-saving & risk-reducing measure</span>
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                When customers struggle to understand information, they contact support teams to ask questions already answered on the website. This creates avoidable operational costs and increases regulatory risk through misunderstanding and complaints. This creates avoidable operational costs and increases regulatory risk through misunderstanding and complaints.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Phone, label: "High inbound call volumes" },
                  { icon: Users, label: "Contact centre pressure" },
                  { icon: TrendingDown, label: "Slower response times" },
                  { icon: Scale, label: "Increased complaints" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <item.icon className="w-4 h-4 text-destructive shrink-0" />
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-6 text-sm leading-relaxed">
                TalkWeb enables self-service conversational access to information — reducing repetitive support requests, staff explanation time, complaints caused by misunderstanding, and exposure to regulatory action.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
