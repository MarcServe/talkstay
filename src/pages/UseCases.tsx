import { Header } from "@/components/Header";
import { UseCaseShowcase } from "@/components/UseCaseShowcase";
import { DeploymentShowcase } from "@/components/DeploymentShowcase";

const UseCases = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <UseCaseShowcase />
        <DeploymentShowcase />
      </main>
    </div>
  );
};

export default UseCases;
