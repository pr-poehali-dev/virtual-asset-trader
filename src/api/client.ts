// ── URL бэкенд-функций ────────────────────────────────────────────────────────

const URLS = {
  auth:           "https://functions.poehali.dev/f7cf9d27-0165-42aa-a519-ac9a60135a50",
  products:       "https://functions.poehali.dev/60bab67c-c302-40ed-893c-642babdae2dd",
  deals:          "https://functions.poehali.dev/60ecf7a0-0dce-4f8b-8f6a-6ad16f76e69d",
  finance:        "https://functions.poehali.dev/157d72aa-df5a-4388-b097-ec2b1e0cc2cd",
  verify:         "https://functions.poehali.dev/250f9167-baf5-4f6c-871a-3d7b82fe125b",
  cron:           "https://functions.poehali.dev/f6cb1b5e-a65d-4603-a0c2-d4d68994a775",
  support:        "https://functions.poehali.dev/478e3db7-0bb0-4726-871f-61f868a0aab8",
  "email-verify": "https://functions.poehali.dev/e51eefb2-b5c9-4c92-9e41-7f607402cfbd",
  oauth:          "https://functions.poehali.dev/928e63f8-0ef7-404d-a5c3-c7f9f291321f",
  monitor:        "https://functions.poehali.dev/9758e702-53a0-463c-937c-3749fca6454e",
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

  if (!res.ok) {
    if (base !== "monitor") {
      // Асинхронно отправляем событие в мониторинг (не блокируем основной поток)
      import("@/lib/errorMonitor").then(({ reportApiError }) => {
        reportApiError(path, res.status);
      }).catch(() => {});
    }
    throw { status: res.status, ...(data as object) };
  }
  return data as T;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

const api = {
  auth: { ... },
  emailVerify: {
    send: (email) => { ... },
    check: (email, code) => { ... }
  }, // запятая между блоками
  products: {
    list: (params) => { ... }
  }
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

export type ApiActiveDeposit = {
  id: string;
  amount: number;
  currency: string;
  requisiteName: string;
  requisiteDetails: string;
  status: "awaiting_payment" | "pending" | "confirmed" | "rejected" | "cancelled";
  expiresAt: string | null;
  requisite: ApiDepositRequisite | null;
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