import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── DATA ────────────────────────────────────────────────────────────────────

const CATEGORIES = ["Все", "Игровые аккаунты", "Программное обеспечение", "Подарочные карты", "Цифровое искусство", "Домены", "Прочее"];

const PRODUCTS = [
  { id: 1, title: "Steam аккаунт — 240 игр", category: "Игровые аккаунты", price: 8500, rating: 4.9, reviews: 34, seller: "GameVault", badge: "Хит", verified: true },
  { id: 2, title: "Adobe Creative Cloud 1 год", category: "Программное обеспечение", price: 12000, rating: 4.8, reviews: 21, seller: "SoftPro", badge: "Топ", verified: true },
  { id: 3, title: "iTunes Gift Card $50", category: "Подарочные карты", price: 4900, rating: 5.0, reviews: 89, seller: "CardShop", badge: null, verified: true },
  { id: 4, title: "Домен premium-store.ru", category: "Домены", price: 35000, rating: 4.7, reviews: 12, seller: "DomainBiz", badge: "Эксклюзив", verified: false },
  { id: 5, title: "NFT коллекция «Метрополис»", category: "Цифровое искусство", price: 55000, rating: 4.6, reviews: 8, seller: "ArtChain", badge: null, verified: true },
  { id: 6, title: "Telegram Premium 12 месяцев", category: "Подарочные карты", price: 1800, rating: 5.0, reviews: 156, seller: "TGPremium", badge: "Быстро", verified: true },
  { id: 7, title: "Аккаунт Spotify Family 1 год", category: "Программное обеспечение", price: 3200, rating: 4.9, reviews: 67, seller: "MusicHub", badge: null, verified: true },
  { id: 8, title: "World of Warcraft аккаунт lvl 60", category: "Игровые аккаунты", price: 22000, rating: 4.5, reviews: 19, seller: "WoWPro", badge: "Редкий", verified: false },
];

const DEALS = [
  { id: "TX-00412", product: "Steam аккаунт — 240 игр", amount: 8500, status: "escrow", buyer: "Вы", seller: "GameVault", date: "03.05.2026", step: 2 },
  { id: "TX-00389", product: "Adobe Creative Cloud 1 год", amount: 12000, status: "completed", buyer: "Вы", seller: "SoftPro", date: "28.04.2026", step: 4 },
  { id: "TX-00371", product: "iTunes Gift Card $50", amount: 4900, status: "dispute", buyer: "Вы", seller: "CardShop", date: "20.04.2026", step: 3 },
];

const STEPS = [
  { label: "Оплата", icon: "CreditCard" },
  { label: "Удержание", icon: "Lock" },
  { label: "Передача", icon: "ArrowRightLeft" },
  { label: "Подтверждение", icon: "CheckCircle" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  escrow: { label: "Средства удержаны", color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  completed: { label: "Завершена", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  dispute: { label: "Спор открыт", color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

// ─── NAV ─────────────────────────────────────────────────────────────────────

function Nav({ active, setActive }: { active: string; setActive: (s: string) => void }) {
  const links = [
    { id: "home", label: "Главная" },
    { id: "catalog", label: "Каталог" },
    { id: "deals", label: "Сделки" },
    { id: "escrow", label: "Гарантии" },
    { id: "support", label: "Поддержка" },
    { id: "about", label: "О платформе" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <button onClick={() => setActive("home")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-gold flex items-center justify-center">
            <Icon name="Shield" size={16} className="text-background" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-foreground">
            Trust<span className="text-gold">Ex</span>
          </span>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => setActive(l.id)}
              className={`px-3.5 py-2 text-sm font-medium rounded transition-colors ${
                active === l.id
                  ? "text-gold bg-gold/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActive("cabinet")}
            className="text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
          >
            <Icon name="User" size={15} className="mr-1.5" />
            Войти
          </Button>
          <Button
            size="sm"
            className="bg-gold text-background hover:bg-gold/90 font-bold"
            onClick={() => setActive("catalog")}
          >
            Начать сделку
          </Button>
        </div>
      </div>
    </nav>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function HomePage({ setActive }: { setActive: (s: string) => void }) {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden grid-pattern">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/80" />
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-20">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold/30 bg-gold/10 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span className="text-xs text-gold font-medium tracking-widest uppercase">Безопасные сделки</span>
            </div>

            <h1 className="font-display text-5xl lg:text-6xl font-extrabold leading-tight text-foreground mb-6">
              Эскроу для<br />
              <span className="text-gold">виртуальных</span><br />
              ценностей
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">
              Мы удерживаем средства до тех пор, пока обе стороны не подтвердят выполнение сделки.
              Ни продавец, ни покупатель не рискуют.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-gold text-background hover:bg-gold/90 font-bold px-8"
                onClick={() => setActive("catalog")}
              >
                Смотреть каталог
                <Icon name="ArrowRight" size={16} className="ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border hover:border-gold/50 font-semibold"
                onClick={() => setActive("escrow")}
              >
                Как работает эскроу
              </Button>
            </div>

            <div className="flex items-center gap-8 mt-12 pt-10 border-t border-border">
              {[["12 400+", "сделок закрыто"], ["₽ 2.8 млрд", "прошло через эскроу"], ["99.2%", "успешных сделок"]].map(([val, label]) => (
                <div key={label}>
                  <div className="font-display font-bold text-2xl text-gold">{val}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative rounded-xl overflow-hidden border border-border shadow-2xl">
              <img
                src="https://cdn.poehali.dev/projects/6d96cf49-c0b6-45ab-ab7b-3c1367bdc4ef/files/bce0a5a2-1308-44c6-9ead-cae738702db0.jpg"
                alt="TrustEx Escrow Platform"
                className="w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-surface border border-border rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                  <Icon name="ShieldCheck" size={20} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-display font-semibold">Сделка подтверждена</div>
                  <div className="text-xs text-muted-foreground">Steam аккаунт · ₽ 8 500</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl text-foreground mb-4">Как работает платформа</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Четыре простых шага — от открытия сделки до получения ценности
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-border to-transparent hidden md:block" />

            {[
              { step: "01", icon: "CreditCard", title: "Покупатель оплачивает", desc: "Деньги поступают на счёт эскроу, не продавцу" },
              { step: "02", icon: "Lock", title: "Средства удержаны", desc: "TrustEx блокирует сумму до завершения сделки" },
              { step: "03", icon: "ArrowRightLeft", title: "Передача товара", desc: "Продавец передаёт виртуальную ценность покупателю" },
              { step: "04", icon: "CheckCircle", title: "Оба подтверждают", desc: "После подтверждения обеими сторонами деньги переводятся продавцу" },
            ].map((s) => (
              <div key={s.step} className="relative bg-surface border border-border rounded-xl p-6 hover-scale">
                <span className="absolute top-4 right-4 text-4xl font-display font-black text-border">{s.step}</span>
                <div className="w-12 h-12 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                  <Icon name={s.icon} size={22} className="text-gold" />
                </div>
                <h3 className="font-display font-semibold text-sm text-foreground mb-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories preview */}
      <section className="py-20 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display font-bold text-3xl text-foreground mb-2">Популярные категории</h2>
              <p className="text-muted-foreground text-sm">Более 3 000 активных объявлений</p>
            </div>
            <Button variant="ghost" className="text-gold hover:text-gold/80 font-semibold" onClick={() => setActive("catalog")}>
              Весь каталог <Icon name="ArrowRight" size={14} className="ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: "Gamepad2", label: "Игровые\nаккаунты", count: 842 },
              { icon: "Monitor", label: "Программное\nобеспечение", count: 614 },
              { icon: "Gift", label: "Подарочные\nкарты", count: 1203 },
              { icon: "Palette", label: "Цифровое\nискусство", count: 189 },
              { icon: "Globe", label: "Домены", count: 267 },
              { icon: "MoreHorizontal", label: "Прочее", count: 431 },
            ].map((c) => (
              <button
                key={c.label}
                onClick={() => setActive("catalog")}
                className="flex flex-col items-center gap-3 p-5 rounded-xl bg-background border border-border hover:border-gold/40 hover:bg-gold/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                  <Icon name={c.icon} size={22} className="text-muted-foreground group-hover:text-gold transition-colors" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-display font-semibold text-foreground leading-tight whitespace-pre-line">{c.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c.count} лотов</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trust block */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-surface border border-gold/20 rounded-2xl p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full blur-[80px]" />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-14 h-14 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mb-6">
                  <Icon name="ShieldCheck" size={28} className="text-gold" />
                </div>
                <h2 className="font-display font-bold text-3xl text-foreground mb-4">
                  Гарантийная защита<br />каждой сделки
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Система эскроу гарантирует: продавец получит деньги только после подтверждения передачи товара.
                  Покупатель защищён от мошенничества на все 100%.
                </p>
                <Button
                  className="bg-gold text-background hover:bg-gold/90 font-semibold"
                  onClick={() => setActive("escrow")}
                >
                  Подробнее о гарантиях
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "Lock", title: "Удержание средств", desc: "Деньги заморожены до взаимного подтверждения" },
                  { icon: "Scale", title: "Разрешение споров", desc: "Независимая служба медиации при конфликтах" },
                  { icon: "Eye", title: "Прозрачность", desc: "Полная история статусов каждой транзакции" },
                  { icon: "Headphones", title: "Поддержка 24/7", desc: "Команда экспертов готова помочь в любое время" },
                ].map((f) => (
                  <div key={f.title} className="bg-background rounded-xl p-5 border border-border">
                    <Icon name={f.icon} size={20} className="text-gold mb-3" />
                    <div className="font-display font-semibold text-sm text-foreground mb-1">{f.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── CATALOG ─────────────────────────────────────────────────────────────────

function CatalogPage() {
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const filtered = PRODUCTS
    .filter((p) => category === "Все" || p.category === category)
    .filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !priceMax || p.price <= parseInt(priceMax));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-foreground mb-1">Каталог</h1>
        <p className="text-muted-foreground text-sm">{PRODUCTS.length} объявлений · все сделки защищены эскроу</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface border border-border rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border text-sm h-9"
          />
        </div>
        <Input
          placeholder="Цена до ₽"
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          type="number"
          className="w-36 bg-background border-border text-sm h-9"
        />
        <select className="h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground">
          <option>По популярности</option>
          <option>Цена: по возрастанию</option>
          <option>Цена: по убыванию</option>
          <option>По рейтингу</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              category === c
                ? "bg-gold text-background border-gold"
                : "bg-surface border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="SearchX" size={40} className="mx-auto mb-4 opacity-30" />
          <p>Ничего не найдено. Попробуйте изменить фильтры.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <div key={p.id} className="bg-surface border border-border rounded-xl overflow-hidden hover-scale group cursor-pointer">
              <div className="h-40 bg-gradient-to-br from-secondary to-background flex items-center justify-center relative">
                <Icon name="Package" size={40} className="text-border group-hover:text-gold/40 transition-colors" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-xs font-display font-bold px-2 py-0.5 rounded bg-gold text-background">
                    {p.badge}
                  </span>
                )}
                {p.verified && (
                  <span className="absolute top-3 right-3">
                    <Icon name="BadgeCheck" size={18} className="text-emerald-400" />
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{p.category}</p>
                <h3 className="font-display font-semibold text-sm text-foreground mb-3 leading-tight line-clamp-2">{p.title}</h3>
                <div className="flex items-center gap-1.5 mb-4">
                  <Icon name="Star" size={12} className="text-gold" />
                  <span className="text-xs text-foreground">{p.rating}</span>
                  <span className="text-xs text-muted-foreground">({p.reviews})</span>
                  <span className="ml-auto text-xs text-muted-foreground">{p.seller}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-lg text-foreground">
                    ₽ {p.price.toLocaleString("ru-RU")}
                  </span>
                  <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold text-xs h-7 px-3">
                    Купить
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CABINET ──────────────────────────────────────────────────────────────────

function CabinetPage() {
  const [role, setRole] = useState<"buyer" | "seller">("buyer");

  const buyerStats = [
    { icon: "ShoppingBag", label: "Всего покупок", value: "14" },
    { icon: "Lock", label: "В эскроу", value: "₽ 8 500" },
    { icon: "CheckCircle", label: "Закрыто сделок", value: "12" },
  ];

  const sellerStats = [
    { icon: "Package", label: "Активных лотов", value: "3" },
    { icon: "TrendingUp", label: "Выручка за месяц", value: "₽ 34 200" },
    { icon: "Star", label: "Рейтинг продавца", value: "4.9" },
  ];

  const stats = role === "buyer" ? buyerStats : sellerStats;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground mb-1">Личный кабинет</h1>
          <p className="text-muted-foreground text-sm">Алексей Морозов · a.morozov@mail.ru</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-surface border border-border rounded-lg">
          <button
            onClick={() => setRole("buyer")}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${role === "buyer" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Покупатель
          </button>
          <button
            onClick={() => setRole("seller")}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${role === "seller" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Продавец
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
            <Icon name={s.icon} size={20} className="text-gold mb-3" />
            <div className="font-display font-bold text-2xl text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="font-display font-semibold text-base text-foreground mb-5">Последние сделки</h2>
        <div className="space-y-3">
          {DEALS.map((d) => {
            const s = STATUS_MAP[d.status];
            return (
              <div key={d.id} className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-border/80 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Icon name="ShoppingCart" size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-sm text-foreground truncate">{d.product}</div>
                  <div className="text-xs text-muted-foreground">{d.id} · {d.date}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display font-bold text-sm text-foreground mb-1">₽ {d.amount.toLocaleString("ru-RU")}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── DEALS ────────────────────────────────────────────────────────────────────

function DealsPage() {
  const [selected, setSelected] = useState<typeof DEALS[0] | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <h1 className="font-display font-bold text-3xl text-foreground mb-2">История сделок</h1>
      <p className="text-muted-foreground text-sm mb-8">Текущий статус и история всех транзакций</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {DEALS.map((d) => {
            const s = STATUS_MAP[d.status];
            return (
              <div
                key={d.id}
                onClick={() => setSelected(d)}
                className={`bg-surface border rounded-xl p-5 cursor-pointer transition-all hover-scale ${
                  selected?.id === d.id ? "border-gold/50 bg-gold/5" : "border-border hover:border-border/80"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-display font-semibold text-sm text-foreground mb-0.5">{d.product}</div>
                    <div className="text-xs text-muted-foreground">ID: {d.id} · {d.date}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border flex-shrink-0 ml-4 ${s.color}`}>{s.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {STEPS.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-2 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        i < d.step ? "bg-gold text-background" : i === d.step ? "bg-gold/20 border border-gold/50 text-gold" : "bg-secondary text-muted-foreground"
                      }`}>
                        <Icon name={i < d.step ? "Check" : step.icon} size={11} />
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`h-px flex-1 ${i < d.step - 1 ? "bg-gold" : "bg-border"}`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {STEPS.map((step) => (
                    <span key={step.label} className="text-[9px] text-muted-foreground text-center w-1/4">{step.label}</span>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Продавец: <span className="text-foreground">{d.seller}</span></span>
                  <span className="font-display font-bold text-base text-gold">₽ {d.amount.toLocaleString("ru-RU")}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          {selected ? (
            <div className="bg-surface border border-gold/20 rounded-xl p-6 sticky top-24">
              <h3 className="font-display font-semibold text-base text-foreground mb-4">Детали сделки</h3>
              <div className="space-y-3 text-sm">
                {[
                  ["ID сделки", selected.id],
                  ["Товар", selected.product],
                  ["Продавец", selected.seller],
                  ["Покупатель", selected.buyer],
                  ["Дата", selected.date],
                  ["Сумма", `₽ ${selected.amount.toLocaleString("ru-RU")}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                {selected.status === "escrow" && (
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-semibold text-sm">
                    Подтвердить получение
                  </Button>
                )}
                {selected.status !== "completed" && (
                  <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground font-semibold text-sm">
                    Открыть спор
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-6 text-center">
              <Icon name="MousePointerClick" size={32} className="text-border mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Выберите сделку для просмотра деталей</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ESCROW ───────────────────────────────────────────────────────────────────

function EscrowPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-5">
          <Icon name="ShieldCheck" size={32} className="text-gold" />
        </div>
        <h1 className="font-display font-bold text-3xl text-foreground mb-3">Гарантийная защита TrustEx</h1>
        <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Система эскроу — это финансовый посредник, который гарантирует честность сделки для обеих сторон
        </p>
      </div>

      <div className="space-y-4 mb-12">
        {[
          {
            icon: "Lock",
            title: "Как работает удержание средств",
            body: "Когда покупатель оплачивает товар, деньги поступают на изолированный счёт эскроу TrustEx, а не напрямую продавцу. Средства остаются там до тех пор, пока обе стороны не подтвердят выполнение сделки.",
          },
          {
            icon: "CheckCircle",
            title: "Условия выплаты продавцу",
            body: "Деньги переводятся продавцу только после: (1) подтверждения получения товара покупателем, или (2) истечения 72 часов после передачи без возражений покупателя.",
          },
          {
            icon: "AlertTriangle",
            title: "Защита покупателя",
            body: "Если товар не соответствует описанию или не был передан, покупатель открывает спор в течение 72 часов. TrustEx изучает доказательства и принимает решение о возврате или выплате.",
          },
          {
            icon: "Scale",
            title: "Разрешение споров",
            body: "Служба медиации TrustEx рассматривает каждый случай индивидуально. Средний срок рассмотрения — 3 рабочих дня. В 94% споров достигается взаимоприемлемое решение без судебных разбирательств.",
          },
        ].map((item) => (
          <div key={item.title} className="bg-surface border border-border rounded-xl p-6 flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <Icon name={item.icon} size={22} className="text-gold" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gold/10 border border-gold/25 rounded-2xl p-8 text-center">
        <h3 className="font-display font-bold text-xl text-foreground mb-2">Комиссия платформы</h3>
        <div className="flex items-baseline justify-center gap-1 my-4">
          <span className="font-display font-black text-5xl text-gold">2%</span>
          <span className="text-muted-foreground">от суммы сделки</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Комиссия взимается только при успешном завершении сделки. Никаких скрытых платежей или абонентской платы.
        </p>
      </div>
    </div>
  );
}

// ─── SUPPORT ──────────────────────────────────────────────────────────────────

function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <h1 className="font-display font-bold text-3xl text-foreground mb-2">Служба поддержки</h1>
      <p className="text-muted-foreground text-sm mb-10">Мы на связи 24/7 для решения любых вопросов</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {[
          { icon: "MessageCircle", title: "Онлайн-чат", desc: "Ответ за 2 минуты в рабочее время", action: "Открыть чат" },
          { icon: "Mail", title: "Электронная почта", desc: "support@trustex.ru · ответ до 24 часов", action: "Написать" },
          { icon: "Phone", title: "Телефон", desc: "8 (800) 555-00-12 · Пн–Пт 9:00–20:00", action: "Позвонить" },
        ].map((c) => (
          <div key={c.title} className="bg-surface border border-border rounded-xl p-6 flex flex-col hover-scale">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
              <Icon name={c.icon} size={22} className="text-gold" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground mb-1">{c.title}</h3>
            <p className="text-xs text-muted-foreground mb-5 flex-1">{c.desc}</p>
            <Button variant="outline" size="sm" className="border-border hover:border-gold/40 font-semibold text-xs">
              {c.action}
            </Button>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="font-display font-semibold text-base text-foreground mb-5">Часто задаваемые вопросы</h2>
        <div className="space-y-3">
          {[
            { q: "Сколько времени занимает проверка сделки?", a: "Стандартная проверка занимает до 30 минут. Для крупных сделок (от ₽ 50 000) — до 2 рабочих часов." },
            { q: "Что делать, если продавец исчез после оплаты?", a: "Откройте спор в разделе «Сделки» в течение 72 часов. Средства будут возвращены вам после проверки." },
            { q: "Можно ли отменить сделку?", a: "Да, до момента передачи товара обе стороны могут отменить сделку по взаимному согласию. Деньги возвращаются покупателю в течение 1 рабочего дня." },
            { q: "Какие способы оплаты поддерживаются?", a: "Банковские карты Visa/MasterCard/МИР, СБП, ЮMoney, USDT (TRC-20, ERC-20)." },
          ].map((faq, i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <span className="font-display font-semibold text-sm text-foreground">{faq.q}</span>
                  <Icon name="ChevronDown" size={16} className="text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {faq.a}
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ABOUT ────────────────────────────────────────────────────────────────────

function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-12">
        <h1 className="font-display font-bold text-3xl text-foreground mb-3">О платформе TrustEx</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          TrustEx — специализированная платформа для безопасных сделок с виртуальными ценностями.
          Основана в 2021 году командой финтех-экспертов с целью устранить мошенничество в сфере цифровых активов.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          ["2021", "год основания"],
          ["12 400+", "сделок закрыто"],
          ["98 стран", "пользователей"],
          ["24/7", "поддержка"],
        ].map(([v, l]) => (
          <div key={l} className="bg-surface border border-border rounded-xl p-5 text-center">
            <div className="font-display font-bold text-2xl text-gold mb-1">{v}</div>
            <div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6 mb-12">
        {[
          {
            title: "Условия использования",
            icon: "FileText",
            items: [
              "Минимальная сумма сделки: ₽ 500",
              "Комиссия платформы: 2% от суммы (не менее ₽ 50)",
              "Срок удержания средств: до подтверждения обеими сторонами или 72 часа",
              "Лимит одной сделки без верификации: ₽ 100 000",
              "Верифицированные аккаунты: лимит ₽ 5 000 000",
            ],
          },
          {
            title: "Конфиденциальность",
            icon: "Eye",
            items: [
              "Персональные данные хранятся на серверах в РФ (ФЗ-152)",
              "Данные платёжных карт не хранятся — используется токенизация",
              "История сделок хранится 5 лет согласно требованиям ЦБ РФ",
              "Передача данных третьим лицам: только по законному запросу органов",
            ],
          },
        ].map((section) => (
          <div key={section.title} className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Icon name={section.icon} size={18} className="text-gold" />
              <h2 className="font-display font-semibold text-base text-foreground">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Icon name="ChevronRight" size={14} className="text-gold flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function Footer({ setActive }: { setActive: (s: string) => void }) {
  return (
    <footer className="border-t border-border bg-surface mt-10">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <button onClick={() => setActive("home")} className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-sm bg-gold flex items-center justify-center">
                <Icon name="Shield" size={16} className="text-background" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">
                Trust<span className="text-gold">Ex</span>
              </span>
            </button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Безопасные сделки с виртуальными ценностями. Ваши деньги под защитой.
            </p>
          </div>
          {[
            { title: "Платформа", links: [["Каталог", "catalog"], ["Как работает", "escrow"], ["О нас", "about"]] },
            { title: "Аккаунт", links: [["Войти / Регистрация", "cabinet"], ["Мои сделки", "deals"], ["Продать", "cabinet"]] },
            { title: "Поддержка", links: [["Центр помощи", "support"], ["Разрешение споров", "support"], ["Связаться с нами", "support"]] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-widest mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(([label, pg]) => (
                  <li key={label}>
                    <button onClick={() => setActive(pg)} className="text-sm text-muted-foreground hover:text-gold transition-colors">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 TrustEx. Все права защищены.</p>
          <p className="text-xs text-muted-foreground">ИНН 7701234567 · ООО «ТрастЭкс» · Москва</p>
        </div>
      </div>
    </footer>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const [page, setPage] = useState("home");

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setActive={setPage} />;
      case "catalog": return <CatalogPage />;
      case "cabinet": return <CabinetPage />;
      case "deals": return <DealsPage />;
      case "escrow": return <EscrowPage />;
      case "support": return <SupportPage />;
      case "about": return <AboutPage />;
      default: return <HomePage setActive={setPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav active={page} setActive={setPage} />
      <main className="pt-16">
        {renderPage()}
      </main>
      <Footer setActive={setPage} />
    </div>
  );
}