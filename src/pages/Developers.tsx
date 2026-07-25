import { Header } from "@/components/Header";
import { DeveloperDocumentation } from "@/components/DeveloperDocumentation";
import { useEffect } from "react";

const Developers = () => {
  useEffect(() => {
    document.title = "TalkWeb for Developers - API Documentation";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <DeveloperDocumentation />
      </main>
    </div>
  );
};

export default Developers;
