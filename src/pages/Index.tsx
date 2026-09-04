import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Nav, Footer } from "@/components/layout/NavFooter";
import { HomePage, CatalogPage, AddProductPage } from "@/components/pages/HomePages";
import { DealsPage, EscrowPage, SupportPage, AboutPage } from "@/components/pages/InfoPages";
import { GamesPage } from "@/components/pages/GamesPage";
import { CabinetPage, LoginPage, RegisterPage, SellerProfilePage, FrozenPage } from "@/components/pages/AuthPages";
import { VerifyPage } from "@/components/pages/VerifyPage";
import { AdminPage, AdminLogin } from "@/components/pages/AdminPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import Icon from "@/components/ui/icon";
import { api } from "@/api/client";

// ─── MAINTENANCE PAGE ─────────────────────────────────────────────────────────

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-6">
          <Icon name="Wrench" size={36} className="text-amber-400" />
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground mb-4">
          Проводятся технические проверки
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Скоро сайт вернётся к обычной работе.
        </p>
      </div>
    </div>
  );
}

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

// Соответствие внутреннего id страницы ↔ реального URL в адресной строке.
// У каждой страницы свой адрес, например /home, /catalog, /support — виден в браузере и им можно поделиться.
function pageToPath(p: string): string {
  if (p.startsWith("seller-")) return `/seller/${p.slice(7)}`;
  if (p === "admin-login") return "/admin";
  return `/${p}`;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ page?: string; sellerId?: string }>();
  const page = params.sellerId
    ? `seller-${params.sellerId}`
    : location.pathname === "/"
      ? "home"
      : (params.page || "home");

  const [isAdmin, setIsAdmin] = useState(false);
  const [frozenReason, setFrozenReason] = useState<string | undefined>();
  const [maintenance, setMaintenance] = useState(false);
  const { user, loading } = useAuth();

  const setPage = useCallback((p: string) => {
    navigate(pageToPath(p));
  }, [navigate]);

  // Показываем явный адрес /home в адресной строке вместо голого "/"
  useEffect(() => {
    if (location.pathname === "/") {
      navigate("/home", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const checkMaintenance = () => {
      api.finance.maintenance()
        .then(({ maintenance: m }) => setMaintenance(m))
        .catch(() => {});
    };
    checkMaintenance();
    const t = setInterval(checkMaintenance, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (user && (page === "login" || page === "register")) {
      setPage("home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Maintenance: только для не-администраторов ─────────────────────────────
  const isStaff = user?.role === "admin" || user?.role === "staff" || user?.isOwner;
  if (maintenance && !isStaff) {
    return <MaintenancePage />;
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
      case "games": return <GamesPage />;
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
      <div className="animated-bg">
        <div className="animated-bg-blob" />
        <div className="animated-bg-blob-2" />
      </div>
      <Nav active={page} setActive={handleSetActive} isAdmin={isAdmin} />
      <main className="pt-20 pb-16 md:pb-0">
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