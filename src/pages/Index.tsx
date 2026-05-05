import { useState } from "react";
import { Nav, Footer } from "@/components/layout/NavFooter";
import { HomePage, CatalogPage, CabinetPage } from "@/components/pages/HomePages";
import { DealsPage, EscrowPage, SupportPage, AboutPage } from "@/components/pages/InfoPages";

export default function Index() {
  const [page, setPage] = useState("home");

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setActive={setPage} />;
      case "catalog": return <CatalogPage />;
      case "cabinet": return <CabinetPage />;
      case "deals": return <DealsPage />;
      case "escrow": return <EscrowPage />;
      case "support": return <SupportPage />;
      case "about": return <AboutPage />;
      default: return <HomePage setActive={setPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav active={page} setActive={setPage} />
      <main className="pt-16">
        {renderPage()}
      </main>
      <Footer setActive={setPage} />
    </div>
  );
}
