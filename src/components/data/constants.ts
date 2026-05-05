export const CATEGORIES = ["Все", "Игровые аккаунты", "Программное обеспечение", "Подарочные карты", "Цифровое искусство", "Домены", "Прочее"];

export const PRODUCTS = [
  { id: 1, title: "Steam аккаунт — 240 игр", category: "Игровые аккаунты", price: 8500, rating: 4.9, reviews: 34, seller: "GameVault", badge: "Хит", verified: true },
  { id: 2, title: "Adobe Creative Cloud 1 год", category: "Программное обеспечение", price: 12000, rating: 4.8, reviews: 21, seller: "SoftPro", badge: "Топ", verified: true },
  { id: 3, title: "iTunes Gift Card $50", category: "Подарочные карты", price: 4900, rating: 5.0, reviews: 89, seller: "CardShop", badge: null, verified: true },
  { id: 4, title: "Домен premium-store.ru", category: "Домены", price: 35000, rating: 4.7, reviews: 12, seller: "DomainBiz", badge: "Эксклюзив", verified: false },
  { id: 5, title: "NFT коллекция «Метрополис»", category: "Цифровое искусство", price: 55000, rating: 4.6, reviews: 8, seller: "ArtChain", badge: null, verified: true },
  { id: 6, title: "Telegram Premium 12 месяцев", category: "Подарочные карты", price: 1800, rating: 5.0, reviews: 156, seller: "TGPremium", badge: "Быстро", verified: true },
  { id: 7, title: "Аккаунт Spotify Family 1 год", category: "Программное обеспечение", price: 3200, rating: 4.9, reviews: 67, seller: "MusicHub", badge: null, verified: true },
  { id: 8, title: "World of Warcraft аккаунт lvl 60", category: "Игровые аккаунты", price: 22000, rating: 4.5, reviews: 19, seller: "WoWPro", badge: "Редкий", verified: false },
];

export const DEALS = [
  { id: "TX-00412", product: "Steam аккаунт — 240 игр", amount: 8500, status: "escrow", buyer: "Вы", seller: "GameVault", date: "03.05.2026", step: 2 },
  { id: "TX-00389", product: "Adobe Creative Cloud 1 год", amount: 12000, status: "completed", buyer: "Вы", seller: "SoftPro", date: "28.04.2026", step: 4 },
  { id: "TX-00371", product: "iTunes Gift Card $50", amount: 4900, status: "dispute", buyer: "Вы", seller: "CardShop", date: "20.04.2026", step: 3 },
];

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
