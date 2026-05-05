import { useState } from "react";
import { Nav, Footer } from "@/components/layout/NavFooter";
import { HomePage, CatalogPage, CabinetPage } from "@/components/pages/HomePages";
import { DealsPage, EscrowPage, SupportPage, AboutPage } from "@/components/pages/InfoPages";
import { AdminPage, AdminLogin } from "@/components/pages/AdminPage";

export default function Index() {
  const [page, setPage] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSetActive = (p: string) => {
    if (p === "admin" && !isAdmin) {
      setPage("admin-login");
    } else {
      setPage(p);
    }
  };

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setActive={handleSetActive} />;
      case "catalog": return <CatalogPage />;
      case "cabinet": return <CabinetPage />;
      case "deals": return <DealsPage />;
      case "escrow": return <EscrowPage />;
      case "support": return <SupportPage />;
      case "about": return <AboutPage />;
      case "admin-login": return (
        <AdminLogin onSuccess={() => { setIsAdmin(true); setPage("admin"); }} />
      );
      case "admin": return isAdmin ? <AdminPage /> : <AdminLogin onSuccess={() => { setIsAdmin(true); setPage("admin"); }} />;
      default: return <HomePage setActive={handleSetActive} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav active={page} setActive={handleSetActive} isAdmin={isAdmin} />
      <main className="pt-16">
        {renderPage()}
      </main>
      <Footer setActive={handleSetActive} />
    </div>
  );
}
