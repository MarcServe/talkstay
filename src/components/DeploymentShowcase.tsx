import { Globe, QrCode, MessageCircle, Monitor, Smartphone, FileText, Mic, Send, X, Minus, Maximize2 } from "lucide-react";

const WidgetOpenMockup = () => (
  <div className="relative bg-muted rounded-xl p-4 h-[340px] overflow-hidden">
    {/* Browser chrome */}
    <div className="bg-card rounded-t-lg border border-border">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="ml-3 flex-1 bg-muted rounded-md px-3 py-1 text-[10px] text-muted-foreground truncate">
          yourwebsite.com
        </div>
      </div>
      <div className="p-3 h-[180px] bg-background relative">
        <div className="w-20 h-2 bg-muted rounded mb-2" />
        <div className="w-full h-2 bg-muted rounded mb-1.5" />
        <div className="w-3/4 h-2 bg-muted rounded mb-4" />
        <div className="w-full h-2 bg-muted rounded mb-1.5" />
        <div className="w-2/3 h-2 bg-muted rounded" />
      </div>
    </div>
    {/* Widget opened overlay */}
    <div className="absolute bottom-3 right-3 w-[200px] rounded-xl shadow-xl border border-primary/20 overflow-hidden">
      <div className="bg-primary px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-primary-foreground">Voice & Chat Assistant</span>
        <div className="flex gap-1">
          <div className="w-3.5 h-3.5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Minus className="w-2 h-2 text-primary-foreground" />
          </div>
          <div className="w-3.5 h-3.5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <X className="w-2 h-2 text-primary-foreground" />
          </div>
        </div>
      </div>
      <div className="bg-card p-3 space-y-2">
        <div className="w-10 h-10 rounded-full bg-primary/80 mx-auto flex items-center justify-center">
          <Mic className="w-5 h-5 text-primary-foreground" />
        </div>
        <p className="text-[8px] text-center text-muted-foreground">Tap to speak</p>
        <div className="bg-muted rounded-lg p-2">
          <p className="text-[8px] text-muted-foreground">💬 Hi! How can I help you today?</p>
        </div>
        <div className="flex gap-1">
          <div className="flex-1 bg-muted rounded-md px-2 py-1 text-[7px] text-muted-foreground">Type a message...</div>
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
            <Send className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const WidgetMinimizedMockup = () => (
  <div className="relative bg-muted rounded-xl p-4 h-[340px] overflow-hidden">
    {/* Browser chrome */}
    <div className="bg-card rounded-t-lg border border-border">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="ml-3 flex-1 bg-muted rounded-md px-3 py-1 text-[10px] text-muted-foreground truncate">
          yourwebsite.com
        </div>
      </div>
      <div className="p-3 h-[230px] bg-background">
        <div className="w-24 h-3 bg-muted rounded mb-3" />
        <div className="w-full h-2 bg-muted rounded mb-1.5" />
        <div className="w-3/4 h-2 bg-muted rounded mb-4" />
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="h-16 bg-muted rounded-lg" />
          <div className="h-16 bg-muted rounded-lg" />
        </div>
        <div className="w-full h-2 bg-muted rounded mb-1.5" />
        <div className="w-5/6 h-2 bg-muted rounded mb-1.5" />
        <div className="w-2/3 h-2 bg-muted rounded" />
      </div>
    </div>
    {/* Minimized floating bar */}
    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-card border border-primary/30 rounded-full px-3 py-2 shadow-lg">
      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
        <Mic className="w-3 h-3 text-primary-foreground" />
      </div>
      <span className="text-[9px] font-medium text-foreground">Listening...</span>
      <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
        <Maximize2 className="w-2.5 h-2.5 text-muted-foreground" />
      </div>
    </div>
  </div>
);

const MobileMockup = () => (
  <div className="flex justify-center h-[340px]">
    <div className="w-[160px] bg-card rounded-[20px] border-2 border-border shadow-lg overflow-hidden relative">
      {/* Phone notch */}
      <div className="w-16 h-4 bg-border rounded-b-lg mx-auto" />
      <div className="p-2 space-y-2">
        <div className="w-10 h-4 bg-muted rounded" />
        <div className="w-full h-1.5 bg-muted rounded" />
        <div className="w-3/4 h-1.5 bg-muted rounded" />
        <div className="h-10 bg-muted rounded-lg" />
        <div className="w-full h-1.5 bg-muted rounded" />
        <div className="w-2/3 h-1.5 bg-muted rounded" />
      </div>
      {/* Widget open on mobile */}
      <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-primary/30 rounded-t-xl p-2 shadow-xl">
        <div className="bg-primary rounded-lg px-2 py-1 mb-2">
          <span className="text-[7px] font-bold text-primary-foreground">Voice Assistant</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/80 mx-auto flex items-center justify-center mb-1">
          <Mic className="w-4 h-4 text-primary-foreground" />
        </div>
        <p className="text-[6px] text-center text-muted-foreground mb-1">Tap to speak</p>
        <div className="bg-muted rounded p-1.5">
          <p className="text-[6px] text-muted-foreground">Hi! How can I help?</p>
        </div>
      </div>
    </div>
  </div>
);

const QRCodeMockup = () => (
  <div className="bg-muted rounded-xl p-4 h-[340px] flex flex-col items-center justify-center">
    {/* Physical poster mockup */}
    <div className="bg-card rounded-xl border border-border p-5 shadow-md w-[200px] text-center">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
        <Mic className="w-4 h-4 text-primary" />
      </div>
      <p className="text-[10px] font-bold text-foreground mb-1">Need Help?</p>
      <p className="text-[7px] text-muted-foreground mb-3">Scan to speak with our AI assistant</p>
      {/* QR code placeholder */}
      <div className="w-24 h-24 mx-auto bg-foreground/5 border-2 border-dashed border-border rounded-lg flex items-center justify-center mb-3">
        <QrCode className="w-16 h-16 text-foreground/30" />
      </div>
      <p className="text-[7px] text-muted-foreground">Works in waiting rooms, reception desks, clinics & offices</p>
    </div>
    <div className="flex gap-2 mt-3">
      <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">🏥 NHS</span>
      <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">🏛️ Council</span>
      <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">📚 Library</span>
    </div>
  </div>
);

const WhatsAppMockup = () => (
  <div className="bg-muted rounded-xl p-4 h-[340px] flex items-center justify-center">
    <div className="w-[200px] bg-card rounded-xl border border-border overflow-hidden shadow-md">
      {/* WhatsApp-style header */}
      <div className="bg-[hsl(142,70%,40%)] px-3 py-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-white/20" />
        <div>
          <p className="text-[9px] font-bold text-white">Your Business</p>
          <p className="text-[7px] text-white/70">online</p>
        </div>
      </div>
      <div className="p-3 space-y-2 bg-[hsl(30,20%,96%)] min-h-[160px]">
        {/* Incoming */}
        <div className="bg-card rounded-lg p-2 max-w-[85%] shadow-sm">
          <p className="text-[8px] text-foreground">Hi! Click the link below to speak with our AI assistant 🎙️</p>
        </div>
        {/* Link bubble */}
        <div className="bg-card rounded-lg p-2 max-w-[85%] shadow-sm border-l-2 border-primary">
          <p className="text-[7px] text-primary font-medium">🔗 talkweb.io/preview/your-id</p>
          <p className="text-[6px] text-muted-foreground mt-0.5">Tap to open voice assistant</p>
        </div>
        {/* User reply */}
        <div className="bg-[hsl(120,40%,90%)] rounded-lg p-2 max-w-[75%] ml-auto shadow-sm">
          <p className="text-[8px] text-foreground">Thanks! Just opened it 👍</p>
        </div>
      </div>
    </div>
  </div>
);

const DocumentMockup = () => (
  <div className="bg-muted rounded-xl p-4 h-[340px] flex items-center justify-center">
    <div className="w-[200px] bg-card rounded-xl border border-border overflow-hidden shadow-md">
      {/* PDF-style header */}
      <div className="bg-accent px-3 py-2 flex items-center gap-2 border-b border-border">
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-[9px] font-medium text-foreground">Policy Document.pdf</span>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="w-full h-1.5 bg-muted rounded" />
        <div className="w-full h-1.5 bg-muted rounded" />
        <div className="w-3/4 h-1.5 bg-muted rounded" />
        <div className="w-full h-1.5 bg-muted rounded" />
        <div className="w-5/6 h-1.5 bg-muted rounded" />
        <div className="w-full h-1.5 bg-muted rounded" />
        <div className="w-1/2 h-1.5 bg-muted rounded" />
      </div>
      {/* TalkWeb overlay */}
      <div className="mx-3 mb-3 bg-primary/5 border border-primary/20 rounded-lg p-2 text-center">
        <div className="w-6 h-6 rounded-full bg-primary mx-auto flex items-center justify-center mb-1">
          <Mic className="w-3 h-3 text-primary-foreground" />
        </div>
        <p className="text-[7px] font-semibold text-foreground">Don't understand this?</p>
        <p className="text-[6px] text-muted-foreground">Tap to ask in plain language</p>
      </div>
    </div>
  </div>
);

const KioskMockup = () => (
  <div className="bg-muted rounded-xl p-4 h-[340px] flex items-center justify-center">
    {/* Kiosk frame */}
    <div className="w-[180px]">
      <div className="bg-foreground/10 rounded-t-xl p-1">
        <div className="bg-card rounded-lg overflow-hidden">
          <div className="bg-primary px-3 py-2 text-center">
            <p className="text-[9px] font-bold text-primary-foreground">Welcome</p>
            <p className="text-[7px] text-primary-foreground/70">Touch or speak to get started</p>
          </div>
          <div className="p-3 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <Mic className="w-6 h-6 text-primary" />
            </div>
            <p className="text-[8px] font-semibold text-foreground">Tap to speak</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-muted rounded p-1.5 text-center">
                <p className="text-[6px] font-medium text-foreground">📋 Services</p>
              </div>
              <div className="bg-muted rounded p-1.5 text-center">
                <p className="text-[6px] font-medium text-foreground">📅 Book</p>
              </div>
              <div className="bg-muted rounded p-1.5 text-center">
                <p className="text-[6px] font-medium text-foreground">❓ Help</p>
              </div>
              <div className="bg-muted rounded p-1.5 text-center">
                <p className="text-[6px] font-medium text-foreground">🌍 Languages</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Kiosk stand */}
      <div className="w-8 h-8 bg-foreground/10 mx-auto" />
      <div className="w-16 h-2 bg-foreground/10 mx-auto rounded-b" />
    </div>
  </div>
);

const deploymentViews = [
  {
    id: "website-open",
    icon: Globe,
    label: "Website — Widget Open",
    desc: "Full voice & chat interface overlaying your website. Visitors interact without leaving the page.",
    mockup: <WidgetOpenMockup />,
  },
  {
    id: "website-minimized",
    icon: Monitor,
    label: "Website — Minimised",
    desc: "Compact listening bar lets users continue browsing while the assistant stays active.",
    mockup: <WidgetMinimizedMockup />,
  },
  {
    id: "mobile",
    icon: Smartphone,
    label: "Mobile View",
    desc: "Fully responsive on any device. Touch-optimised with large tap targets for accessibility.",
    mockup: <MobileMockup />,
  },
  {
    id: "qr-code",
    icon: QrCode,
    label: "QR Code — Physical Spaces",
    desc: "Scan-to-speak in waiting rooms, reception areas, clinics, council buildings and printed materials.",
    mockup: <QRCodeMockup />,
  },
  {
    id: "whatsapp",
    icon: MessageCircle,
    label: "WhatsApp & Messaging",
    desc: "Share a direct voice assistant link via WhatsApp, SMS, or any messaging platform.",
    mockup: <WhatsAppMockup />,
  },
  {
    id: "documents",
    icon: FileText,
    label: "Document Companion",
    desc: "Attach to PDFs, policies and complex documents — users ask questions in plain language.",
    mockup: <DocumentMockup />,
  },
  {
    id: "kiosk",
    icon: Monitor,
    label: "Kiosk & Self-Service",
    desc: "Deploy on self-service kiosks in offices, libraries and community centres for walk-in support.",
    mockup: <KioskMockup />,
  },
];

export const DeploymentShowcase = () => {
  return (
    <section className="py-20 bg-secondary/30" aria-label="How TalkWeb looks everywhere">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            See It In Action
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            How TalkWeb looks <span className="ai-gradient-text">everywhere</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            One assistant, deployed across every channel — websites, mobile, physical spaces, documents, messaging and kiosks.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {deploymentViews.map((view) => (
            <div
              key={view.id}
              className="group rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {view.mockup}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <view.icon className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">{view.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{view.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
