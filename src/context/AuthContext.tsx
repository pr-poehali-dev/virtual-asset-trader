import { createContext, useContext, useState, ReactNode } from "react";
import {
  AppUser, USERS, generateAccountId, generateUserId, generateNotifId,
  Product, SellerReview, Deal, AppNotification, HOLD_CATEGORIES,
  PLATFORM_COMMISSION, BOOST_PRICE, DepositRequest, StaffPermission,
} from "@/components/data/constants";

type AuthContextType = {
  user: AppUser | null;
  users: AppUser[];
  deals: Deal[];
  deposits: DepositRequest[];

  login: (login: string, password: string) => "ok" | "blocked" | "frozen" | "wrong";
  register: (username: string, email: string, password: string) => "ok" | "exists";
  logout: () => void;

  updateUsers: (users: AppUser[]) => void;
  addProduct: (product: Product) => void;
  buyProduct: (product: Product, sellerUser: AppUser) => "ok" | "no_balance" | "self";
  boostProduct: (productId: number) => "ok" | "no_balance";
  addReview: (sellerId: string, review: Omit<SellerReview, "id">) => "ok" | "not_buyer";
  openDispute: (dealId: string) => void;
  sendDisputeMessage: (dealId: string, text: string) => void;
  resolveDispute: (dealId: string, refundBuyer: boolean) => void;
  assignArbiter: (dealId: string, arbiterId: string) => void;

  addNotification: (userId: string, notif: Omit<AppNotification, "id" | "userId" | "read" | "date">) => void;
  markNotifRead: (notifId: string) => void;

  // Deposits
  addDeposit: (dep: Omit<DepositRequest, "id" | "status" | "date">) => void;
  confirmDeposit: (depId: string) => void;
  rejectDeposit: (depId: string) => void;

  // Staff
  addStaff: (userId: string, permissions: StaffPermission[]) => void;
  removeStaff: (userId: string) => void;
  updateStaffPerms: (userId: string, permissions: StaffPermission[]) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function notifNow(): string {
  return new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(USERS);
  const [user, setUser] = useState<AppUser | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([
    { id: "DEP-001", userId: "u-002", username: "user_K93", amount: 2000, currency: "RUB", requisiteType: "Сбербанк", status: "pending", date: "07.05.2024" },
  ]);

  // Sync current user when users list changes
  const syncUser = (updated: AppUser[]) => {
    setUsers(updated);
    if (user) {
      const refreshed = updated.find((u) => u.id === user.id);
      if (refreshed) setUser(refreshed);
    }
  };

  const addNotification = (userId: string, notif: Omit<AppNotification, "id" | "userId" | "read" | "date">) => {
    const full: AppNotification = { ...notif, id: generateNotifId(), userId, read: false, date: notifNow() };
    setUsers((prev) => {
      const updated = prev.map((u) => u.id === userId ? { ...u, notifications: [full, ...u.notifications] } : u);
      if (user?.id === userId) setUser((prev) => prev ? { ...prev, notifications: [full, ...prev.notifications] } : prev);
      return updated;
    });
  };

  const markNotifRead = (notifId: string) => {
    setUsers((prev) => {
      const updated = prev.map((u) => ({
        ...u,
        notifications: u.notifications.map((n) => n.id === notifId ? { ...n, read: true } : n),
      }));
      if (user) {
        const refreshed = updated.find((u) => u.id === user.id);
        if (refreshed) setUser(refreshed);
      }
      return updated;
    });
  };

  const login = (loginStr: string, password: string): "ok" | "blocked" | "frozen" | "wrong" => {
    const found = users.find((u) =>
      (u.email.toLowerCase() === loginStr.toLowerCase() || u.username.toLowerCase() === loginStr.toLowerCase())
      && u.password === password
    );
    if (!found) return "wrong";
    if (found.status === "blocked") return "blocked";
    if (found.status === "frozen") return "frozen";
    setUser(found);
    return "ok";
  };

  const register = (username: string, email: string, password: string): "ok" | "exists" => {
    const exists = users.find((u) =>
      u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
    );
    if (exists) return "exists";
    const newUser: AppUser = {
      id: generateUserId(),
      accountId: generateAccountId(),
      username, email, password,
      role: "user", status: "active", verified: false,
      deals: 0,
      joined: new Date().toLocaleDateString("ru-RU"),
      balances: { RUB: 0 }, lockedBalances: { RUB: 0 },
      products: [], reviews: [], purchasedProductIds: [], notifications: [],
    };
    setUsers((prev) => [...prev, newUser]);
    setUser(newUser);
    return "ok";
  };

  const logout = () => setUser(null);

  const updateUsers = (updated: AppUser[]) => syncUser(updated);

  const addProduct = (product: Product) => {
    if (!user) return;
    setUsers((prev) => {
      const updated = prev.map((u) => u.id === user.id ? { ...u, products: [...u.products, product] } : u);
      setUser((p) => p ? { ...p, products: [...p.products, product] } : p);
      return updated;
    });
  };

  const buyProduct = (product: Product, sellerUser: AppUser): "ok" | "no_balance" | "self" => {
    if (!user) return "no_balance";
    if (user.id === sellerUser.id) return "self";
    const price = product.price;
    const buyerBal = user.balances.RUB ?? 0;
    if (buyerBal < price) return "no_balance";

    const holdDays = HOLD_CATEGORIES[product.category];
    const sellerReceives = Math.round(price * (1 - PLATFORM_COMMISSION / 100));
    const now = new Date();
    const holdUntil = holdDays
      ? new Date(now.getTime() + holdDays * 86400000).toLocaleDateString("ru-RU")
      : undefined;

    const deal: Deal = {
      id: `TX-${Date.now().toString().slice(-5)}`,
      product: product.title,
      productId: product.id,
      category: product.category,
      amount: price,
      status: holdDays ? (product.category === "CS2 скины" ? "hold_cs2" : "hold_pubg") : "completed",
      buyerId: user.id,
      buyerName: user.username,
      sellerId: sellerUser.id,
      sellerName: sellerUser.username,
      date: now.toLocaleDateString("ru-RU"),
      step: holdDays ? 3 : 4,
      holdDays,
      holdUntil,
      disputeMessages: [],
    };

    setDeals((prev) => [deal, ...prev]);

    setUsers((prev) => prev.map((u) => {
      if (u.id === user.id) {
        return {
          ...u,
          balances: { ...u.balances, RUB: (u.balances.RUB ?? 0) - price },
          purchasedProductIds: [...u.purchasedProductIds, product.id],
          deals: u.deals + 1,
        };
      }
      if (u.id === sellerUser.id) {
        // Если холд — кладём в locked, иначе сразу на баланс
        const now2 = new Date();
        const twoDays = 2 * 24 * 60 * 60 * 1000;
        const canWithdrawImmediately = u.verified;

        if (holdDays) {
          return {
            ...u,
            lockedBalances: { ...u.lockedBalances, RUB: (u.lockedBalances.RUB ?? 0) + sellerReceives },
          };
        } else {
          if (canWithdrawImmediately) {
            return { ...u, balances: { ...u.balances, RUB: (u.balances.RUB ?? 0) + sellerReceives } };
          } else {
            // Не верифицированный — средства поступают через 2 дня (пока просто на locked)
            return {
              ...u,
              lockedBalances: { ...u.lockedBalances, RUB: (u.lockedBalances.RUB ?? 0) + sellerReceives },
            };
          }
        }
      }
      return u;
    }));

    // Уведомления
    addNotification(sellerUser.id, {
      type: "deal_sold",
      title: "Новая покупка!",
      text: `Пользователь ${user.username} купил ваш товар «${product.title}» за ₽${price.toLocaleString("ru-RU")}. Вам будет зачислено ₽${sellerReceives.toLocaleString("ru-RU")} (после вычета комиссии 5%).${holdDays ? ` Холд ${holdDays} дней.` : ""}`,
      shield: true,
    });

    addNotification(user.id, {
      type: "deal_bought",
      title: "Покупка совершена",
      text: `Вы купили «${product.title}» за ₽${price.toLocaleString("ru-RU")}. Сделка ID: ${deal.id}.`,
    });

    // Обновляем текущего пользователя
    setUser((prev) => prev ? {
      ...prev,
      balances: { ...prev.balances, RUB: (prev.balances.RUB ?? 0) - price },
      purchasedProductIds: [...prev.purchasedProductIds, product.id],
      deals: prev.deals + 1,
    } : prev);

    return "ok";
  };

  const boostProduct = (productId: number): "ok" | "no_balance" => {
    if (!user) return "no_balance";
    if ((user.balances.RUB ?? 0) < BOOST_PRICE) return "no_balance";

    setUsers((prev) => prev.map((u) => {
      if (u.id !== user.id) return u;
      return {
        ...u,
        balances: { ...u.balances, RUB: (u.balances.RUB ?? 0) - BOOST_PRICE },
        products: u.products.map((p) => p.id === productId
          ? { ...p, boosted: true, boostExpires: Date.now() + 24 * 60 * 60 * 1000 }
          : p
        ),
      };
    }));
    setUser((prev) => prev ? {
      ...prev,
      balances: { ...prev.balances, RUB: (prev.balances.RUB ?? 0) - BOOST_PRICE },
      products: prev.products.map((p) => p.id === productId
        ? { ...p, boosted: true, boostExpires: Date.now() + 24 * 60 * 60 * 1000 }
        : p
      ),
    } : prev);

    addNotification(user.id, {
      type: "boost",
      title: "Товар поднят в топ",
      text: `Ваш товар поднят наверх на 24 часа. Списано ₽${BOOST_PRICE}.`,
    });
    return "ok";
  };

  const addReview = (sellerId: string, review: Omit<SellerReview, "id">): "ok" | "not_buyer" => {
    if (!user) return "not_buyer";
    // Проверяем, есть ли завершённая сделка между покупателем и продавцом
    const hasBought = deals.some((d) =>
      d.buyerId === user.id && d.sellerId === sellerId && (d.status === "completed" || d.status === "hold_cs2" || d.status === "hold_pubg")
    );
    // Также проверяем по purchasedProductIds продавца (его товары)
    const seller = users.find((u) => u.id === sellerId);
    const sellerProductIds = seller?.products.map((p) => p.id) ?? [];
    const boughtFromSeller = user.purchasedProductIds.some((id) => sellerProductIds.includes(id));
    if (!hasBought && !boughtFromSeller) return "not_buyer";

    const newReview: SellerReview = { ...review, id: `r-${Date.now()}` };
    setUsers((prev) => prev.map((u) => u.id === sellerId ? { ...u, reviews: [...u.reviews, newReview] } : u));
    return "ok";
  };

  const openDispute = (dealId: string) => {
    if (!user) return;
    setDeals((prev) => prev.map((d) => {
      if (d.id !== dealId) return d;
      const sysMsg = {
        from: "system",
        role: "seller" as const,
        text: `Спор открыт пользователем ${user.username}. Ожидайте назначения арбитра.`,
        time: notifNow(),
        isSystem: true,
      };
      return { ...d, status: "dispute", disputeMessages: [sysMsg] };
    }));
  };

  const sendDisputeMessage = (dealId: string, text: string) => {
    if (!user) return;

    // Проверка на подозрительные ссылки
    const urlPattern = /https?:\/\/(?!gorant\.shop)[^\s]+/gi;
    let displayText = text;
    if (urlPattern.test(text)) {
      displayText = text + "\n\n⚠️ [Предупреждение: обнаружена внешняя ссылка. Gorant Shop не несёт ответственности за переход по сторонним ссылкам]";
    }

    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    const role: "buyer" | "seller" | "arbiter" =
      deal.arbiterId === user.id ? "arbiter"
      : deal.buyerId === user.id ? "buyer"
      : "seller";

    const msg = { from: user.username, role, text: displayText, time: notifNow() };
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, disputeMessages: [...(d.disputeMessages ?? []), msg] } : d));
  };

  const resolveDispute = (dealId: string, refundBuyer: boolean) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    setDeals((prev) => prev.map((d) => {
      if (d.id !== dealId) return d;
      const msg = {
        from: "Арбитр",
        role: "arbiter" as const,
        text: refundBuyer
          ? `✅ Решение арбитра: средства ₽${deal.amount.toLocaleString("ru-RU")} возвращены покупателю.`
          : `✅ Решение арбитра: средства ₽${deal.amount.toLocaleString("ru-RU")} выплачены продавцу.`,
        time: notifNow(),
        isSystem: true,
      };
      return { ...d, status: refundBuyer ? "refunded" : "completed", disputeMessages: [...(d.disputeMessages ?? []), msg] };
    }));

    // Возвращаем средства
    setUsers((prev) => prev.map((u) => {
      if (refundBuyer && u.id === deal.buyerId) {
        return { ...u, balances: { ...u.balances, RUB: (u.balances.RUB ?? 0) + deal.amount } };
      }
      if (!refundBuyer && u.id === deal.sellerId) {
        const receives = Math.round(deal.amount * (1 - PLATFORM_COMMISSION / 100));
        return { ...u, balances: { ...u.balances, RUB: (u.balances.RUB ?? 0) + receives } };
      }
      return u;
    }));

    addNotification(deal.buyerId, {
      type: "dispute",
      title: "Спор разрешён",
      text: refundBuyer ? `По сделке ${deal.id} выполнен возврат ₽${deal.amount.toLocaleString("ru-RU")}.` : `По сделке ${deal.id} средства выплачены продавцу.`,
    });
    addNotification(deal.sellerId, {
      type: "dispute",
      title: "Спор разрешён",
      text: refundBuyer ? `По сделке ${deal.id} средства возвращены покупателю.` : `По сделке ${deal.id} вам зачислены средства.`,
    });
  };

  const assignArbiter = (dealId: string, arbiterId: string) => {
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, arbiterId } : d));
  };

  // Deposits
  const addDeposit = (dep: Omit<DepositRequest, "id" | "status" | "date">) => {
    const newDep: DepositRequest = {
      ...dep,
      id: `DEP-${Date.now().toString().slice(-5)}`,
      status: "pending",
      date: new Date().toLocaleDateString("ru-RU"),
    };
    setDeposits((prev) => [newDep, ...prev]);
    addNotification(dep.userId, {
      type: "deposit_update",
      title: "Заявка на пополнение создана",
      text: `Заявка на пополнение ₽${dep.amount.toLocaleString("ru-RU")} ожидает подтверждения. ID: ${newDep.id}.`,
    });
  };

  const confirmDeposit = (depId: string) => {
    const dep = deposits.find((d) => d.id === depId);
    if (!dep) return;
    setDeposits((prev) => prev.filter((d) => d.id !== depId));
    setUsers((prev) => prev.map((u) => {
      if (u.id !== dep.userId) return u;
      return { ...u, balances: { ...u.balances, [dep.currency]: (u.balances[dep.currency] ?? 0) + dep.amount } };
    }));
    if (user?.id === dep.userId) {
      setUser((p) => p ? { ...p, balances: { ...p.balances, [dep.currency]: (p.balances[dep.currency] ?? 0) + dep.amount } } : p);
    }
    addNotification(dep.userId, {
      type: "deposit_update",
      title: "Пополнение подтверждено",
      text: `Ваш баланс пополнен на ${dep.amount.toLocaleString("ru-RU")} ${dep.currency}. Заявка ${dep.id} обработана.`,
    });
  };

  const rejectDeposit = (depId: string) => {
    const dep = deposits.find((d) => d.id === depId);
    if (!dep) return;
    setDeposits((prev) => prev.filter((d) => d.id !== depId));
    addNotification(dep.userId, {
      type: "deposit_update",
      title: "Оплата не обнаружена",
      text: `По заявке ${dep.id} оплата не найдена. Обратитесь в поддержку.`,
    });
  };

  // Staff management
  const addStaff = (userId: string, permissions: StaffPermission[]) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: "staff", staffPermissions: permissions } : u));
  };

  const removeStaff = (userId: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId || u.isOwner) return u;
      return { ...u, role: "user", staffPermissions: [] };
    }));
  };

  const updateStaffPerms = (userId: string, permissions: StaffPermission[]) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, staffPermissions: permissions } : u));
  };

  return (
    <AuthContext.Provider value={{
      user, users, deals, deposits,
      login, register, logout, updateUsers,
      addProduct, buyProduct, boostProduct, addReview,
      openDispute, sendDisputeMessage, resolveDispute, assignArbiter,
      addNotification, markNotifRead,
      addDeposit, confirmDeposit, rejectDeposit,
      addStaff, removeStaff, updateStaffPerms,
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
