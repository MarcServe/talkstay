import { Header } from "@/components/Header";
import { PricingSection } from "@/components/PricingSection";

export const Pricing = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <PricingSection />
      </main>
    </div>
  );
};