import { useParams, Link, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SECTORS } from "@/components/SectorsGrid";
import { LaunchPackagesGrid, openBookDemo } from "@/components/PricingSection";
import { Check, ArrowRight, Calendar } from "lucide-react";

const SectorPage = () => {
  const { sectorSlug } = useParams<{ sectorSlug: string }>();
  const sector = SECTORS.find((s) => s.slug === sectorSlug);
  if (!sector) return <Navigate to="/business" replace />;

  const Icon = sector.icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b border-border bg-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <div
                className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card"
              >
                <Icon className="h-7 w-7" style={{ color: sector.accent }} aria-hidden="true" />
              </div>
              <Badge className="mb-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10">
                For {sector.name}
              </Badge>
              <h1 className="mb-5 text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
                {sector.outcome}
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
                Instant Access to Information. We deploy a conversational AI assistant for your organisation — trained on your content, available on web, WhatsApp, phone, and voice.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={openBookDemo} className="gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Book a Discovery Call
                </Button>
                <Link to="/pricing">
                  <Button size="lg" variant="outline" className="gap-2">
                    See packages <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Problems */}
        <section className="border-b border-border bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-2xl font-bold text-foreground md:text-3xl">
                Problems we solve
              </h2>
              <ul className="grid gap-4 md:grid-cols-3">
                {sector.problems.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* What we deploy */}
        <section className="border-b border-border bg-background py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-2xl font-bold text-foreground md:text-3xl">
                What we deploy
              </h2>
              <ul className="mx-auto grid max-w-2xl gap-3">
                {[
                  "Discovery workshop with your team",
                  "Content & website audit",
                  "Knowledge base setup (web pages, PDFs, policies)",
                  "AI assistant creation & tone configuration",
                  "Voice + chat configuration across channels",
                  "Testing, accessibility checks, and launch support",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-sm md:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Packages */}
        <section className="bg-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                Launch Packages
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Done-for-you implementation. Pick the package that matches the size of your rollout.
              </p>
            </div>
            <LaunchPackagesGrid />
            <div className="mt-12 text-center">
              <Button size="lg" onClick={openBookDemo} className="gap-2">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Book a Discovery Call
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SectorPage;
