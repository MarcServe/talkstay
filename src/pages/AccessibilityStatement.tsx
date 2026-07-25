import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import { SUPPORT_EMAIL, SUPPORT_PHONE, MAILTO_SUPPORT, TEL_SUPPORT } from "@/config/contact";
import { CheckCircle, AlertTriangle, XCircle, Eye, Hand, Brain, Shield, Volume2, Globe, MessageSquare, Users, Phone, QrCode, HeadphonesIcon } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
const wcagMappingImg = "/images/wcag-mapping.webp";
const comparisonImg = "/images/accessibility-comparison.webp";

const WcagMappingTable = () => {
  const principles = [
    {
      name: "Perceivable",
      color: "bg-blue-100 text-blue-800 border-blue-300",
      icon: <Eye className="w-5 h-5" />,
      items: [
        "Reads content aloud for low-vision & dyslexic users",
        "Explains page structure in simple speech",
        "Helps users bypass low-contrast or text-heavy areas through voice",
      ],
    },
    {
      name: "Operable",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: <Hand className="w-5 h-5" />,
      items: [
        "Full voice navigation (no scrolling, clicking, or complex gestures)",
        "Hands-free browsing for motor-impaired users",
        "Instant page summaries to skip repetitive menus",
        "A third navigation method WCAG encourages",
      ],
    },
    {
      name: "Understandable",
      color: "bg-green-100 text-green-800 border-green-300",
      icon: <Brain className="w-5 h-5" />,
      items: [
        "Simplifies long, complex content into natural conversation",
        "Guides users through forms and errors",
        "Reduces cognitive load for neurodivergent and elderly users",
      ],
    },
    {
      name: "Robust",
      color: "bg-purple-100 text-purple-800 border-purple-300",
      icon: <Shield className="w-5 h-5" />,
      items: [
        "Interprets buttons, links, forms & alerts using speech",
        "Reads status messages users might otherwise miss",
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {principles.map((p) => (
        <div key={p.name} className={`rounded-xl border-2 p-5 ${p.color}`}>
          <div className="flex items-center gap-2 mb-4 font-bold text-lg">
            {p.icon}
            {p.name}
          </div>
          <ul className="space-y-2 text-sm">
            {p.items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const ComparisonTable = () => {
  const rows = [
    { capability: "WCAG 2.1 AA support", chatbot: { icon: "check", text: "Yes" }, screenReader: { icon: "check", text: "Yes" }, talkweb: { icon: "check", text: "Yes" } },
    { capability: "Requires reading", chatbot: { icon: "warn", text: "Yes" }, screenReader: { icon: "warn", text: "Yes (reads aloud)" }, talkweb: { icon: "no", text: "No" } },
    { capability: "Requires typing", chatbot: { icon: "warn", text: "Yes" }, screenReader: { icon: "warn", text: "Often" }, talkweb: { icon: "no", text: "No" } },
    { capability: "Supports dyslexia", chatbot: { icon: "warn", text: "Limited" }, screenReader: { icon: "warn", text: "Mixed adoption" }, talkweb: { icon: "check", text: "Strong" } },
    { capability: "Supports cognitive impairment", chatbot: { icon: "no", text: "Weak" }, screenReader: { icon: "no", text: "Weak" }, talkweb: { icon: "check", text: "Designed for" } },
    { capability: "Low digital literacy friendly", chatbot: { icon: "no", text: "No" }, screenReader: { icon: "no", text: "No" }, talkweb: { icon: "check", text: "Yes" } },
    { capability: "Conversational guidance", chatbot: { icon: "warn", text: "Limited" }, screenReader: { icon: "warn", text: "No" }, talkweb: { icon: "check", text: "Yes" } },
    { capability: "Task-completion focused", chatbot: { icon: "warn", text: "Partial" }, screenReader: { icon: "no", text: "No" }, talkweb: { icon: "check", text: "Yes" } },
    { capability: "Used by non-assistive-tech users", chatbot: { icon: "check", text: "Yes" }, screenReader: { icon: "no", text: "No" }, talkweb: { icon: "check", text: "Yes" } },
    { capability: "Reduces call dependency", chatbot: { icon: "warn", text: "Yes" }, screenReader: { icon: "no", text: "No" }, talkweb: { icon: "check", text: "Yes" } },
    { capability: "Works alongside existing site", chatbot: { icon: "check", text: "Yes" }, screenReader: { icon: "check", text: "Yes" }, talkweb: { icon: "check", text: "Yes" } },
  ];

  const StatusIcon = ({ type }: { type: string }) => {
    if (type === "check") return <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />;
    if (type === "warn") return <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />;
    return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
            <th className="text-left p-4 font-semibold rounded-tl-lg">Capabilities / User need</th>
            <th className="text-center p-4 font-semibold">💬 Text Chatbot</th>
            <th className="text-center p-4 font-semibold">🔊 Screen Readers</th>
            <th className="text-center p-4 font-semibold rounded-tr-lg bg-primary/20">🎙️ TalkWeb Voice Access</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-background"}>
              <td className="p-4 font-medium text-foreground">{row.capability}</td>
              <td className="p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <StatusIcon type={row.chatbot.icon} />
                  <span className="text-muted-foreground">{row.chatbot.text}</span>
                </div>
              </td>
              <td className="p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <StatusIcon type={row.screenReader.icon} />
                  <span className="text-muted-foreground">{row.screenReader.text}</span>
                </div>
              </td>
              <td className="p-4 text-center bg-primary/5">
                <div className="flex items-center justify-center gap-2">
                  <StatusIcon type={row.talkweb.icon} />
                  <span className="font-semibold text-foreground">{row.talkweb.text}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /> Advantages</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-yellow-500" /> Limited support</span>
        <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-500" /> Disadvantages</span>
      </div>
    </div>
  );
};

export const AccessibilityStatement = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Header />

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Accessibility & Inclusion at TalkWeb
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Accessibility is not just about access — it's about <strong className="text-foreground">understanding</strong>
          </p>
        </div>
      </section>

      <div className="container max-w-5xl mx-auto px-4 pb-20 space-y-16">

        {/* The Gap */}
        <Card className="p-8 md:p-10">
          <div className="space-y-4 text-muted-foreground">
            <p className="text-lg leading-relaxed">
              TalkWeb is designed to remove one of the biggest accessibility gaps on the web today:
            </p>
            <blockquote className="border-l-4 border-primary pl-6 py-3 text-lg font-medium text-foreground italic">
              People can technically access websites, but still cannot understand or use them independently.
            </blockquote>
            <p>
              Most accessibility solutions focus on <strong className="text-foreground">how content is presented</strong>.
              TalkWeb focuses on <strong className="text-foreground">whether the content is actually understood</strong>.
            </p>
            <p>That distinction matters — legally, operationally, and ethically.</p>
          </div>
        </Card>

        {/* What TalkWeb Is */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold">What TalkWeb Is</h2>
          <p className="text-muted-foreground text-lg">
            TalkWeb is a <strong className="text-foreground">voice-first accessibility and inclusion layer</strong> that sits alongside an existing website and allows people to:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <MessageSquare className="w-5 h-5" />, text: "Ask questions in plain language" },
              { icon: <Volume2 className="w-5 h-5" />, text: "Receive spoken, simplified explanations" },
              { icon: <Hand className="w-5 h-5" />, text: "Navigate services without reading long pages" },
              { icon: <Users className="w-5 h-5" />, text: "Get guidance tailored to their situation" },
              { icon: <Globe className="w-5 h-5" />, text: "Access information in multiple languages" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <span className="text-primary mt-0.5">{item.icon}</span>
                <span className="text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
          <Card className="p-6 bg-primary/5 border-primary/20">
            <p className="text-foreground font-medium">
              All responses are grounded in the organisation's own approved website content.
            </p>
            <p className="text-muted-foreground mt-2">No hallucinations. No external opinions. No guessing.</p>
          </Card>
        </section>

        {/* Who TalkWeb Supports */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Who TalkWeb Supports</h2>
          <p className="text-muted-foreground text-lg">
            TalkWeb is particularly effective for people who:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Have dyslexia or reading difficulties",
              "Have cognitive impairments or memory challenges",
              "Experience anxiety, fatigue, or information overload",
              "Are non-native English speakers",
              "Have low digital confidence",
              "Struggle with complex forms, processes, or service language",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground italic">
            These users are often invisible in traditional accessibility audits — yet they generate the highest call volumes and service demand.
          </p>
        </section>

        {/* How It Works */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold">How TalkWeb Works as an Accessibility Layer</h2>
          <Card className="p-6 bg-muted/30">
            <p className="text-lg font-medium text-foreground">
              TalkWeb does not replace existing accessibility features. <strong>It extends them.</strong>
            </p>
          </Card>

          {[
            {
              num: "1",
              title: "Voice-first interaction",
              desc: "Users can speak naturally instead of reading, typing, or navigating menus.",
              benefits: ["Cognitive load", "Reading fatigue", "Navigation errors", "Task abandonment"],
              label: "This reduces:",
            },
            {
              num: "2",
              title: "Plain-language explanations",
              desc: "TalkWeb explains services in clear, simple language, without removing accuracy.",
              benefits: ['"Explain this more simply"', '"What does this mean for me?"', '"What do I do next?"'],
              label: "Users can say:",
            },
            {
              num: "3",
              title: "Guided understanding, not just answers",
              desc: "Rather than dumping information, TalkWeb:",
              benefits: ["Breaks steps down", "Confirms understanding", "Offers next actions", "Routes users to the correct service or contact"],
              label: "",
            },
            {
              num: "4",
              title: "Multilingual support",
              desc: "TalkWeb can communicate in 57+ languages, helping users who may otherwise rely on family members or staff for interpretation.",
              benefits: [],
              label: "",
            },
            {
              num: "5",
              title: "Grounded, approved information only",
              desc: "All responses are generated strictly from the organisation's own website content, approved guidance pages, and defined knowledge sources.",
              benefits: [],
              label: "",
            },
          ].map((section) => (
            <Card key={section.num} className="p-6">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {section.num}
                </span>
                {section.title}
              </h3>
              <p className="text-muted-foreground mb-3">{section.desc}</p>
              {section.benefits.length > 0 && (
                <>
                  {section.label && <p className="text-sm font-medium text-foreground mb-2">{section.label}</p>}
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    {section.benefits.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </>
              )}
            </Card>
          ))}
        </section>

        <Separator />

        {/* WCAG Alignment Section */}
        <section className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">Alignment with WCAG 2.1 AA</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              TalkWeb is designed to support and strengthen WCAG 2.1 AA compliance, particularly where WCAG alone does not address real-world usability.
            </p>
          </div>

          <WcagMappingTable />

          {/* Beyond WCAG */}
          <Card className="p-6 bg-muted/30">
            <h3 className="text-lg font-bold mb-3">✨ Beyond WCAG</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <QrCode className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span><strong className="text-foreground">Scan → Speak → Sorted QR mode</strong> for low-vision & elderly users</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span><strong className="text-foreground">Voice-based bookings</strong> (Forms, WhatsApp, Calendly)</span>
              </li>
              <li className="flex items-start gap-2">
                <Globe className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span><strong className="text-foreground">Voice navigation</strong> through entire websites and documents</span>
              </li>
            </ul>
          </Card>

          {/* WCAG mapping image */}
          <div className="rounded-xl overflow-hidden shadow-lg">
            <OptimizedImage
              src={wcagMappingImg}
              alt="How TalkWeb Supports WCAG 2.1 AA — In One Clear Snapshot showing Perceivable, Operable, Understandable, and Robust principles"
              className="w-full h-auto"
            />
          </div>
        </section>

        <Separator />

        {/* WCAG Principles Detail */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold">WCAG Principles in Detail</h2>

          {[
            {
              title: "Perceivable (WCAG Principle 1)",
              focus: "Content must be perceivable to users in different ways.",
              helps: [
                "Provides spoken explanations of on-screen content",
                "Reduces reliance on visual scanning or dense text",
                "Allows users to access information without reading",
              ],
              note: "This supports users who technically can see text but cannot process it comfortably.",
            },
            {
              title: "Operable (WCAG Principle 2)",
              focus: "Users must be able to navigate and interact with content.",
              helps: [
                "Enables task completion through voice instead of menus",
                "Reduces complex navigation paths",
                "Helps users find the correct service without trial and error",
              ],
              note: 'Users are guided, not left to "figure it out".',
            },
            {
              title: "Understandable (WCAG Principle 3)",
              focus: "Information and operation must be understandable. This is where TalkWeb adds the most value.",
              helps: [
                "Translates complex service language into plain English",
                "Explains what applies to the user specifically",
                "Reduces confusion, misinterpretation, and mistakes",
              ],
              note: "This directly addresses the gap between technical compliance and independent use.",
            },
            {
              title: "Robust (WCAG Principle 4)",
              focus: "Content must work with assistive technologies.",
              helps: [
                "Works alongside screen readers and browser tools",
                "Does not interfere with existing accessibility features",
                "Adds an additional modality (voice) rather than replacing others",
              ],
              note: "TalkWeb enhances robustness by offering an alternative interaction path.",
            },
          ].map((principle, i) => (
            <Card key={i} className="p-6">
              <h3 className="text-xl font-bold mb-3">{principle.title}</h3>
              <p className="text-sm text-muted-foreground mb-3"><strong>WCAG focus:</strong> {principle.focus}</p>
              <p className="text-sm font-medium text-foreground mb-2">How TalkWeb helps:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-3">
                {principle.helps.map((h, j) => <li key={j}>{h}</li>)}
              </ul>
              <p className="text-sm italic text-muted-foreground">{principle.note}</p>
            </Card>
          ))}
        </section>

        <Separator />

        {/* Comparison Table */}
        <section className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">Accessibility Comparison: Chatbots vs Voice Access</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Text-based solutions often fail those with dyslexia, cognitive impairments, or low digital literacy.
            </p>
          </div>

          <ComparisonTable />

          <div className="rounded-xl overflow-hidden shadow-lg">
            <OptimizedImage
              src={comparisonImg}
              alt="Accessibility Comparison table showing Text Chatbot vs Screen Readers vs TalkWeb Voice Access across multiple capability dimensions"
              className="w-full h-auto"
            />
          </div>
        </section>

        <Separator />

        {/* Beyond the Website */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Accessibility Beyond the Website</h2>
          <p className="text-muted-foreground">
            Traditional accessibility tools assume users are already on the website, already reading, already confident navigating. TalkWeb recognises that accessibility is needed everywhere, not just on a page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: <Globe className="w-6 h-6" />, title: "Website Assistant", desc: "Embedded voice layer on any website" },
              { icon: <QrCode className="w-6 h-6" />, title: "QR Voice Guide", desc: "Scan-activated voice guide in physical spaces" },
              { icon: <HeadphonesIcon className="w-6 h-6" />, title: "Direct Link", desc: "Shared by staff or support teams" },
            ].map((item, i) => (
              <Card key={i} className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  {item.icon}
                </div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Risk Reduction */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Accessibility, Inclusion & Risk Reduction</h2>
          <p className="text-muted-foreground">
            When users cannot understand online information, the impact is real:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Increased phone calls and walk-ins",
              "Repeated explanations by staff",
              "Incorrect applications and forms",
              "Delays, complaints, and escalations",
              "Higher operational cost",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                <span className="text-foreground text-sm">{item}</span>
              </div>
            ))}
          </div>
          <Card className="p-6 bg-primary/5 border-primary/20 text-center">
            <p className="text-muted-foreground">TalkWeb helps organisations move from:</p>
            <p className="text-lg mt-2">
              <span className="text-muted-foreground line-through">"We published the information"</span>
              <span className="mx-3">→</span>
              <strong className="text-foreground">"People can actually use it."</strong>
            </p>
          </Card>
        </section>

        {/* Responsible AI */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Our Approach to Responsible AI</h2>
          <p className="text-muted-foreground">TalkWeb is designed with trust and safety in mind:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "No speculative answers",
              "No legal or medical advice",
              "No hallucinated content",
              "Transparent grounding in approved sources",
              "Clear escalation to human support where appropriate",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Shield className="w-5 h-5 text-primary shrink-0" />
                <span className="text-foreground text-sm">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground italic text-center">
            The goal is clarity, not automation for its own sake.
          </p>
        </section>

        <Separator />

        {/* Summary */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-center">In Summary</h2>
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/10 text-center space-y-4">
            <p className="text-lg text-foreground font-medium">
              TalkWeb does not replace WCAG compliance.<br />
              <strong className="text-primary">It completes the accessibility journey.</strong>
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              {["Text accessibility", "Voice interaction", "Plain-language understanding", "Grounded, approved content"].map((item, i) => (
                <span key={i} className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm">
                  {item}
                </span>
              ))}
            </div>
            <p className="text-muted-foreground mt-4">
              TalkWeb helps organisations deliver accessibility that works <strong className="text-foreground">in practice</strong>, not just on paper.
            </p>
          </Card>
        </section>

        {/* Contact */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-4">Feedback & Contact</h2>
          <p className="text-muted-foreground mb-4">
            We welcome feedback on the accessibility of TalkWeb. If you encounter any accessibility barriers, please contact us:
          </p>
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p><strong>Email:</strong> <a href={MAILTO_SUPPORT} className="hover:text-primary transition-colors">{SUPPORT_EMAIL}</a></p>
            <p><strong>Phone:</strong> <a href={TEL_SUPPORT} className="hover:text-primary transition-colors">{SUPPORT_PHONE}</a></p>
            <p><strong>Response Time:</strong> We will respond within 12 hours.</p>
          </div>
        </Card>

      </div>
    </div>
  );
};
