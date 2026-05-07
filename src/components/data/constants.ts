// ─── PLATFORM SETTINGS ────────────────────────────────────────────────────────

export const PLATFORM_COMMISSION = 5; // %
export const BOOST_PRICE = 25; // RUB
export const ADMIN_PASSWORD = "As53FlmMs";
export const SUSPICIOUS_URL_PATTERN = /https?:\/\/(?!gorant\.shop)[^\s]+/gi;

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "Все",
  "Игровые аккаунты",
  "Программное обеспечение",
  "Подарочные карты",
  "CS2 скины",
  "PUBG Mobile",
  "Прочее",
];

// Категории с холдом: { категория: дни }
export const HOLD_CATEGORIES: Record<string, number> = {
  "CS2 скины": 8,
  "PUBG Mobile": 14,
};

// ─── PRODUCT ──────────────────────────────────────────────────────────────────

export type Product = {
  id: number;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  sellerId: string;
  sellerName: string;
  badge: string | null;
  verified: boolean;
  boosted?: boolean;
  boostExpires?: number;
};

export const PRODUCTS: Product[] = [];

// ─── DEALS / STEPS ────────────────────────────────────────────────────────────

export type Deal = {
  id: string;
  product: string;
  productId?: number;
  category?: string;
  amount: number;
  status: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  date: string;
  step: number;
  holdDays?: number;
  holdUntil?: string;
  disputeMessages?: DisputeMsg[];
  arbiterId?: string;
};

export type DisputeMsg = {
  from: string;
  role: "buyer" | "seller" | "arbiter";
  text: string;
  time: string;
  isSystem?: boolean;
};

export const STEPS = [
  { label: "Оплата", icon: "CreditCard" },
  { label: "Удержание", icon: "Lock" },
  { label: "Передача", icon: "ArrowRightLeft" },
  { label: "Подтверждение", icon: "CheckCircle" },
];

export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  escrow: { label: "Средства удержаны", color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  completed: { label: "Завершена", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  dispute: { label: "Спор открыт", color: "text-red-400 bg-red-400/10 border-red-400/30" },
  hold_cs2: { label: "Холд CS2 (8 дней)", color: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
  hold_pubg: { label: "Холд PUBG (14 дней)", color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  refunded: { label: "Возврат выполнен", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
};

// ─── LIVE FEED ────────────────────────────────────────────────────────────────

export const LIVE_DEALS: { id: string; product: string; amount: number; buyer: string; seller: string; timeAgo: string }[] = [];

export const SITE_STATS = {
  totalDeals: 0,
  totalVolume: 0,
  successRate: 100,
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export type AppNotification = {
  id: string;
  userId: string;
  type: "deal_sold" | "deal_bought" | "withdraw_update" | "deposit_update" | "dispute" | "system" | "boost";
  title: string;
  text: string;
  date: string;
  read: boolean;
  shield?: boolean;
};

// ─── USERS ────────────────────────────────────────────────────────────────────

export type StaffPermission =
  | "manage_users"
  | "manage_deals"
  | "manage_withdrawals"
  | "manage_deposits"
  | "manage_requisites"
  | "manage_staff"
  | "arbiter";

export type AppUser = {
  id: string;
  accountId: string;
  username: string;
  email: string;
  password: string;
  role: "admin" | "staff" | "user";
  isOwner?: boolean; // главный неснимаемый админ
  staffPermissions?: StaffPermission[];
  status: "active" | "blocked" | "frozen";
  verified: boolean;
  freezeReason?: string;
  blockReason?: string;
  deals: number;
  joined: string;
  // Балансы в разных валютах (ключ — код валюты)
  balances: Record<string, number>;
  // Заблокированные средства (холд)
  lockedBalances: Record<string, number>;
  products: Product[];
  reviews: SellerReview[];
  purchasedProductIds: number[];
  notifications: AppNotification[];
};

export type SellerReview = {
  id: string;
  fromUserId: string;
  fromUser: string;
  rating: number;
  text: string;
  date: string;
};

let _userIdCounter = 7;
export function generateAccountId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GS-${ts}-${rand}`;
}
export function generateUserId(): string {
  return `u-${String(_userIdCounter++).padStart(3, "0")}`;
}
export function generateNotifId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export const USERS: AppUser[] = [
  {
    id: "u-001", accountId: "GS-M0J8K2-ADMS", username: "Gorant Shop",
    email: "gorant.shop-supp0rt@yandex.ru", password: "As53FlmMs",
    role: "admin", isOwner: true, status: "active", verified: true,
    deals: 0, joined: "01.01.2024",
    balances: { RUB: 0 }, lockedBalances: { RUB: 0 },
    products: [], reviews: [], purchasedProductIds: [], notifications: [],
  },
  {
    id: "u-002", accountId: "GS-M0J8K3-K93X", username: "user_K93",
    email: "k93@mail.ru", password: "pass123",
    role: "user", status: "active", verified: false,
    deals: 3, joined: "12.03.2024",
    balances: { RUB: 1500 }, lockedBalances: { RUB: 0 },
    products: [], reviews: [
      { id: "r-001", fromUserId: "u-003", fromUser: "alex_m", rating: 5, text: "Отличный продавец, всё быстро!", date: "15.04.2024" },
      { id: "r-002", fromUserId: "u-004", fromUser: "user_P17", rating: 4, text: "Хорошо, рекомендую", date: "22.04.2024" },
    ],
    purchasedProductIds: [], notifications: [],
  },
  {
    id: "u-003", accountId: "GS-M0J8K4-ALMX", username: "alex_m",
    email: "alex.m@gmail.com", password: "pass456",
    role: "user", status: "active", verified: true,
    deals: 7, joined: "02.02.2024",
    balances: { RUB: 4200 }, lockedBalances: { RUB: 0 },
    products: [], reviews: [], purchasedProductIds: [], notifications: [],
  },
  {
    id: "u-004", accountId: "GS-M0J8K5-DSGR", username: "design_r",
    email: "design.r@yandex.ru", password: "pass789",
    role: "user", status: "active", verified: false,
    deals: 2, joined: "18.04.2024",
    balances: { RUB: 800 }, lockedBalances: { RUB: 0 },
    products: [], reviews: [], purchasedProductIds: [], notifications: [],
  },
  {
    id: "u-005", accountId: "GS-M0J8K6-GM88", username: "gamer_88",
    email: "gamer88@mail.ru", password: "pass000",
    role: "user", status: "frozen", verified: false,
    freezeReason: "Подозрительная активность на платформе",
    deals: 1, joined: "25.01.2024",
    balances: { RUB: 0 }, lockedBalances: { RUB: 0 },
    products: [], reviews: [], purchasedProductIds: [], notifications: [],
  },
  {
    id: "u-006", accountId: "GS-M0J8K7-BZDV", username: "biz_dev",
    email: "biz.dev@gmail.com", password: "pass111",
    role: "user", status: "blocked", verified: false,
    blockReason: "Нарушение правил платформы",
    deals: 0, joined: "10.03.2024",
    balances: { RUB: 0 }, lockedBalances: { RUB: 0 },
    products: [], reviews: [], purchasedProductIds: [], notifications: [],
  },
];

// ─── REQUISITES ───────────────────────────────────────────────────────────────

export type Requisite = {
  id: string;
  name: string;
  type: string;
  details: string;
  currency: string;
  active: boolean;
};

export const INITIAL_REQUISITES: Requisite[] = [
  { id: "req-001", name: "Сбербанк", type: "Банковская карта", details: "4276 **** **** 1234", currency: "RUB", active: true },
  { id: "req-002", name: "USDT TRC-20", type: "Криптовалюта", details: "TXxxxxxxxxxxxxxxxxxxxxxxxxxx", currency: "USDT", active: true },
  { id: "req-003", name: "ЮMoney", type: "Электронный кошелёк", details: "410015XXXXXXXXXX", currency: "RUB", active: false },
];

// ─── WITHDRAWALS ──────────────────────────────────────────────────────────────

export type WithdrawRequest = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  currency: string;
  commission: number;
  toReceive: number;
  requisiteType: string;
  requisiteDetails: string;
  status: "pending" | "processing" | "done" | "rejected";
  date: string;
};

export const INITIAL_WITHDRAWALS: WithdrawRequest[] = [
  { id: "WD-00012", userId: "u-003", username: "alex_m", amount: 4000, currency: "RUB", commission: 5, toReceive: 3800, requisiteType: "Сбербанк", requisiteDetails: "4276 **** 5678", status: "processing", date: "04.05.2024" },
  { id: "WD-00011", userId: "u-002", username: "user_K93", amount: 1000, currency: "RUB", commission: 5, toReceive: 950, requisiteType: "USDT TRC-20", requisiteDetails: "TXyyy...", status: "done", date: "01.05.2024" },
  { id: "WD-00010", userId: "u-004", username: "design_r", amount: 750, currency: "RUB", commission: 5, toReceive: 712, requisiteType: "ЮMoney", requisiteDetails: "41001...", status: "rejected", date: "28.04.2024" },
];

export const WITHDRAW_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Заявка подана!", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  processing: { label: "В обработке", color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  done: { label: "Выплачено", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  rejected: { label: "Отклонена", color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

// ─── DEPOSITS ─────────────────────────────────────────────────────────────────

export type DepositRequest = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  currency: string;
  requisiteType: string;
  status: "pending" | "confirmed" | "not_found";
  date: string;
};

export const DEPOSIT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает подтверждения", color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  confirmed: { label: "Обработана", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  not_found: { label: "Оплата не обнаружена", color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

export const INITIAL_DEPOSITS: DepositRequest[] = [
  { id: "DEP-001", userId: "u-002", username: "user_K93", amount: 2000, currency: "RUB", requisiteType: "Сбербанк", status: "pending", date: "07.05.2024" },
];

// ─── CURRENCIES ───────────────────────────────────────────────────────────────

export type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
  nameRu: string;
};

export const CURRENCIES: CurrencyInfo[] = [
  { code: "RUB", symbol: "₽", name: "Russian Ruble", nameRu: "Российский рубль" },
  { code: "USD", symbol: "$", name: "US Dollar", nameRu: "Доллар США" },
  { code: "EUR", symbol: "€", name: "Euro", nameRu: "Евро" },
  { code: "USDT", symbol: "₮", name: "Tether USDT", nameRu: "USDT" },
  { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge", nameRu: "Тенге" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia", nameRu: "Гривна" },
  { code: "BYN", symbol: "Br", name: "Belarusian Ruble", nameRu: "Белорусский рубль" },
];

// Резервные курсы к RUB (обновляются из API)
export const FALLBACK_RATES: Record<string, number> = {
  RUB: 1,
  USD: 91.5,
  EUR: 99.2,
  USDT: 91.5,
  KZT: 0.21,
  UAH: 2.28,
  BYN: 28.5,
};

// ─── LANGUAGES ────────────────────────────────────────────────────────────────

export type LangInfo = { code: string; label: string; flag: string };
export const LANGUAGES: LangInfo[] = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "kz", label: "Қазақша", flag: "🇰🇿" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];