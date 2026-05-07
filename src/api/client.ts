// ── URL бэкенд-функций ────────────────────────────────────────────────────────

const URLS = {
  auth:     "https://functions.poehali.dev/f7cf9d27-0165-42aa-a519-ac9a60135a50",
  products: "https://functions.poehali.dev/60bab67c-c302-40ed-893c-642babdae2dd",
  deals:    "https://functions.poehali.dev/60ecf7a0-0dce-4f8b-8f6a-6ad16f76e69d",
  finance:  "https://functions.poehali.dev/157d72aa-df5a-4388-b097-ec2b1e0cc2cd",
  verify:   "https://functions.poehali.dev/250f9167-baf5-4f6c-871a-3d7b82fe125b",
  cron:     "https://functions.poehali.dev/f6cb1b5e-a65d-4603-a0c2-d4d68994a775",
  support:  "https://functions.poehali.dev/478e3db7-0bb0-4726-871f-61f868a0aab8",
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

// Тип ошибки API — для нормальной обработки во фронтенде
export type ApiError = { status: number; error?: string; message?: string };

export function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "status" in e;
}

export function apiErrorMessage(e: unknown): string {
  if (!isApiError(e)) return "Неизвестная ошибка";
  const err = e as ApiError;
  const map: Record<string, string> = {
    unauthorized: "Необходима авторизация",
    forbidden: "Нет доступа",
    not_found: "Не найдено",
    exists: "Уже существует",
    no_balance: "Недостаточно средств",
    wrong: "Неверный логин или пароль",
    blocked: "Аккаунт заблокирован",
    frozen: "Аккаунт заморожен",
    self_buy: "Нельзя купить собственный товар",
    missing_fields: "Заполните все поля",
    invalid_data: "Некорректные данные",
    already_pending: "Заявка уже подана",
    already_verified: "Аккаунт уже верифицирован",
    not_buyer: "Отзыв доступен только после покупки",
    owner_protected: "Действие недоступно для владельца",
    wrong_status: "Неверный статус сделки",
  };
  return map[err.error ?? ""] || err.message || `Ошибка ${err.status}`;
}

async function req<T = unknown>(
  base: keyof typeof URLS,
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Session-Token"] = token;

  // Платформа не маршрутизирует подпути — передаём путь как query-параметр
  const [pathOnly, qs2] = path.split("?");
  const finalUrl = URLS[base] + "?_path=" + encodeURIComponent(pathOnly) + (qs2 ? "&" + qs2 : "");
  let res: Response;
  try {
    res = await fetch(finalUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw { status: 0, error: "network_error", message: "Нет соединения с сервером" } as ApiError;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw { status: res.status, error: "parse_error", message: "Ошибка обработки ответа" } as ApiError;
  }

  if (!res.ok) throw { status: res.status, ...(data as object) };
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

    delete: (product_id: number) =>
      req("products", "/products/delete", "POST", { product_id }),

    my: () =>
      req<{ products: ApiProduct[] }>("products", "/products/my"),

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

  verify: {
    submit: (data: { full_name: string; doc_type: string; doc_number: string; doc_photo?: string; selfie?: string }) =>
      req<{ id: string; status: string }>("verify", "/submit", "POST", data),

    status: () =>
      req<{ id?: string; status: string | null; reject_reason?: string; date?: string; verified?: boolean }>("verify", "/status"),

    adminList: () =>
      req<{ verifications: ApiVerification[] }>("verify", "/admin/list"),

    approve: (id: string) =>
      req("verify", "/approve", "POST", { id }),

    reject: (id: string, reason: string) =>
      req("verify", "/reject", "POST", { id, reason }),
  },

  // ── Расширенные admin-методы ─────────────────────────────────────────────

  adminExtra: {
    stats: () =>
      req<ApiAdminStats>("finance", "/admin/stats"),

    staff: (user_id: string, action: "add" | "remove" | "update", permissions?: string[]) =>
      req("finance", "/admin/staff", "POST", { user_id, action, permissions: permissions ?? [] }),

    arbiter: (deal_id: string, arbiter_id: string) =>
      req("finance", "/admin/arbiter", "POST", { deal_id, arbiter_id }),

    // Реквизиты пополнения (пул платформы)
    getDepositRequisites: () =>
      req<{ requisites: ApiDepositRequisite[] }>("finance", "/admin/deposit-requisites"),
    addDepositRequisite: (data: { name: string; type: string; details: string; bank?: string; currency: string }) =>
      req("finance", "/admin/deposit-requisites/add", "POST", data),
    toggleDepositRequisite: (id: string) =>
      req("finance", "/admin/deposit-requisites/toggle", "POST", { id }),
    deleteDepositRequisite: (id: string) =>
      req("finance", "/admin/deposit-requisites/delete", "POST", { id }),

    // Партнёры
    getPartnerApplications: () =>
      req<{ applications: ApiPartnerApplication[] }>("finance", "/admin/partner-applications"),
    approvePartner: (id: string) =>
      req<{ ok: boolean; refCode: string }>("finance", "/admin/partner-approve", "POST", { id }),
    rejectPartner: (id: string, reason: string) =>
      req("finance", "/admin/partner-reject", "POST", { id, reason }),
    getPartners: () =>
      req<{ partners: ApiPartner[] }>("finance", "/admin/partners"),
    togglePartner: (id: string) =>
      req("finance", "/admin/partner-toggle", "POST", { id }),
  },

  // Реквизиты вывода (личные)
  withdrawalRequisites: {
    list: () =>
      req<{ requisites: ApiWithdrawalRequisite[] }>("finance", "/withdrawal-requisites"),
    add: (data: { type: "sbp" | "card"; phone?: string; bank?: string; card_number?: string; card_holder?: string; label?: string }) =>
      req<{ id: string }>("finance", "/withdrawal-requisites/add", "POST", data),
    delete: (id: string) =>
      req("finance", "/withdrawal-requisites/delete", "POST", { id }),
  },

  // Реквизит пополнения (рандомный из пула)
  depositRequisite: () =>
    req<ApiDepositRequisite>("finance", "/deposit-requisite"),

  // Партнёрство
  partner: {
    status: () =>
      req<ApiPartnerStatus>("finance", "/partner/status"),
    apply: (platforms: ApiPartnerPlatform[]) =>
      req<{ id: string }>("finance", "/partner/apply", "POST", { platforms }),
  },

  // Поддержка
  support: {
    openTicket: (subject: string, message: string) =>
      req<{ ticketId: string }>("support", "/ticket/open", "POST", { subject, message }),
    getTicket: () =>
      req<{ ticket: ApiSupportTicket | null }>("support", "/support/ticket"),
    sendMessage: (ticket_id: string, text: string) =>
      req("support", "/ticket/message", "POST", { ticket_id, text }),
    closeTicket: (ticket_id: string) =>
      req("support", "/ticket/close", "POST", { ticket_id }),

    // Admin
    getTickets: (status = "open") =>
      req<{ tickets: ApiSupportTicketItem[] }>("support", `/admin/tickets?status=${status}`),
    getTicketDetail: (id: string) =>
      req<{ ticket: ApiSupportTicketDetail }>("support", `/admin/ticket/${id}`),
    reply: (ticket_id: string, text: string) =>
      req("support", "/admin/reply", "POST", { ticket_id, text }),
    assign: (ticket_id: string, operator_id?: string) =>
      req("support", "/admin/assign", "POST", { ticket_id, operator_id }),

    getDisputes: () =>
      req<{ disputes: ApiDispute[] }>("support", "/admin/disputes"),
    getDisputeMessages: (deal_id: string) =>
      req<{ messages: ApiDisputeMessage[] }>("support", `/admin/dispute/${deal_id}/messages`),
    disputeMessage: (deal_id: string, text: string) =>
      req("support", "/admin/dispute/message", "POST", { deal_id, text }),
    resolveDispute: (deal_id: string, refund_buyer: boolean) =>
      req("support", "/admin/dispute/resolve", "POST", { deal_id, refund_buyer }),
    assignDispute: (deal_id: string, arbiter_id?: string) =>
      req("support", "/admin/dispute/assign", "POST", { deal_id, arbiter_id }),
    getOperators: () =>
      req<{ operators: { id: string; username: string; role: string }[] }>("support", "/admin/operators"),
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

export type ApiVerification = {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  docType: string;
  docNumber: string;
  docPhoto?: string;
  selfie?: string;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  date: string;
};

export type ApiAdminStats = {
  totalDeals: number;
  totalVolume: number;
  openDeals: number;
  openVolume: number;
  successRate: number;
  commissionEarned: number;
  commission: { total: number; day: number; week: number; month: number };
  registeredUsers: number;
  usersGrowth: { total: number; day: number; week: number; month: number };
  usersByStatus: Record<string, number>;
  pendingWithdrawals: number;
  pendingWithdrawalsVolume: number;
  withdrawals: { pendingCount: number; pendingVolume: number; day: number; week: number; month: number };
};

export type ApiWithdrawalRequisite = {
  id: string;
  type: "sbp" | "card";
  phone?: string;
  bank?: string;
  cardNumber?: string;
  cardHolder?: string;
  label?: string;
  createdAt: string;
};

export type ApiDepositRequisite = {
  id: string;
  name: string;
  type: string;
  details: string;
  bank?: string;
  currency: string;
  active?: boolean;
  showCount?: number;
};

export type ApiPartnerPlatform = {
  platform: string;
  url: string;
  subscribers: number;
  avg_views: number;
};

export type ApiPartnerApplication = {
  id: string;
  userId: string;
  username: string;
  email: string;
  platforms: ApiPartnerPlatform[];
  status: "pending" | "approved" | "rejected";
  date: string;
};

export type ApiPartner = {
  id: string;
  userId: string;
  username: string;
  email: string;
  refCode: string;
  commissionPct: number;
  totalEarned: number;
  totalReferrals: number;
  active: boolean;
  date: string;
  platforms: ApiPartnerPlatform[];
};

export type ApiPartnerStatus = {
  isPartner: boolean;
  refCode?: string;
  commissionPct?: number;
  totalEarned?: number;
  totalReferrals?: number;
  platforms?: ApiPartnerPlatform[];
  refUrl?: string;
  application?: {
    id: string;
    status: "pending" | "approved" | "rejected";
    rejectReason?: string;
    date: string;
  } | null;
};

export type ApiSupportMessage = {
  id: number;
  fromUser: string;
  fromUsername?: string;
  role: "user" | "operator" | "system";
  text: string;
  time: string;
};

export type ApiSupportTicket = {
  id: string;
  subject: string;
  status: "open" | "closed";
  operatorName?: string;
  messages: ApiSupportMessage[];
};

export type ApiSupportTicketItem = {
  id: string;
  userId: string;
  username: string;
  subject: string;
  status: "open" | "closed";
  operatorId?: string;
  operatorName?: string;
  updatedAt: string;
  msgCount: number;
};

export type ApiSupportTicketDetail = ApiSupportTicket & {
  userId: string;
  username: string;
  operatorId?: string;
};

export type ApiDispute = {
  id: string;
  product: string;
  category: string;
  amount: number;
  status: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  arbiterId?: string;
  arbiterName?: string;
  date: string;
  updatedAt: string;
};

export type ApiDisputeMessage = {
  id: number;
  fromUser: string;
  fromUsername: string;
  role: string;
  text: string;
  isSystem: boolean;
  time: string;
};