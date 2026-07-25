import { Header } from "@/components/Header";
import { MultiLanguageShowcase } from "@/components/MultiLanguageShowcase";

const Languages = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <MultiLanguageShowcase />
      </main>
    </div>
  );
};

export default Languages;
