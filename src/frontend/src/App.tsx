import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { StructureDetail } from "./pages/StructureDetail";

export type AppPage = { page: "dashboard" } | { page: "structure"; id: string };

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>({
    page: "dashboard",
  });

  function navigate(page: AppPage) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar
          onNavigateHome={() => navigate({ page: "dashboard" })}
          currentPage={currentPage}
        />

        <main className="flex-1">
          {currentPage.page === "dashboard" && (
            <Dashboard
              onSelectStructure={(id) => navigate({ page: "structure", id })}
            />
          )}
          {currentPage.page === "structure" && (
            <StructureDetail
              structureId={currentPage.id}
              onBack={() => navigate({ page: "dashboard" })}
            />
          )}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </TooltipProvider>
  );
}
