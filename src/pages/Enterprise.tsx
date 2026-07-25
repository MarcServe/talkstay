import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, ArrowRight, Building, Landmark, Globe } from "lucide-react";
import { SUPPORT_PHONE, TEL_SUPPORT, MAILTO_SALES, SALES_EMAIL } from "@/config/contact";

const tiers = [
  {
    name: "Foundation",
    tagline: "Single department rollout, up to 250 staff",
    icon: Building,
    label: "from £5,000",
    features: [
      "Full Enterprise account configured",
      "Custom AI trained on your documents",
      "Integration with 1 existing system",
      "Staff training (up to 20 people)",
      "3-month hypercare support",
    ],
  },
  {
    name: "Professional",
    tagline: "Multi-department, up to 1,000 staff",
    icon: Landmark,
    label: "from £10,000",
    popular: true,
    features: [
      "Everything in Foundation",
      "Up to 5 departments",
      "Up to 3 system integrations",
      "Custom branded voice",
      "Dedicated account manager (12 months)",
      "Compliance documentation",
      "99.9% uptime SLA",
    ],
  },
  {
    name: "Enterprise",
    tagline: "Unlimited scale, custom requirements",
    icon: Globe,
    label: "from £20,000",
    features: [
      "Everything in Professional",
      "Unlimited departments & locations",
      "White-label — your brand, no TalkWeb mention",
      "Custom API development",
      "Full data sovereignty / on-premise option",
      "Executive steering committee access",
      "Quarterly business reviews",
      "Dedicated technical lead (12 months)",
    ],
  },
];

const EnterprisePage = () => {
  const handleContact = () => {
    window.location.href = MAILTO_SALES;
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            {/* Hero */}
            <div className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Enterprise-Grade{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Voice Layer
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Deploy TalkWeb across your organisation with custom integrations, compliance, and dedicated support — so everyone can just ask.
              </p>
            </div>

            {/* Tier Cards */}
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
              {tiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={`relative flex flex-col h-full ${tier.popular ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-border'}`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold rounded-full">
                        Recommended
                      </span>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <tier.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <CardDescription>{tier.tagline}</CardDescription>
                    <p className="text-2xl font-bold pt-3">{tier.label}</p>
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
                      onClick={handleContact}
                      className="w-full"
                      variant={tier.popular ? "default" : "outline"}
                      size="lg"
                    >
                      Contact Our Enterprise Team
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                Prefer to talk? Call us on{" "}
                <a href={TEL_SUPPORT} className="text-primary font-medium hover:underline">
                  {SUPPORT_PHONE}
                </a>
              </p>
              <p className="text-muted-foreground text-sm">
                or email{" "}
                <a href={MAILTO_SALES} className="text-primary font-medium hover:underline">
                  {SALES_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default EnterprisePage;
