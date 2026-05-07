// ── URL бэкенд-функций ────────────────────────────────────────────────────────

const URLS = {
  auth:     "https://functions.poehali.dev/f7cf9d27-0165-42aa-a519-ac9a60135a50",
  products: "https://functions.poehali.dev/60bab67c-c302-40ed-893c-642babdae2dd",
  deals:    "https://functions.poehali.dev/60ecf7a0-0dce-4f8b-8f6a-6ad16f76e69d",
  finance:  "https://functions.poehali.dev/157d72aa-df5a-4388-b097-ec2b1e0cc2cd",
};

// ── Токен сессии ──────────────────────────────────────────────────────────────

const TOKEN_KEY = "gs_session_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Базовый запрос ────────────────────────────────────────────────────────────

async function req<T = unknown>(
  base: keyof typeof URLS,
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Session-Token"] = token;

  const url = URLS[base] + path;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data as T;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (username: string, email: string, password: string) =>
      req<{ token: string; user: ApiUser }>("auth", "/register", "POST", { username, email, password }),

    login: (login: string, password: string) =>
      req<{ token: string; user: ApiUser }>("auth", "/login", "POST", { login, password }),

    me: () =>
      req<{ user: ApiUser }>("auth", "/me"),

    logout: () =>
      req("auth", "/logout", "POST"),
  },

  products: {
    list: (params?: { category?: string; search?: string; price_max?: string }) => {
      const qs = params ? "?" + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v))
      ).toString() : "";
      return req<{ products: ApiProduct[] }>("products", "/products" + qs);
    },

    create: (data: { title: string; category: string; price: number; description?: string }) =>
      req<ApiProduct>("products", "/products", "POST", data),

    boost: (product_id: number) =>
      req("products", "/products/boost", "POST", { product_id }),

    seller: (id: string) =>
      req<{ seller: ApiSeller; products: ApiProduct[]; reviews: ApiReview[]; avgRating: number }>(
        "products", `/products/seller/${id}`
      ),
  },

  deals: {
    buy: (product_id: number) =>
      req<{ deal_id: string; status: string }>("deals", "/deals/buy", "POST", { product_id }),

    list: () =>
      req<{ deals: ApiDeal[] }>("deals", "/deals"),

    dispute: (deal_id: string) =>
      req("deals", "/deals/dispute", "POST", { deal_id }),

    message: (deal_id: string, text: string) =>
      req("deals", "/deals/message", "POST", { deal_id, text }),

    resolve: (deal_id: string, refund_buyer: boolean) =>
      req("deals", "/deals/resolve", "POST", { deal_id, refund_buyer }),
  },

  finance: {
    notifications: () =>
      req<{ notifications: ApiNotification[] }>("finance", "/notifications"),

    markRead: (id: string) =>
      req("finance", "/notifications/read", "POST", { id }),

    deposit: (amount: number, currency: string, requisite_type: string) =>
      req<{ id: string }>("finance", "/deposit", "POST", { amount, currency, requisite_type }),

    withdraw: (data: { amount: number; currency: string; requisite_type: string; requisite_details: string; commission?: number }) =>
      req<{ id: string; to_receive: number }>("finance", "/withdraw", "POST", data),

    myWithdrawals: () =>
      req<{ withdrawals: ApiWithdrawal[] }>("finance", "/withdrawals"),

    review: (seller_id: string, rating: number, text: string) =>
      req("finance", "/review", "POST", { seller_id, rating, text }),

    // Admin
    adminUsers: () =>
      req<{ users: ApiAdminUser[] }>("finance", "/admin/users"),

    adminUserStatus: (user_id: string, status: string, reason?: string) =>
      req("finance", "/user-status", "POST", { user_id, status, reason }),

    adminDeposits: () =>
      req<{ deposits: ApiDeposit[] }>("finance", "/deposits"),

    confirmDeposit: (id: string) =>
      req("finance", "/deposits/confirm", "POST", { id }),

    rejectDeposit: (id: string) =>
      req("finance", "/deposits/reject", "POST", { id }),

    adminWithdrawals: () =>
      req<{ withdrawals: ApiWithdrawal[] }>("finance", "/admin/withdrawals"),

    updateWithdrawalStatus: (id: string, status: string) =>
      req("finance", "/withdrawal-status", "POST", { id, status }),
  },
};

// ── ТИПЫ ──────────────────────────────────────────────────────────────────────

export type ApiUser = {
  id: string;
  accountId: string;
  account_id?: string;
  username: string;
  email: string;
  role: "admin" | "staff" | "user";
  isOwner?: boolean;
  is_owner?: boolean;
  staffPerms?: string[];
  status: "active" | "blocked" | "frozen";
  freezeReason?: string;
  blockReason?: string;
  verified: boolean;
  balance_rub: number;
  locked_rub: number;
  deals_count?: number;
  joined_at?: string;
};

export type ApiAdminUser = ApiUser & {
  balanceRub: number;
  lockedRub: number;
  dealsCount: number;
  joinedAt: string;
};

export type ApiProduct = {
  id: number;
  sellerId: string;
  sellerName: string;
  title: string;
  category: string;
  price: number;
  description?: string;
  active?: boolean;
  boosted: boolean;
  boostUntil?: string;
  rating?: number;
  reviews?: number;
  badge?: string | null;
  verified?: boolean;
};

export type ApiDeal = {
  id: string;
  product: string;
  category?: string;
  amount: number;
  status: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  holdDays?: number;
  holdUntil?: string;
  arbiterId?: string;
  date: string;
  step: number;
  disputeMessages: { from: string; role: string; text: string; time?: string; isSystem?: boolean }[];
};

export type ApiNotification = {
  id: string;
  type: string;
  title: string;
  text: string;
  shield: boolean;
  read: boolean;
  date: string;
};

export type ApiWithdrawal = {
  id: string;
  amount: number;
  currency: string;
  commission: number;
  toReceive: number;
  requisiteType: string;
  requisiteDetails: string;
  status: string;
  date: string;
};

export type ApiDeposit = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  currency: string;
  requisiteType: string;
  status: string;
  date: string;
};

export type ApiSeller = {
  id: string;
  accountId: string;
  username: string;
  verified: boolean;
  deals: number;
  joined: string;
};

export type ApiReview = {
  id: string;
  fromUser: string;
  rating: number;
  text: string;
  date: string;
};
