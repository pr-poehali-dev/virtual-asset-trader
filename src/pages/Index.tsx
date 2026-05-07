import { useState, useEffect } from "react";
import { Nav, Footer } from "@/components/layout/NavFooter";
import { HomePage, CatalogPage, AddProductPage } from "@/components/pages/HomePages";
import { DealsPage, EscrowPage, SupportPage, AboutPage } from "@/components/pages/InfoPages";
import { CabinetPage, LoginPage, RegisterPage, SellerProfilePage, FrozenPage } from "@/components/pages/AuthPages";
import { VerifyPage } from "@/components/pages/VerifyPage";
import { AdminPage, AdminLogin } from "@/components/pages/AdminPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";

function AppContent() {
  const [page, setPage] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [frozenReason, setFrozenReason] = useState<string | undefined>();
  const { user, loading } = useAuth();

  // После входа — перенаправить с login/register на главную
  useEffect(() => {
    if (user && (page === "login" || page === "register")) {
      setPage("home");
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center animate-pulse">
            <span className="text-gold font-bold text-lg">G</span>
          </div>
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  const handleSetActive = (p: string) => {
    if (p === "admin") {
      if (isAdmin || user?.role === "admin" || user?.role === "staff" || user?.isOwner) {
        setIsAdmin(true);
        setPage("admin");
      } else {
        setPage("admin-login");
      }
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
      case "verify": return <VerifyPage setActive={handleSetActive} />;
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
      <main className="pt-20">
        {renderPage()}
      </main>
      <Footer setActive={handleSetActive} />
    </div>
  );
}

export default function Index() {
  return (
    <CurrencyProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </CurrencyProvider>
  );
}