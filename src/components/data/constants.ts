export const CATEGORIES = ["Все", "Игровые аккаунты", "Программное обеспечение", "Подарочные карты", "Цифровое искусство", "Домены", "CS2 скины", "Прочее"];

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export type Product = {
  id: number; title: string; category: string; price: number;
  rating: number; reviews: number; sellerId: string; sellerName: string;
  badge: string | null; verified: boolean;
};

export const PRODUCTS: Product[] = [];

// ─── DEALS ────────────────────────────────────────────────────────────────────

export const DEALS: {
  id: string; product: string; amount: number; status: string;
  buyer: string; seller: string; date: string; step: number;
  isCS2?: boolean; holdUntil?: string;
}[] = [];

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
};

// ─── LIVE FEED ────────────────────────────────────────────────────────────────

export const LIVE_DEALS: {
  id: string; product: string; amount: number; buyer: string; seller: string; timeAgo: string;
}[] = [
  { id: "TX-00521", product: "Steam аккаунт — 150 игр", amount: 5200, buyer: "user_K93", seller: "GameHub", timeAgo: "2 мин назад" },
  { id: "TX-00520", product: "Telegram Premium 6 мес", amount: 950, buyer: "alex_m", seller: "TGPro", timeAgo: "7 мин назад" },
  { id: "TX-00519", product: "Adobe Photoshop 1 год", amount: 8400, buyer: "design_r", seller: "SoftBase", timeAgo: "14 мин назад" },
  { id: "TX-00518", product: "iTunes Gift Card $25", amount: 2300, buyer: "user_P17", seller: "CardHub", timeAgo: "21 мин назад" },
  { id: "TX-00517", product: "Spotify Premium 3 мес", amount: 1100, buyer: "music_fan", seller: "MusicDeal", timeAgo: "35 мин назад" },
  { id: "TX-00516", product: "CS2 скин AK-47 Redline", amount: 3800, buyer: "gamer_88", seller: "CSMarket", timeAgo: "48 мин назад" },
  { id: "TX-00515", product: "Домен shop-pro.ru", amount: 12000, buyer: "biz_dev", seller: "DomainPlus", timeAgo: "1 ч назад" },
  { id: "TX-00514", product: "YouTube Premium 1 год", amount: 1600, buyer: "user_T44", seller: "YTPro", timeAgo: "1 ч назад" },
];

export const SITE_STATS = {
  totalDeals: LIVE_DEALS.length,
  totalVolume: LIVE_DEALS.reduce((s, d) => s + d.amount, 0),
  successRate: 100,
};

// ─── USERS ────────────────────────────────────────────────────────────────────

export type AppUser = {
  id: string;
  accountId: string;
  username: string;
  email: string;
  password: string;
  role: "admin" | "user";
  status: "active" | "blocked" | "frozen";
  freezeReason?: string;
  blockReason?: string;
  deals: number;
  joined: string;
  balance: number;
  products: Product[];
  reviews: SellerReview[];
};

export type SellerReview = {
  id: string;
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

export const USERS: AppUser[] = [
  {
    id: "u-001", accountId: "GS-M0J8K2-ADMS", username: "Slumon4ik",
    email: "slumon4ik@gorant.shop", password: "gorant2026",
    role: "admin", status: "active", deals: 0, joined: "01.01.2024", balance: 0,
    products: [], reviews: [],
  },
  {
    id: "u-002", accountId: "GS-M0J8K3-K93X", username: "user_K93",
    email: "k93@mail.ru", password: "pass123",
    role: "user", status: "active", deals: 3, joined: "12.03.2024", balance: 1500,
    products: [], reviews: [
      { id: "r-001", fromUser: "alex_m", rating: 5, text: "Отличный продавец, всё быстро!", date: "15.04.2024" },
      { id: "r-002", fromUser: "user_P17", rating: 4, text: "Хорошо, рекомендую", date: "22.04.2024" },
    ],
  },
  {
    id: "u-003", accountId: "GS-M0J8K4-ALMX", username: "alex_m",
    email: "alex.m@gmail.com", password: "pass456",
    role: "user", status: "active", deals: 7, joined: "02.02.2024", balance: 4200,
    products: [], reviews: [],
  },
  {
    id: "u-004", accountId: "GS-M0J8K5-DSGR", username: "design_r",
    email: "design.r@yandex.ru", password: "pass789",
    role: "user", status: "active", deals: 2, joined: "18.04.2024", balance: 800,
    products: [], reviews: [],
  },
  {
    id: "u-005", accountId: "GS-M0J8K6-GM88", username: "gamer_88",
    email: "gamer88@mail.ru", password: "pass000",
    role: "user", status: "frozen", freezeReason: "Подозрительная активность на платформе",
    deals: 1, joined: "25.01.2024", balance: 0,
    products: [], reviews: [],
  },
  {
    id: "u-006", accountId: "GS-M0J8K7-BZDV", username: "biz_dev",
    email: "biz.dev@gmail.com", password: "pass111",
    role: "user", status: "blocked", blockReason: "Нарушение правил платформы",
    deals: 0, joined: "10.03.2024", balance: 0,
    products: [], reviews: [],
  },
];

// ─── РЕКВИЗИТЫ ────────────────────────────────────────────────────────────────

export type Requisite = {
  id: string;
  name: string;
  type: string;
  details: string;
  active: boolean;
};

export const INITIAL_REQUISITES: Requisite[] = [
  { id: "req-001", name: "Сбербанк", type: "Банковская карта", details: "4276 **** **** 1234", active: true },
  { id: "req-002", name: "USDT TRC-20", type: "Криптовалюта", details: "TXxxxxxxxxxxxxxxxxxxxxxxxxxx", active: true },
  { id: "req-003", name: "ЮMoney", type: "Электронный кошелёк", details: "410015XXXXXXXXXX", active: false },
];

// ─── ЗАЯВКИ НА ВЫВОД ──────────────────────────────────────────────────────────

export type WithdrawRequest = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  commission: number;
  requisiteType: string;
  requisiteDetails: string;
  status: "pending" | "processing" | "done" | "rejected";
  date: string;
};

export const INITIAL_WITHDRAWALS: WithdrawRequest[] = [
  { id: "WD-00012", userId: "u-003", username: "alex_m", amount: 4000, commission: 5, requisiteType: "Сбербанк", requisiteDetails: "4276 **** 5678", status: "processing", date: "04.05.2024" },
  { id: "WD-00011", userId: "u-002", username: "user_K93", amount: 1000, commission: 5, requisiteType: "USDT TRC-20", requisiteDetails: "TXyyy...", status: "done", date: "01.05.2024" },
  { id: "WD-00010", userId: "u-004", username: "design_r", amount: 750, commission: 5, requisiteType: "ЮMoney", requisiteDetails: "41001...", status: "rejected", date: "28.04.2024" },
];

export const WITHDRAW_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Заявка подана!", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  processing: { label: "В обработке", color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  done: { label: "Выплачено", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  rejected: { label: "Отклонена", color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

export const ADMIN_PASSWORD = "gorant2026";
