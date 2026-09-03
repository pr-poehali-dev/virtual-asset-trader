// ── URL бэкенд-функций ────────────────────────────────────────────────────────

const URLS = {
  auth: "https://functions.poehali.dev/ebdf83cc-4195-48fb-a361-dbf53cd2e037",
  products:
    "https://functions.poehali.dev/92600ddd-131e-4901-a00b-83d99b2a46ef",
  deals: "https://functions.poehali.dev/772e4404-b373-4a01-930b-a0d20d166365",
  finance: "https://functions.poehali.dev/e6860c2a-7a3c-478f-8b54-ce4304b40ce9",
  verify: "https://functions.poehali.dev/402fc63e-0445-4679-aed8-9de14a0466cd",
  cron: "https://functions.poehali.dev/5c7df636-0a9b-4389-8386-33ea4436e034",
  support: "https://functions.poehali.dev/bb975e6b-5919-4192-b818-f982c873bec9",
  "email-verify":
    "https://functions.poehali.dev/fcb9d830-fcfd-4ac1-822b-98a22d876b1b",
  oauth: "https://functions.poehali.dev/219a69fa-3e89-4e3a-8a96-ec1881003765",
  monitor: "https://functions.poehali.dev/35d8efe4-e58b-4431-bb12-9de563346686",
  games: "https://functions.poehali.dev/81e75bfe-0ae5-45a5-bee5-bfa430b15eb9",
  security: "https://functions.poehali.dev/028a5ec8-d990-4d93-98ef-d1ebdb0f316c",
  "ai-support": "https://functions.poehali.dev/03171705-36ec-4004-acf3-440b75a3f829",
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
    email_not_verified: "Подтвердите email перед регистрацией",
    ip_blocked: "Слишком много запросов. Попробуйте позже",
    rate_limited: "Слишком много запросов. Попробуйте позже",
    amount_too_small: "Сумма слишком мала для вывода",
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
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["X-Session-Token"] = token;

  // Платформа не маршрутизирует подпути — передаём путь как query-параметр
  const [pathOnly, qs2] = path.split("?");
  const finalUrl =
    URLS[base] +
    "?_path=" +
    encodeURIComponent(pathOnly) +
    (qs2 ? "&" + qs2 : "");
  let res: Response;
  try {
    res = await fetch(finalUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw {
      status: 0,
      error: "network_error",
      message: "Нет соединения с сервером",
    } as ApiError;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw {
      status: res.status,
      error: "parse_error",
      message: "Ошибка обработки ответа",
    } as ApiError;
  }

  if (!res.ok) {
    if (base !== "monitor") {
      // Асинхронно отправляем событие в мониторинг (не блокируем основной поток)
      import("@/lib/errorMonitor")
        .then(({ reportApiError }) => {
          reportApiError(path, res.status);
        })
        .catch(() => {});
    }
    throw { status: res.status, ...(data as object) };
  }
  return data as T;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (username: string, email: string, password: string) =>
      req<{ token: string; user: ApiUser }>("auth", "/register", "POST", {
        username,
        email,
        password,
      }),

    login: (login, password) =>
      req("auth", "/login", "POST", { login, password }),

    me: () => req<{ user: ApiUser }>("auth", "/me"),

    logout: () => req("auth", "/logout", "POST"),

    heartbeat: () => req<{ ok: boolean }>("auth", "/heartbeat", "POST"),

    team: () => req<{ team: ApiTeamMember[] }>("auth", "/team"),
  },

  products: {
    list: (params?: {
      category?: string;
      search?: string;
      price_max?: string;
    }) => {
      const qs = params
        ? "?" +
          new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
          ).toString()
        : "";
      return req<{ products: ApiProduct[] }>("products", "/products" + qs);
    },

    create: (data: {
      title: string;
      category: string;
      price: number;
      description?: string;
    }) => req<ApiProduct>("products", "/products", "POST", data),

    boost: (product_id: number) =>
      req("products", "/products/boost", "POST", { product_id }),

    delete: (product_id: number) =>
      req("products", "/products/delete", "POST", { product_id }),

    my: () => req<{ products: ApiProduct[] }>("products", "/products/my"),

    seller: (id: string) =>
      req<{
        seller: ApiSeller;
        products: ApiProduct[];
        reviews: ApiReview[];
        avgRating: number;
      }>("products", `/products/seller/${id}`),
  },

  emailVerify: {
    send: (email: string) =>
      req<{ ok: boolean }>("email-verify", "/send", "POST", { email }),
    check: (email: string, code: string) =>
      req<{ ok: boolean; verified: boolean }>(
        "email-verify",
        "/check",
        "POST",
        { email, code },
      ),
  },

  deals: {
    buy: (product_id: number) =>
      req<{ deal_id: string; status: string }>("deals", "/deals/buy", "POST", {
        product_id,
      }),

    list: () => req<{ deals: ApiDeal[] }>("deals", "/deals"),

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

    maintenance: () => req<{ maintenance: boolean }>("finance", "/maintenance"),

    setMaintenance: (enabled: boolean) =>
      req<{ ok: boolean; maintenance: boolean }>(
        "finance",
        "/admin/maintenance",
        "POST",
        { enabled },
      ),

    deposit: (amount: number, currency: string) =>
      req<{
        id: string;
        requisite: ApiDepositRequisite;
        expiresAt: string;
        amount: number;
      }>("finance", "/deposit", "POST", { amount, currency }),

    depositPaid: (dep_id: string) =>
      req("finance", "/deposit/paid", "POST", { dep_id }),

    depositCancel: (dep_id: string) =>
      req("finance", "/deposit/cancel", "POST", { dep_id }),

    depositActive: () =>
      req<{ deposit: ApiActiveDeposit | null }>("finance", "/deposit/active"),

    withdraw: (data: {
      amount: number;
      currency: string;
      requisite_type: string;
      requisite_details: string;
      commission?: number;
    }) =>
      req<{ id: string; to_receive: number }>(
        "finance",
        "/withdraw",
        "POST",
        data,
      ),

    myWithdrawals: () =>
      req<{ withdrawals: ApiWithdrawal[] }>("finance", "/withdrawals"),

    review: (seller_id: string, rating: number, text: string) =>
      req("finance", "/review", "POST", { seller_id, rating, text }),

    // Admin
    adminUsers: () => req<{ users: ApiAdminUser[] }>("finance", "/admin/users"),

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
    submit: (data: {
      full_name: string;
      doc_type: string;
      doc_number: string;
      doc_photo?: string;
      selfie?: string;
    }) =>
      req<{ id: string; status: string }>("verify", "/submit", "POST", data),

    status: () =>
      req<{
        id?: string;
        status: string | null;
        reject_reason?: string;
        date?: string;
        verified?: boolean;
      }>("verify", "/status"),

    adminList: () =>
      req<{ verifications: ApiVerification[] }>("verify", "/admin/list"),

    approve: (id: string) => req("verify", "/approve", "POST", { id }),

    reject: (id: string, reason: string) =>
      req("verify", "/reject", "POST", { id, reason }),
  },

  // ── Расширенные admin-методы ─────────────────────────────────────────────

  adminExtra: {
    stats: () => req<ApiAdminStats>("finance", "/admin/stats"),

    staff: (
      user_id: string,
      action: "add" | "remove" | "update",
      permissions?: string[],
    ) =>
      req("finance", "/admin/staff", "POST", {
        user_id,
        action,
        permissions: permissions ?? [],
      }),

    arbiter: (deal_id: string, arbiter_id: string) =>
      req("finance", "/admin/arbiter", "POST", { deal_id, arbiter_id }),

    // Реквизиты пополнения (пул платформы)
    getDepositRequisites: () =>
      req<{ requisites: ApiDepositRequisite[] }>(
        "finance",
        "/admin/deposit-requisites",
      ),
    addDepositRequisite: (data: {
      name: string;
      type: string;
      details: string;
      bank?: string;
      currency: string;
    }) => req("finance", "/admin/deposit-requisites/add", "POST", data),
    toggleDepositRequisite: (id: string) =>
      req("finance", "/admin/deposit-requisites/toggle", "POST", { id }),
    deleteDepositRequisite: (id: string) =>
      req("finance", "/admin/deposit-requisites/delete", "POST", { id }),

    // Партнёры
    getPartnerApplications: () =>
      req<{ applications: ApiPartnerApplication[] }>(
        "finance",
        "/admin/partner-applications",
      ),
    approvePartner: (id: string) =>
      req<{ ok: boolean; refCode: string }>(
        "finance",
        "/admin/partner-approve",
        "POST",
        { id },
      ),
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
      req<{ requisites: ApiWithdrawalRequisite[] }>(
        "finance",
        "/withdrawal-requisites",
      ),
    add: (data: {
      type: "sbp" | "card";
      phone?: string;
      bank?: string;
      card_number?: string;
      card_holder?: string;
      label?: string;
    }) =>
      req<{ id: string }>(
        "finance",
        "/withdrawal-requisites/add",
        "POST",
        data,
      ),
    delete: (id: string) =>
      req("finance", "/withdrawal-requisites/delete", "POST", { id }),
  },

  // Реквизит пополнения (рандомный из пула)
  depositRequisite: () =>
    req<ApiDepositRequisite>("finance", "/deposit-requisite"),

  // Партнёрство
  partner: {
    status: () => req<ApiPartnerStatus>("finance", "/partner/status"),
    apply: (platforms: ApiPartnerPlatform[]) =>
      req<{ id: string }>("finance", "/partner/apply", "POST", { platforms }),
  },

  // Поддержка
  support: {
    openTicket: (subject: string, message: string) =>
      req<{ ticketId: string }>("support", "/ticket/open", "POST", {
        subject,
        message,
      }),
    getTicket: () =>
      req<{ ticket: ApiSupportTicket | null }>("support", "/support/ticket"),
    sendMessage: (ticket_id: string, text: string) =>
      req("support", "/ticket/message", "POST", { ticket_id, text }),
    closeTicket: (ticket_id: string) =>
      req("support", "/ticket/close", "POST", { ticket_id }),

    // Admin
    getTickets: (status = "open") =>
      req<{ tickets: ApiSupportTicketItem[] }>(
        "support",
        `/admin/tickets?status=${status}`,
      ),
    getTicketDetail: (id: string) =>
      req<{ ticket: ApiSupportTicketDetail }>("support", `/admin/ticket/${id}`),
    reply: (ticket_id: string, text: string) =>
      req("support", "/admin/reply", "POST", { ticket_id, text }),
    assign: (ticket_id: string, operator_id?: string) =>
      req("support", "/admin/assign", "POST", { ticket_id, operator_id }),

    getDisputes: () =>
      req<{ disputes: ApiDispute[] }>("support", "/admin/disputes"),
    getDisputeMessages: (deal_id: string) =>
      req<{ messages: ApiDisputeMessage[] }>(
        "support",
        `/admin/dispute/${deal_id}/messages`,
      ),
    disputeMessage: (deal_id: string, text: string) =>
      req("support", "/admin/dispute/message", "POST", { deal_id, text }),
    resolveDispute: (deal_id: string, refund_buyer: boolean) =>
      req("support", "/admin/dispute/resolve", "POST", {
        deal_id,
        refund_buyer,
      }),
    assignDispute: (deal_id: string, arbiter_id?: string) =>
      req("support", "/admin/dispute/assign", "POST", { deal_id, arbiter_id }),
    getOperators: () =>
      req<{ operators: { id: string; username: string; role: string }[] }>(
        "support",
        "/admin/operators",
      ),
    chatBan: (user_id: string) =>
      req("support", "/admin/chat-ban", "POST", { user_id }),
    permaBan: (user_id: string) =>
      req("support", "/admin/perma-ban", "POST", { user_id }),
  },

  oauth: {
    google: (code: string, redirect_uri: string) =>
      req<{ token: string; user: ApiUser }>("oauth", "/google", "POST", {
        code,
        redirect_uri,
      }),
    vk: (data: {
      access_token: string;
      user_id: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    }) => req<{ token: string; user: ApiUser }>("oauth", "/vk", "POST", data),
  },

  monitor: {
    report: (data: {
      event_type: string;
      severity?: "info" | "warning" | "error" | "critical";
      title: string;
      description?: string;
      url?: string;
      user_id?: string;
      status_code?: number;
    }) => req<{ ok: boolean }>("monitor", "/report", "POST", data),

    list: (active = true) =>
      req<{
        events: ApiMonitorEvent[];
        open_count: number;
        critical_count: number;
      }>("monitor", `/list?active=${active}`),

    resolve: (id: number) =>
      req<{ ok: boolean }>("monitor", "/resolve", "POST", { id }),

    resolveAll: () =>
      req<{ ok: boolean }>("monitor", "/resolve-all", "POST", {}),
  },

  games: {
    list: () => req<{ games: ApiGame[] }>("games", "/games"),

    get: (id: string) => req<{ game: ApiGame }>("games", `/games/${id}`),

    create: (data: {
      title?: string;
      bet_amount: number;
      target_bank: number;
      duration_seconds: number;
      winners_count?: number;
    }) => req<{ game: ApiGame }>("games", "/games", "POST", data),

    bet: (game_id: string) =>
      req<{ game: ApiGame; ticketNo: number }>("games", "/games/bet", "POST", { game_id }),

    cancel: (game_id: string) =>
      req<{ ok: boolean }>("games", "/games/cancel", "POST", { game_id }),

    finishNow: (game_id: string) =>
      req<{ game: ApiGame }>("games", "/games/finish-now", "POST", { game_id }),

    history: () => req<{ games: ApiGame[] }>("games", "/games/history"),
  },

  security: {
    withdrawRequest: (data: {
      amount: number;
      currency: string;
      requisite_type: string;
      requisite_details: string;
    }) =>
      req<{ ticketId: string; maskedEmail: string }>(
        "security",
        "/withdraw/request",
        "POST",
        data,
      ),

    withdrawConfirm: (ticket_id: string, code: string) =>
      req<{ id: string; to_receive: number }>(
        "security",
        "/withdraw/confirm",
        "POST",
        { ticket_id, code },
      ),

    spendRequest: () =>
      req<{ ticketId: string; maskedEmail: string }>(
        "security",
        "/spend/request",
        "POST",
        {},
      ),

    spendConfirm: (ticket_id: string, code: string) =>
      req<{ ok: boolean }>("security", "/spend/confirm", "POST", {
        ticket_id,
        code,
      }),

    adminLog: () =>
      req<{ log: ApiSecurityLogItem[] }>("security", "/admin/log"),

    adminBlockedIps: () =>
      req<{ blockedIps: ApiBlockedIp[]; activeCount: number }>(
        "security",
        "/admin/blocked-ips",
      ),

    adminUnblockIp: (ip: string) =>
      req<{ ok: boolean }>("security", "/admin/unblock-ip", "POST", { ip }),
  },

  aiSupport: {
    respond: (ticket_id: string) =>
      req<{ replied: boolean; text?: string; escalated?: boolean }>(
        "ai-support",
        "/respond",
        "POST",
        { ticket_id },
      ),
  },
};

// ── ТИПЫ ──────────────────────────────────────────────────────────────────────

export type ApiMonitorEvent = {
  id: number;
  event_type: string;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  description: string | null;
  url: string | null;
  user_id: string | null;
  ip: string | null;
  status_code: number | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

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
  freeze_reason?: string;
  block_reason?: string;
  verified: boolean;
  balance_rub: number;
  locked_rub: number;
  deals_count?: number;
  joined_at?: string;
  perma_banned?: boolean;
  permaBanned?: boolean;
  chat_banned?: boolean;
  chatBanned?: boolean;
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
  disputeMessages: {
    from: string;
    role: string;
    text: string;
    time?: string;
    isSystem?: boolean;
  }[];
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
  withdrawals: {
    pendingCount: number;
    pendingVolume: number;
    day: number;
    week: number;
    month: number;
  };
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

export type ApiActiveDeposit = {
  id: string;
  amount: number;
  currency: string;
  requisiteName: string;
  requisiteDetails: string;
  status:
    | "awaiting_payment"
    | "pending"
    | "confirmed"
    | "rejected"
    | "cancelled";
  expiresAt: string | null;
  requisite: ApiDepositRequisite | null;
};

export type ApiSupportMessage = {
  id: number;
  fromUser: string;
  fromUsername?: string;
  role: "user" | "operator" | "system" | "ai";
  text: string;
  time: string;
};

export type ApiSupportTicket = {
  id: string;
  subject: string;
  status: "open" | "closed";
  operatorName?: string;
  aiEnabled?: boolean;
  escalated?: boolean;
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

export type ApiGameBet = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  ticketNo: number;
  createdAt: string;
};

export type ApiGameWinner = {
  userId: string;
  username: string;
  ticketNo: number;
  amount: number;
};

export type ApiGame = {
  id: string;
  title: string;
  betAmount: number;
  targetBank: number;
  durationSeconds: number;
  bank: number;
  status: "active" | "finished" | "cancelled";
  winnerId?: string | null;
  winnerName?: string | null;
  winnerAmount?: number | null;
  winnerTicketNo?: number | null;
  winnersCount: number;
  winners?: ApiGameWinner[];
  createdBy: string;
  creatorName?: string | null;
  creatorRole?: string | null;
  createdAt: string;
  expiresAt: string;
  finishedAt?: string | null;
  participantsCount: number;
  bets?: ApiGameBet[];
};

export type ApiTeamMember = {
  id: string;
  username: string;
  role: string;
  isOwner: boolean;
  online: boolean;
  lastSeen: string | null;
};

export type ApiSecurityLogItem = {
  id: number;
  userId: string;
  username: string;
  eventType: string;
  ip: string | null;
  time: string;
};

export type ApiBlockedIp = {
  ip: string;
  reason: string;
  blockedUntil: string;
  createdAt: string;
};