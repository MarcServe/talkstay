import { Button } from "@/components/ui/button";
import { MessageSquare, FormInput, Globe, QrCode, FileText, HeadphonesIcon, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/ui/optimized-image";

const qrOfficeImg = "/images/talkweb-qr-office.webp";
const toolsImg = "/images/talkweb-tools-explanations.webp";
const usecaseTransport = "/images/usecase-transport.webp";
const usecaseUniversity = "/images/usecase-university.webp";
const usecaseHousing = "/images/usecase-housing.webp";
const usecaseCouncil = "/images/usecase-council-accessibility.webp";
const usecaseLibrary = "/images/usecase-library.webp";
const usecaseCommunity = "/images/usecase-community.webp";

const deploymentOptions = [
  { icon: Globe, title: "Website Widget", desc: "Embedded as a conversational layer on any website." },
  { icon: HeadphonesIcon, title: "Full VoiceWeb Link", desc: "A standalone voice page you can share anywhere." },
  { icon: QrCode, title: "QR Code in Physical Spaces", desc: "Waiting rooms, reception areas, printed documents, clinics, offices." },
  { icon: FileText, title: "Document Companion", desc: "Interactive explanations for PDFs, policies, and complex documents." },
];

const userCapabilities = [
  "Speak instead of read",
  "Ask questions in plain language",
  "Receive clear, step-by-step guidance",
  "Complete tasks independently",
  "Book services hands-free",
  "Navigate pages using voice",
  "Access support both online and offline",
];

export const UseCaseShowcase = () => {
  return (
    <section className="py-20 bg-background" aria-label="What TalkWeb Is">
      <div className="container mx-auto px-4">
        {/* What TalkWeb Is - Hero */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">What TalkWeb Is</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            A conversational assistant layer that enhances your <span className="ai-gradient-text">digital services</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Across your website, documents, and physical environments — TalkWeb ensures your information is not just accessible, but understandable.
          </p>
        </div>

        {/* Deployment Options */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-20">
          {deploymentOptions.map((opt, i) => (
            <div key={i} className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <opt.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">{opt.title}</h3>
              <p className="text-sm text-muted-foreground">{opt.desc}</p>
            </div>
          ))}
        </div>

        {/* What Users Can Do */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto mb-20">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
              It allows users to:
            </h3>
            <div className="space-y-3">
              {userCapabilities.map((cap, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-foreground text-lg">{cap}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl overflow-hidden shadow-md">
            <OptimizedImage
              src={toolsImg}
              alt="TalkWeb tools and capabilities explained visually"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        {/* Key principles */}
        <div className="bg-secondary/50 rounded-2xl p-10 max-w-4xl mx-auto mb-20">
          <div className="text-center space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              TalkWeb does not replace your website. <span className="ai-gradient-text">It activates it.</span>
            </h3>
            <div className="grid sm:grid-cols-3 gap-6 text-center mt-8">
              <div className="p-4">
                <p className="font-semibold text-foreground mb-1">Uses approved content</p>
                <p className="text-sm text-muted-foreground">Grounded in your authorised information only.</p>
              </div>
              <div className="p-4">
                <p className="font-semibold text-foreground mb-1">No hallucinations</p>
                <p className="text-sm text-muted-foreground">Does not invent policies or make things up.</p>
              </div>
              <div className="p-4">
                <p className="font-semibold text-foreground mb-1">Works everywhere</p>
                <p className="text-sm text-muted-foreground">Website, QR code, VoiceWeb link, or phone.</p>
              </div>
            </div>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
              Whether someone is on your website, scanning a QR code in a waiting room, or accessing a VoiceWeb link on their phone — TalkWeb ensures your information is understandable.
            </p>
          </div>
        </div>

        {/* QR Code in Physical Spaces */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto mb-20">
          <div className="rounded-xl overflow-hidden shadow-md order-2 md:order-1">
            <OptimizedImage
              src={qrOfficeImg}
              alt="TalkWeb QR code deployed in a physical office environment"
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="order-1 md:order-2">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Accessibility everywhere — not just online
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              Deploy TalkWeb via QR codes in waiting rooms, reception areas, NHS clinics, council buildings, and printed documents. A user scans, TalkWeb opens, and they ask questions.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              This provides accessibility in the real world — bridging the gap between digital services and physical spaces.
            </p>
          </div>
        </div>

        {/* Real-World Deployment Gallery */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Deployed Everywhere</p>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">TalkWeb in the real world</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From transport hubs to universities, libraries to housing offices — TalkWeb brings voice-first accessibility to physical spaces via QR codes.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { img: usecaseTransport, label: "Transport for London", desc: "Bus station voice support via QR code" },
              { img: usecaseUniversity, label: "UWE Bristol", desc: "Campus voice assistant for students & staff" },
              { img: usecaseHousing, label: "Housing Office", desc: "Voice support for tenants and staff" },
              { img: usecaseCouncil, label: "Council Services", desc: "Inclusive access with voice-first interaction" },
              { img: usecaseLibrary, label: "Public Library", desc: "Voice access to council services in libraries" },
              { img: usecaseCommunity, label: "Community Centre", desc: "No long pages, no stress — just ask" },
            ].map((item, i) => (
              <div key={i} className="group rounded-xl overflow-hidden border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                <div className="aspect-[4/3] overflow-hidden">
                  <OptimizedImage
                    src={item.img}
                    alt={`TalkWeb deployed at ${item.label}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-foreground">{item.label}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Use Cases - Text-based */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {[
              { icon: "🏥", label: "NHS & Healthcare", desc: "Patients ask about appointments, prescriptions, and medical guidance hands-free — reducing calls to reception." },
              { icon: "⚖️", label: "Legal & Advice Services", desc: "Citizens access legal aid information and rights guidance through natural voice conversation." },
              { icon: "🏛️", label: "Government Departments", desc: "Residents navigate benefits, permits, and public services without reading complex documents." },
              { icon: "🛡️", label: "Insurance", desc: "Customers ask about coverage, claims, and policy terms through voice instead of reading complex legal language." },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h4 className="font-semibold text-foreground mb-2">{item.label}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Product Cards */}
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Two powerful products</h3>
            <p className="text-muted-foreground text-lg">Voice assistants for websites, and voice-powered forms for data collection.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Website Assistant Card */}
            <div className="p-8 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <MessageSquare className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Website Assistant</h3>
              <p className="text-muted-foreground mb-6">
                AI-powered voice assistant that answers questions, guides visitors, and handles inquiries on your website 24/7.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Instant answers from your website content
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Natural voice conversations with visitors
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Seamless booking and inquiry handling
                </li>
              </ul>
              <Button asChild className="w-full" size="lg">
                <a href="#create-assistant">Try Website Assistant</a>
              </Button>
            </div>

            {/* Voice Forms Card */}
            <div className="p-8 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <FormInput className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Voice Forms</h3>
              <p className="text-muted-foreground mb-6">
                Interactive voice-powered forms that collect information through natural conversation instead of typing.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Conversational data collection
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Higher completion rates than traditional forms
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  Perfect for surveys, registrations, and more
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link to="/dashboard">Explore Voice Forms</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
