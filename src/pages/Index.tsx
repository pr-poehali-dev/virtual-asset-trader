import { useState } from "react";
import { Nav, Footer } from "@/components/layout/NavFooter";
import { HomePage, CatalogPage, AddProductPage } from "@/components/pages/HomePages";
import { DealsPage, EscrowPage, SupportPage, AboutPage } from "@/components/pages/InfoPages";
import { CabinetPage, LoginPage, RegisterPage, SellerProfilePage, FrozenPage } from "@/components/pages/AuthPages";
import { AdminPage, AdminLogin } from "@/components/pages/AdminPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function AppContent() {
  const [page, setPage] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [frozenReason, setFrozenReason] = useState<string | undefined>();
  const { user } = useAuth();

  const handleSetActive = (p: string) => {
    if (p === "admin" && !isAdmin) {
      setPage("admin-login");
    } else {
      setPage(p);
    }
  };

  const handleFrozen = (reason?: string) => {
    setFrozenReason(reason);
    setPage("frozen");
  };

  const renderPage = () => {
    if (user && user.status === "frozen" && page !== "support") {
      return <FrozenPage reason={user.freezeReason} onSupport={() => handleSetActive("support")} />;
    }

    if (page.startsWith("seller-")) {
      const sellerId = page.replace("seller-", "");
      return <SellerProfilePage sellerId={sellerId} setActive={handleSetActive} />;
    }

    switch (page) {
      case "home": return <HomePage setActive={handleSetActive} />;
      case "catalog": return <CatalogPage setActive={handleSetActive} />;
      case "add-product": return <AddProductPage setActive={handleSetActive} />;
      case "cabinet": return <CabinetPage setActive={handleSetActive} />;
      case "deals": return <DealsPage />;
      case "escrow": return <EscrowPage />;
      case "support": return <SupportPage />;
      case "about": return <AboutPage />;
      case "login": return <LoginPage onRegister={() => handleSetActive("register")} onFrozen={handleFrozen} />;
      case "register": return <RegisterPage onLogin={() => handleSetActive("login")} />;
      case "frozen": return <FrozenPage reason={frozenReason} onSupport={() => handleSetActive("support")} />;
      case "admin-login": return <AdminLogin onSuccess={() => { setIsAdmin(true); setPage("admin"); }} />;
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

export default function Index() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
