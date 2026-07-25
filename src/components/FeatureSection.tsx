import { Mic, Navigation, FileText, QrCode, Globe, Calendar, MessageSquare } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Voice Web Technology",
    description: "Users say 'How do I apply?' or 'Explain this simply' and receive step-by-step guidance from your approved content. A conversational web layer — no scrolling required.",
  },
  {
    icon: Navigation,
    title: "Voice Navigation",
    description: "Navigate using voice commands: 'Go to pricing', 'Open accessibility statement', 'Book an appointment'. Essential for motor impairments, low digital literacy, and cognitive fatigue.",
  },
  {
    icon: FileText,
    title: "Voice Forms",
    description: "Instead of reading long forms, users answer questions verbally, get guided step-by-step, and submit without confusion. Reduces form abandonment, errors, and support calls.",
  },
  {
    icon: QrCode,
    title: "QR Code Accessibility",
    description: "Deploy TalkWeb via QR codes in waiting rooms, reception areas, printed documents, NHS clinics, and council buildings. Accessibility in the real world, not just online.",
  },
  {
    icon: MessageSquare,
    title: "Document Explainers",
    description: "Policies and PDFs are often inaccessible in practice. TalkWeb lets users ask 'Summarise this', 'What applies to me?', or 'What do I need to do?' — transforming documents from static to interactive.",
  },
  {
    icon: Globe,
    title: "Multilingual & Plain Language",
    description: "Translate responses, simplify complex language, and adjust tone — helping non-native English speakers, neurodiverse users, and individuals with lower literacy.",
  },
  {
    icon: Calendar,
    title: "Booking & Assisted Connection",
    description: "Book appointments, connect to contact forms, trigger calls, and route to departments — reducing inbound calls while increasing independence.",
  },
];

const deploymentOptions = [
  { title: "Embedded Widget", desc: "Embedded as a conversational assistant layer on any site." },
  { title: "Hosted Voice Link", desc: "A standalone VoiceWeb page you can share anywhere." },
  { title: "QR Code Access", desc: "Physical deployment for on-the-move accessibility." },
  { title: "Document Companion", desc: "Interactive explanation for PDFs and policies." },
  { title: "Embedded in Portals", desc: "Integrated within service dashboards and intranets." },
];

export const FeatureSection = () => {
  return (
    <section id="features" className="py-20 bg-background" aria-label="Features">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Core Features</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 text-foreground">
            One voice layer. Everything your <span className="ai-gradient-text">visitors need</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            TalkWeb layers over your existing content. Visitors ask questions and get answers from your approved content.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-secondary/50 rounded-2xl p-10 mb-20 max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-1">5min</div>
              <div className="text-sm text-muted-foreground">Setup Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime SLA</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">57+</div>
              <div className="text-sm text-muted-foreground">Languages</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">0</div>
              <div className="text-sm text-muted-foreground">Code Required</div>
            </div>
          </div>
        </div>

        {/* Deployment Options */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">How TalkWeb Deploys</h3>
            <p className="text-muted-foreground text-lg">No full rebuild required. No redesign necessary. It layers over what you already have.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deploymentOptions.map((opt, i) => (
              <div key={i} className="p-5 rounded-lg border border-border bg-card">
                <h4 className="font-semibold mb-1 text-foreground">{opt.title}</h4>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
