export const CATEGORIES = ["Все", "Игровые аккаунты", "Программное обеспечение", "Подарочные карты", "Цифровое искусство", "Домены", "Прочее"];

export const PRODUCTS: {
  id: number; title: string; category: string; price: number;
  rating: number; reviews: number; seller: string; badge: string | null; verified: boolean;
}[] = [];

export const DEALS: {
  id: string; product: string; amount: number; status: string;
  buyer: string; seller: string; date: string; step: number;
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
  { id: "TX-00516", product: "CS2 аккаунт Prime", amount: 3800, buyer: "gamer_88", seller: "CSMarket", timeAgo: "48 мин назад" },
  { id: "TX-00515", product: "Домен shop-pro.ru", amount: 12000, buyer: "biz_dev", seller: "DomainPlus", timeAgo: "1 ч назад" },
  { id: "TX-00514", product: "YouTube Premium 1 год", amount: 1600, buyer: "user_T44", seller: "YTPro", timeAgo: "1 ч назад" },
];

// Статистика считается из LIVE_DEALS (все успешные)
export const SITE_STATS = {
  totalDeals: LIVE_DEALS.length,
  totalVolume: LIVE_DEALS.reduce((s, d) => s + d.amount, 0),
  successRate: 100,
};

// ─── USERS (для админ-панели) ─────────────────────────────────────────────────

export type AppUser = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "blocked" | "frozen";
  deals: number;
  joined: string;
};

export const USERS: AppUser[] = [
  { id: "u-001", username: "Slumon4ik", email: "slumon4ik@gorant.shop", role: "admin", status: "active", deals: 0, joined: "01.01.2026" },
  { id: "u-002", username: "user_K93", email: "k93@mail.ru", role: "user", status: "active", deals: 3, joined: "12.03.2026" },
  { id: "u-003", username: "alex_m", email: "alex.m@gmail.com", role: "user", status: "active", deals: 7, joined: "02.02.2026" },
  { id: "u-004", username: "design_r", email: "design.r@yandex.ru", role: "user", status: "active", deals: 2, joined: "18.04.2026" },
  { id: "u-005", username: "gamer_88", email: "gamer88@mail.ru", role: "user", status: "frozen", deals: 1, joined: "25.01.2026" },
  { id: "u-006", username: "biz_dev", email: "biz.dev@gmail.com", role: "user", status: "blocked", deals: 0, joined: "10.05.2026" },
];

export const ADMIN_PASSWORD = "gorant2026";
