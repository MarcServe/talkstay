import { Header } from "@/components/Header";
import { LaunchPackagesGrid, openBookDemo } from "@/components/PricingSection";
import { SectorsGrid } from "@/components/SectorsGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SUPPORT_PHONE, TEL_SUPPORT } from "@/config/contact";
import { Check, Calendar } from "lucide-react";

const deliverables = [
  "Discovery workshop",
  "Website audit",
  "Knowledge base setup",
  "AI assistant creation",
  "Voice configuration",
  "Testing & accessibility checks",
  "Launch support",
];

const Business = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
              <Badge className="mb-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10">
                For Organisations
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                AI assistants,{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  deployed for your organisation.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Instant Access to Information. We help your people — students, patients, citizens, employees, beneficiaries — find answers instantly through conversation. No more searching PDFs, waiting on hold, or emailing support.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={openBookDemo} className="gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Book a Discovery Call
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Sectors */}
        <SectorsGrid heading="Built for the sectors that need it most" />

        {/* What you get */}
        <section className="border-t border-border bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-8 text-center text-2xl font-bold text-foreground md:text-3xl">
                What you get with every launch
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-sm font-medium">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Packages */}
        <section className="bg-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                TalkWeb Launch Packages
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Our team configures, trains, and deploys TalkWeb for your organisation.
              </p>
            </div>
            <LaunchPackagesGrid />

            <div className="text-center mt-12">
              <p className="text-muted-foreground mb-4">
                Prefer to talk? Call us on{" "}
                <a href={TEL_SUPPORT} className="text-primary font-medium hover:underline">
                  {SUPPORT_PHONE}
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Business;
