import { useState, useEffect } from "react";
import { Nav, Footer } from "@/components/layout/NavFooter";
import { HomePage, CatalogPage, AddProductPage } from "@/components/pages/HomePages";
import { DealsPage, EscrowPage, SupportPage, AboutPage } from "@/components/pages/InfoPages";
import { CabinetPage, LoginPage, RegisterPage, SellerProfilePage, FrozenPage } from "@/components/pages/AuthPages";
import { VerifyPage } from "@/components/pages/VerifyPage";
import { AdminPage, AdminLogin } from "@/components/pages/AdminPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import Icon from "@/components/ui/icon";

// ─── PERMA-BAN PAGE ──────────────────────────────────────────────────────────

function PermaBannedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <Icon name="Ban" size={44} className="text-red-500" />
        </div>
        <h1 className="font-display font-black text-3xl text-foreground mb-3">
          Вы забанены навсегда
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Ваш аккаунт был заблокирован навсегда за грубые нарушения правил платформы.
          Доступ к Gorant Shop закрыт безвозвратно.
        </p>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400">
          Если вы считаете, что это ошибка — свяжитесь с нами по email:<br />
          <span className="font-semibold">gorant.shop-supp0rt@yandex.ru</span>
        </div>
      </div>
    </div>
  );
}

// ─── CHAT-BAN PAGE (видит только это сообщение) ───────────────────────────────

function ChatBannedSupportPage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/30 flex items-center justify-center mx-auto mb-5">
        <Icon name="MessageSquareX" size={28} className="text-red-400" />
      </div>
      <h2 className="font-display font-bold text-xl text-foreground mb-3">Чат заблокирован</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Доступ к чату поддержки закрыт навсегда за нарушение правил.
        По вопросам обращайтесь на почту:{" "}
        <span className="text-gold font-semibold">gorant.shop-supp0rt@yandex.ru</span>
      </p>
    </div>
  );
}

function AppContent() {
  const [page, setPage] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [frozenReason, setFrozenReason] = useState<string | undefined>();
  const { user, loading } = useAuth();

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

  // ── Perma-ban: полная изоляция ────────────────────────────────────────────
  if (user?.perma_banned || user?.permaBanned) {
    return <PermaBannedPage />;
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
    // ── Frozen/blocked: только поддержка ────────────────────────────────────
    const isRestricted = user && (user.status === "frozen" || user.status === "blocked");
    const allowedWhenRestricted = ["support", "login", "register"];

    if (isRestricted && !allowedWhenRestricted.includes(page) && !page.startsWith("admin")) {
      // Chat-banned — показываем заглушку вместо чата
      if (user.chat_banned || user.chatBanned) {
        return <ChatBannedSupportPage />;
      }
      return <FrozenPage
        reason={user.status === "frozen" ? (user.freezeReason ?? (user as { freeze_reason?: string }).freeze_reason) : undefined}
        blocked={user.status === "blocked"}
        onSupport={() => handleSetActive("support")}
      />;
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
      case "support": {
        if (user?.chat_banned || user?.chatBanned) return <ChatBannedSupportPage />;
        return <SupportPage />;
      }
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
