import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Calendar, ArrowRight, CheckCircle2, Check, Sparkles, Briefcase, Building2, Users } from "lucide-react";
import { WhatsAppIcon, GmailIcon, PhoneCallIcon, WebWidgetIcon, VoiceAIIcon, EmailForwardIcon, BioLinkIcon } from "@/components/ui/brand-icons";
import { SUPPORT_PHONE, TEL_SUPPORT, MAILTO_SALES, SALES_EMAIL } from "@/config/contact";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

const channels = [
  { icon: WebWidgetIcon, label: "Website Widget" },
  { icon: VoiceAIIcon, label: "Voice AI" },
  { icon: WhatsAppIcon, label: "WhatsApp" },
  { icon: PhoneCallIcon, label: "Phone" },
  { icon: EmailForwardIcon, label: "Email Forwarding" },
  { icon: BioLinkIcon, label: "Bio Link" },
];

// ─── Shared Launch Packages (used by Pricing + Business pages) ───
export const LAUNCH_PACKAGES = [
  {
    name: "Starter Launch",
    price: "£995",
    priceNote: "one-time setup",
    tagline: "Get launched fast with a fully configured assistant",
    icon: Briefcase,
    features: [
      "Website audit",
      "AI assistant setup",
      "Knowledge base training",
      "Voice configuration",
      "Deployment support",
      "30 days support",
    ],
    cta: "Book a Demo" as const,
    action: "demo" as const,
  },
  {
    name: "Business Launch",
    price: "£2,495",
    priceNote: "one-time setup",
    tagline: "Everything in Starter, plus integrations and training",
    icon: Building2,
    popular: true,
    features: [
      "Everything in Starter Launch",
      "Multi-page knowledge ingestion",
      "Advanced prompts",
      "Analytics setup",
      "Booking integrations",
      "Staff training",
    ],
    cta: "Book a Demo" as const,
    action: "demo" as const,
  },
  {
    name: "Enterprise",
    price: "From £5,000",
    priceNote: "custom implementation",
    tagline: "Internal knowledge assistants across multiple departments",
    icon: Users,
    features: [
      "Internal knowledge assistant",
      "Multiple departments",
      "HR / Policy assistant",
      "PDF ingestion",
      "Advanced integrations",
      "Custom implementation",
    ],
    cta: "Contact Sales" as const,
    action: "sales" as const,
  },
];

export const openBookDemo = () => {
  window.open("https://calendar.app.google/cbkE71koNXVDvW2V8", "_blank");
};

export const LaunchPackagesGrid = () => {
  const handle = (action: "demo" | "sales") => {
    if (action === "demo") openBookDemo();
    else window.location.href = MAILTO_SALES;
  };
  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {LAUNCH_PACKAGES.map((tier) => (
        <Card
          key={tier.name}
          className={`relative flex flex-col h-full ${tier.popular ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-border'}`}
        >
          {tier.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold">
                Recommended
              </Badge>
            </div>
          )}
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <tier.icon className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">{tier.name}</CardTitle>
            <CardDescription>{tier.tagline}</CardDescription>
            <p className="text-2xl font-bold pt-3">{tier.price}</p>
            <p className="text-xs text-muted-foreground">{tier.priceNote}</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ul className="space-y-3 flex-1 mb-6">
              {tier.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handle(tier.action)}
              className="w-full"
              variant={tier.popular ? "default" : "outline"}
              size="lg"
            >
              {tier.cta}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

interface PlanCardProps {
  name: string;
  price: string;
  yearlyPrice?: string;
  period: string;
  description: string;
  forExamples?: string[];
  features: string[];
  interactions: string;
  cta: string;
  popular?: boolean;
  onAction: () => void;
  isYearly: boolean;
}

const PlanCard = ({ name, price, yearlyPrice, period, description, forExamples, features, interactions, cta, popular, onAction, isYearly }: PlanCardProps) => (
  <Card className={`relative flex flex-col h-full ${popular ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-border'}`}>
    {popular && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold">
          Most Popular
        </Badge>
      </div>
    )}
    <CardHeader className="pb-4">
      <CardTitle className="text-xl">{name}</CardTitle>
      <CardDescription>{description}</CardDescription>
      {forExamples && forExamples.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {forExamples.map((example, idx) => (
            <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {example}
            </span>
          ))}
        </div>
      )}
      <div className="pt-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{isYearly && yearlyPrice ? yearlyPrice : price}</span>
          {period && <span className="text-muted-foreground">/{isYearly ? 'year' : 'month'}</span>}
        </div>
        {isYearly && yearlyPrice && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {name === 'Link' && '£15/mo billed annually'}
            {name === 'Core' && '£49/mo billed annually'}
            {name === 'Pro' && '£99/mo billed annually'}
            {name === 'Enterprise' && '£249/mo billed annually'}
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-medium text-foreground">{interactions}</span> interactions/month
        </p>
      </div>
    </CardHeader>
    <CardContent className="flex-1 flex flex-col">
      <ul className="space-y-3 flex-1 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={onAction}
        className="w-full"
        variant={popular ? "default" : "outline"}
        size="lg"
      >
        {cta}
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </CardContent>
  </Card>
);

export const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);
  const navigate = useNavigate();
  const { createCheckout } = useSubscription();
  const { user } = useAuth();

  const handleStartTrial = () => {
    navigate("/create-assistant");
  };

  const handleLinkCheckout = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const amount = isYearly ? 18000 : 1900;
      const interval = isYearly ? 'year' : 'month';
      await createCheckout('social', { amount, name: 'TalkWeb Link', description: 'AI voice bio link for creators', interval }, 'gbp', interval);
    } catch (e) {
      console.error('Checkout error:', e);
    }
  };

  const handleCoreCheckout = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const amount = isYearly ? 58800 : 5900;
      const interval = isYearly ? 'year' : 'month';
      await createCheckout('small_business', { amount, name: 'TalkWeb Core', description: 'Website widget, WhatsApp & full features', interval }, 'gbp', interval);
    } catch (e) {
      console.error('Checkout error:', e);
    }
  };

  const handleProCheckout = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const amount = isYearly ? 118800 : 12900;
      const interval = isYearly ? 'year' : 'month';
      await createCheckout('large_business', { amount, name: 'TalkWeb Pro', description: 'Scale across multiple sites with API access', interval }, 'gbp', interval);
    } catch (e) {
      console.error('Checkout error:', e);
    }
  };

  const handleContactSales = () => {
    window.location.href = MAILTO_SALES;
  };

  return (
    <section id="pricing" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-12 md:mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10">
            Implementation-led · Outcome-first
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            We deploy AI assistants{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              for your organisation.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Instant Access to Information — so your people find answers instantly, without searching PDFs, waiting on hold, or emailing support. Self-serve plans available below.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {["Universities", "NHS", "Councils", "Housing & Charities", "HR", "Accessibility-first orgs"].map((s) => (
              <span key={s} className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* ─── TALKWEB LAUNCH PACKAGES ─── */}
        <div className="mb-20 md:mb-28">
          <div className="text-center mb-10">
            <Badge className="mb-3 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10">
              Done For You
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              TalkWeb Launch Packages
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our team configures, trains, and deploys TalkWeb for your business — so you can launch in days, not weeks.
            </p>
          </div>
          <LaunchPackagesGrid />
        </div>

        {/* ─── DIVIDER ─── */}
        <div className="relative mb-12 md:mb-16">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Or
            </span>
          </div>
        </div>

        {/* ─── PREFER SELF-SERVICE? ─── */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Prefer Self-Service?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Set it up yourself in minutes — pay monthly or yearly. Cancel anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isYearly ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            {isYearly && (
              <Badge variant="secondary" className="text-xs">Save up to 23%</Badge>
            )}
          </div>
        </div>

        {/* Free Trial Banner */}
        <div className="mb-10 text-center">
          <Card className="inline-flex items-center gap-3 px-6 py-3 border-primary/20 bg-primary/5">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              7-day free trial · 25 interactions · No credit card required
            </span>
            <Button size="sm" variant="outline" onClick={handleStartTrial}>
              Start Free Trial
            </Button>
          </Card>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16 md:mb-24">
          <PlanCard
            name="Link"
            price="£19"
            yearlyPrice="£180"
            period="month"
            description="AI voice bio link page for creators and freelancers"
            forExamples={["Freelancers", "Personal trainers", "Tutors", "Content creators", "Musicians", "Photographers", "Coaches", "DJs", "Therapists", "& more"]}
            interactions="200"
            features={[
              "AI voice bio link page",
              "Custom voice profile",
              "Booking & scheduling links",
              "Conversation forwarding (email + WhatsApp)",
              "3 knowledge sources",
              "1 assistant",
            ]}
            cta="Get Started"
            onAction={handleLinkCheckout}
            isYearly={isYearly}
          />
          <PlanCard
            name="Core"
            price="£59"
            yearlyPrice="£588"
            period="month"
            description="Website widget, WhatsApp, booking & call forwarding"
            forExamples={["Restaurants", "Salons", "Dental practices", "Estate agents", "Local shops", "Accountants", "Gyms", "Law firms", "Florists", "Cafés", "& more"]}
            interactions="2,000"
            features={[
              "Everything in Link",
              "Website chat widget",
              "WhatsApp integration",
              "Call forwarding",
              "Advanced analytics",
              "Voice forms",
              "Up to 3 assistants",
              "15 knowledge sources",
              "Priority support",
            ]}
            cta="Install TalkWeb"
            onAction={handleCoreCheckout}
            isYearly={isYearly}
            popular
          />
          <PlanCard
            name="Pro"
            price="£129"
            yearlyPrice="£1,188"
            period="month"
            description="Scale across multiple sites with API access"
            forExamples={["Clinics", "Insurance firms", "Agencies", "E-commerce sites", "High-traffic websites", "Hotel chains", "Car dealerships", "Recruitment firms", "& more"]}
            interactions="15,000"
            features={[
              "Everything in Core",
              "Unlimited assistants",
              "50 knowledge sources",
              "Embed on multiple websites",
              "Lead capture voice forms",
              "API access",
              "Advanced analytics & exports",
              "Priority email support",
            ]}
            cta="Get Started"
            onAction={handleProCheckout}
            isYearly={isYearly}
          />
          <PlanCard
            name="Enterprise"
            price="Custom"
            period=""
            description="Bespoke solution with dedicated support & SLA"
            forExamples={["Banks", "NHS trusts", "Government departments", "Universities", "Large SaaS platforms", "Housing associations", "Telecoms", "Retail chains", "& more"]}
            interactions="Unlimited"
            features={[
              "Everything in Pro",
              "Unlimited interactions",
              "Full API access",
              "Document AI ingestion",
              "Compliance & SLA",
              "Dedicated account manager",
              "Custom onboarding",
            ]}
            cta="Contact Sales"
            onAction={handleContactSales}
            isYearly={isYearly}
          />
        </div>

        {/* Note under SaaS */}
        <div className="mb-16 md:mb-20 text-center">
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Most organisations start with a <strong className="text-foreground">Launch Package</strong> above. Self-serve SaaS is best for solo creators, freelancers, and small teams who want to set things up themselves.
          </p>
        </div>

        {/* TalkWeb Works Everywhere */}
        <div className="mb-16 md:mb-24 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            TalkWeb Works Everywhere
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
            Reach your customers on every channel they use. All plans include conversation forwarding to your email and WhatsApp.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 max-w-4xl mx-auto">
            {channels.map((ch, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors">
                <ch.icon className="w-7 h-7" />
                <span className="text-sm font-medium">{ch.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Signals */}
        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-sm">7-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-sm">Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-sm">UK-based support team</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-sm">WCAG compliant</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
