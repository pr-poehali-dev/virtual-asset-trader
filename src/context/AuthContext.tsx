import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, getToken, setToken, clearToken, type ApiUser, type ApiProduct, type ApiDeal, type ApiNotification, type ApiWithdrawal, type ApiDeposit } from "@/api/client";
import { HOLD_CATEGORIES, PLATFORM_COMMISSION } from "@/components/data/constants";
import type { StaffPermission } from "@/components/data/constants";

// ── Локальные типы (совместимы с UI) ─────────────────────────────────────────

export type AppUser = ApiUser & {
  accountId: string;
  balances: Record<string, number>;
  lockedBalances: Record<string, number>;
  deals: number;
  joined: string;
  balance: number;
  products: AppProduct[];
  reviews: AppReview[];
  purchasedProductIds: number[];
  notifications: AppNotification[];
  staffPermissions?: StaffPermission[];
  isOwner?: boolean;
};

export type AppProduct = ApiProduct & { sellerId: string; sellerName: string };
export type AppReview = { id: string; fromUserId: string; fromUser: string; rating: number; text: string; date: string };
export type AppNotification = ApiNotification & { userId: string };
export type AppDeal = ApiDeal;

function apiUserToApp(u: ApiUser): AppUser {
  return {
    ...u,
    accountId: u.accountId ?? u.account_id ?? "",
    isOwner: u.isOwner ?? u.is_owner ?? false,
    balances: { RUB: u.balance_rub ?? 0 },
    lockedBalances: { RUB: u.locked_rub ?? 0 },
    deals: u.deals_count ?? 0,
    joined: u.joined_at ?? "",
    balance: u.balance_rub ?? 0,
    products: [],
    reviews: [],
    purchasedProductIds: [],
    notifications: [],
    staffPermissions: (u.staffPerms as StaffPermission[]) ?? [],
  };
}

// ── Context type ─────────────────────────────────────────────────────────────

type AuthContextType = {
  user: AppUser | null;
  users: AppUser[];
  deals: AppDeal[];
  deposits: ApiDeposit[];
  loading: boolean;

  login: (loginStr: string, password: string) => Promise<"ok" | "blocked" | "frozen" | "wrong">;
  register: (username: string, email: string, password: string) => Promise<"ok" | "exists" | "error">;
  logout: () => Promise<void>;

  updateUsers: (users: AppUser[]) => void;
  addProduct: (product: AppProduct) => Promise<void>;
  buyProduct: (product: AppProduct, _seller: AppUser) => Promise<"ok" | "no_balance" | "self">;
  boostProduct: (productId: number) => Promise<"ok" | "no_balance">;
  addReview: (sellerId: string, review: Omit<AppReview, "id">) => Promise<"ok" | "not_buyer">;
  openDispute: (dealId: string) => Promise<void>;
  sendDisputeMessage: (dealId: string, text: string) => Promise<void>;
  resolveDispute: (dealId: string, refundBuyer: boolean) => Promise<void>;
  assignArbiter: (dealId: string, arbiterId: string) => void;

  addNotification: (userId: string, notif: Omit<AppNotification, "id" | "userId" | "read" | "date">) => void;
  markNotifRead: (notifId: string) => Promise<void>;

  addDeposit: (dep: Omit<ApiDeposit, "id" | "status" | "date">) => Promise<void>;
  confirmDeposit: (depId: string) => Promise<void>;
  rejectDeposit: (depId: string) => Promise<void>;

  addStaff: (userId: string, permissions: StaffPermission[]) => void;
  removeStaff: (userId: string) => void;
  updateStaffPerms: (userId: string, permissions: StaffPermission[]) => void;

  refreshDeals: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [deals, setDeals] = useState<AppDeal[]>([]);
  const [deposits, setDeposits] = useState<ApiDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  // Восстанавливаем сессию при загрузке
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.auth.me()
      .then(({ user: u }) => {
        setUser(apiUserToApp(u));
        loadUserData(u.id);
      })
      .catch(() => { clearToken(); })
      .finally(() => setLoading(false));
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const [dealsRes, notifsRes] = await Promise.all([
        api.deals.list().catch(() => ({ deals: [] })),
        api.finance.notifications().catch(() => ({ notifications: [] })),
      ]);
      setDeals(dealsRes.deals);
      setUser((prev) => prev && prev.id === userId ? {
        ...prev,
        notifications: notifsRes.notifications.map((n) => ({ ...n, userId })),
      } : prev);
    } catch { /* ignore */ }
  };

  const login = async (loginStr: string, password: string): Promise<"ok" | "blocked" | "frozen" | "wrong"> => {
    try {
      const { token, user: u } = await api.auth.login(loginStr, password);
      setToken(token);
      const appUser = apiUserToApp(u);
      setUser(appUser);
      await loadUserData(u.id);
      return "ok";
    } catch (e: unknown) {
      const err = e as { error?: string };
      if (err?.error === "blocked") return "blocked";
      if (err?.error === "frozen") return "frozen";
      return "wrong";
    }
  };

  const register = async (username: string, email: string, password: string): Promise<"ok" | "exists" | "error"> => {
    try {
      const { token, user: u } = await api.auth.register(username, email, password);
      setToken(token);
      setUser(apiUserToApp(u));
      return "ok";
    } catch (e: unknown) {
      const err = e as { error?: string };
      if (err?.error === "exists") return "exists";
      return "error";
    }
  };

  const logout = async () => {
    await api.auth.logout().catch(() => {});
    clearToken();
    setUser(null);
    setDeals([]);
    setDeposits([]);
  };

  const updateUsers = (updated: AppUser[]) => setUsers(updated);

  const addProduct = async (product: AppProduct) => {
    try {
      await api.products.create({
        title: product.title,
        category: product.category,
        price: product.price,
        description: "",
      });
      setUser((prev) => prev ? { ...prev, products: [...prev.products, product] } : prev);
    } catch { /* ignore */ }
  };

  const buyProduct = async (product: AppProduct, _seller: AppUser): Promise<"ok" | "no_balance" | "self"> => {
    try {
      await api.deals.buy(product.id);
      // Обновляем баланс локально
      setUser((prev) => prev ? {
        ...prev,
        balances: { ...prev.balances, RUB: Math.max(0, (prev.balances.RUB ?? 0) - product.price) },
        purchasedProductIds: [...prev.purchasedProductIds, product.id],
        deals: prev.deals + 1,
      } : prev);
      await loadUserData(user?.id ?? "");
      return "ok";
    } catch (e: unknown) {
      const err = e as { error?: string };
      if (err?.error === "no_balance") return "no_balance";
      if (err?.error === "self_buy") return "self";
      return "no_balance";
    }
  };

  const boostProduct = async (productId: number): Promise<"ok" | "no_balance"> => {
    try {
      await api.products.boost(productId);
      setUser((prev) => prev ? {
        ...prev,
        balances: { ...prev.balances, RUB: (prev.balances.RUB ?? 0) - 25 },
        products: prev.products.map((p) => p.id === productId ? { ...p, boosted: true } : p),
      } : prev);
      return "ok";
    } catch {
      return "no_balance";
    }
  };

  const addReview = async (sellerId: string, review: Omit<AppReview, "id">): Promise<"ok" | "not_buyer"> => {
    try {
      await api.finance.review(sellerId, review.rating, review.text);
      return "ok";
    } catch {
      return "not_buyer";
    }
  };

  const openDispute = async (dealId: string) => {
    await api.deals.dispute(dealId);
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, status: "dispute" } : d));
  };

  const sendDisputeMessage = async (dealId: string, text: string) => {
    await api.deals.message(dealId, text);
    const now = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setDeals((prev) => prev.map((d) => {
      if (d.id !== dealId) return d;
      const role: "buyer" | "seller" | "arbiter" =
        d.arbiterId === user?.id ? "arbiter" : d.buyerId === user?.id ? "buyer" : "seller";
      return { ...d, disputeMessages: [...d.disputeMessages, { from: user?.username ?? "", role, text, time: now }] };
    }));
  };

  const resolveDispute = async (dealId: string, refundBuyer: boolean) => {
    await api.deals.resolve(dealId, refundBuyer);
    setDeals((prev) => prev.map((d) =>
      d.id === dealId ? { ...d, status: refundBuyer ? "refunded" : "completed" } : d
    ));
  };

  const assignArbiter = (dealId: string, arbiterId: string) => {
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, arbiterId } : d));
  };

  const addNotification = (_userId: string, _notif: Omit<AppNotification, "id" | "userId" | "read" | "date">) => {
    // Уведомления создаются на бэкенде; для UI только обновляем при следующем запросе
  };

  const markNotifRead = async (notifId: string) => {
    await api.finance.markRead(notifId).catch(() => {});
    setUser((prev) => prev ? {
      ...prev,
      notifications: prev.notifications.map((n) => n.id === notifId ? { ...n, read: true } : n),
    } : prev);
  };

  const addDeposit = async (dep: Omit<ApiDeposit, "id" | "status" | "date">) => {
    await api.finance.deposit(dep.amount, dep.currency, dep.requisiteType);
    await refreshNotifications();
  };

  const confirmDeposit = async (depId: string) => {
    await api.finance.confirmDeposit(depId);
    setDeposits((prev) => prev.filter((d) => d.id !== depId));
  };

  const rejectDeposit = async (depId: string) => {
    await api.finance.rejectDeposit(depId);
    setDeposits((prev) => prev.filter((d) => d.id !== depId));
  };

  // Staff management — local only (admin panel uses updateUsers)
  const addStaff = (userId: string, permissions: StaffPermission[]) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: "staff", staffPermissions: permissions } : u));
  };
  const removeStaff = (userId: string) => {
    setUsers((prev) => prev.map((u) => u.id === userId && !u.isOwner ? { ...u, role: "user", staffPermissions: [] } : u));
  };
  const updateStaffPerms = (userId: string, permissions: StaffPermission[]) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, staffPermissions: permissions } : u));
  };

  const refreshDeals = async () => {
    if (!user) return;
    const res = await api.deals.list().catch(() => ({ deals: [] }));
    setDeals(res.deals);
  };

  const refreshNotifications = async () => {
    if (!user) return;
    const res = await api.finance.notifications().catch(() => ({ notifications: [] }));
    setUser((prev) => prev ? {
      ...prev,
      notifications: res.notifications.map((n) => ({ ...n, userId: prev.id })),
    } : prev);
  };

  // Периодически обновляем данные пока авторизован
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshDeals();
      refreshNotifications();
    }, 30000); // каждые 30 сек
    return () => clearInterval(interval);
  }, [user?.id]);

  // Заглушка — используем HOLD_CATEGORIES и PLATFORM_COMMISSION для UI
  void HOLD_CATEGORIES;
  void PLATFORM_COMMISSION;

  return (
    <AuthContext.Provider value={{
      user, users, deals, deposits, loading,
      login, register, logout, updateUsers,
      addProduct, buyProduct, boostProduct, addReview,
      openDispute, sendDisputeMessage, resolveDispute, assignArbiter,
      addNotification, markNotifRead,
      addDeposit, confirmDeposit, rejectDeposit,
      addStaff, removeStaff, updateStaffPerms,
      refreshDeals, refreshNotifications,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
