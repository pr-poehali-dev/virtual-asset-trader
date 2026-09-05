import { useState, useEffect, type CSSProperties } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PLATFORM_COMMISSION,
  BOOST_PRICE,
  SUSPICIOUS_URL_PATTERN,
} from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import type { AppProduct } from "@/context/AuthContext";
import { api } from "@/api/client";
import { BigSpendVerifyModal } from "@/components/ui/big-spend-modal";
import { BuyContactModal } from "@/components/ui/buy-contact-modal";
import { getCategoryGlow } from "@/components/data/backgroundPalette";
import { PublicTeamSection } from "@/components/pages/PublicTeam";

// ─── LIVE FEED ────────────────────────────────────────────────────────────────

type LiveDeal = { id: string; product: string; amount: number; buyer: string; seller: string; timeAgo: string };

function LiveFeed() {
  const { format } = useCurrency();
  const [deals, setDeals] = useState<LiveDeal[]>([]);

  useEffect(() => {
    const load = () => {
      api.deals.list().then(({ deals: list }) => {
        const closed = list
          .filter((d: { status: string }) => d.status === "completed" || d.status === "refunded")
          .slice(0, 8)
          .map((d: { id: string; productName?: string; product?: string; amount: number; buyerName?: string; sellerName?: string; date?: string }) => ({
            id: d.id,
            product: d.productName ?? d.product ?? "Товар",
            amount: d.amount,
            buyer: d.buyerName ?? "—",
            seller: d.sellerName ?? "—",
            timeAgo: d.date ?? "",
          }));
        setDeals(closed);
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="font-display font-bold text-xl text-foreground">
            Последние закрытые сделки
          </h2>
          <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium">
            Live
          </span>
        </div>
        {deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
              <Icon name="Clock" size={22} className="text-emerald-400 opacity-60" />
            </div>
            <p className="text-sm text-muted-foreground">Первые сделки появятся здесь в режиме реального времени</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deals.map((d, i) => (
              <div
                key={d.id}
                className={`flex items-center gap-4 p-4 rounded-xl border bg-surface transition-all duration-500 ${
                  i === 0 ? "border-emerald-400/30 bg-emerald-400/5" : "border-border"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="CheckCircle" size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-display font-semibold text-sm text-foreground">
                    {d.product}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {d.buyer} ← {d.seller}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display font-bold text-sm text-gold">{format(d.amount)}</div>
                  {d.timeAgo && <div className="text-[10px] text-muted-foreground">{d.timeAgo}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

export function HomePage({ setActive }: { setActive: (s: string) => void }) {
  const { users } = useAuth();
  const { format } = useCurrency();
  const registeredCount = users.length;
  const [stats, setStats] = useState({ totalDeals: 0, totalVolume: 0 });

  useEffect(() => {
    api.deals.list().then(({ deals: list }) => {
      const closed = list.filter((d: { status: string }) => d.status === "completed" || d.status === "refunded");
      setStats({
        totalDeals: closed.length,
        totalVolume: closed.reduce((s: number, d: { amount: number }) => s + d.amount, 0),
      });
    }).catch(() => {});
  }, []);

  const DISPLAY_CATEGORIES = [
    { icon: "Gamepad2", label: "Игровые аккаунты" },
    { icon: "Monitor", label: "Программное обеспечение" },
    { icon: "Gift", label: "Подарочные карты" },
    { icon: "Sword", label: "CS2 скины" },
    { icon: "Crosshair", label: "PUBG Mobile akk" },
    { icon: "Star", label: "Прочее" },
    { icon: "Plus", label: "Добавить товар", action: "add-product" },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative min-h-[85vh] sm:min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-background/78 to-background/88" />
        <div className="absolute top-1/3 right-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-gold/5 blur-[80px] sm:blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center py-10 sm:py-16 lg:py-20 w-full">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold/30 bg-gold/10 mb-5 sm:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span className="text-xs text-gold font-medium tracking-widest uppercase">Безопасные сделки</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground mb-4 sm:mb-6">
              Эскроу для
              <br />
              <span className="text-gold">виртуальных</span>
              <br />
              ценностей
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-7 sm:mb-10 max-w-lg">
              Мы удерживаем средства до подтверждения получения покупателем или 72 часа.
              Комиссия — {PLATFORM_COMMISSION}%.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                size="lg"
                className="bg-gold text-background hover:bg-gold/90 font-bold px-6 sm:px-8 w-full sm:w-auto"
                onClick={() => setActive("catalog")}
              >
                Смотреть каталог
                <Icon name="ArrowRight" size={16} className="ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border hover:border-gold/50 font-semibold w-full sm:w-auto"
                onClick={() => setActive("escrow")}
              >
                Как работает эскроу
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12 pt-6 sm:pt-10 border-t border-border">
              {[
                [stats.totalDeals > 0 ? String(stats.totalDeals) : "—", "сделок закрыто"],
                [stats.totalVolume > 0 ? format(stats.totalVolume) : "—", "продано"],
                [String(registeredCount), "пользователей"],
              ].map(([val, label]) => (
                <div key={label}>
                  <div className="font-display font-bold text-xl sm:text-2xl text-gold">{val}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image — desktop only */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-xl overflow-hidden border border-border shadow-2xl">
              <img
                src="https://cdn.poehali.dev/projects/6d96cf49-c0b6-45ab-ab7b-3c1367bdc4ef/files/b2e71b64-eb36-4653-b580-f2a304a41993.jpg"
                alt="Gorant Shop"
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
                  <div className="text-xs text-muted-foreground">CS2 скин · {format(3800)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live feed */}
      <LiveFeed />

      {/* Team */}
      <PublicTeamSection />

      {/* How it works */}
      <section className="py-14 sm:py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-3 sm:mb-4">
              Как работает платформа
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Четыре простых шага — от открытия сделки до получения ценности
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 relative">
            <div className="absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-border to-transparent hidden md:block" />
            {[
              {
                step: "01",
                icon: "CreditCard",
                title: "Покупатель оплачивает",
                desc: "Деньги поступают на счёт эскроу, не продавцу",
              },
              {
                step: "02",
                icon: "Lock",
                title: "Средства удержаны",
                desc: "Gorant Shop блокирует сумму до завершения сделки",
              },
              {
                step: "03",
                icon: "ArrowRightLeft",
                title: "Передача товара",
                desc: "Продавец передаёт виртуальную ценность покупателю",
              },
              {
                step: "04",
                icon: "CheckCircle",
                title: "Оба подтверждают",
                desc: "После подтверждения деньги переводятся продавцу",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative bg-surface border border-border rounded-xl p-4 sm:p-6 hover:border-gold/30 transition-colors"
              >
                <span className="absolute top-3 right-3 text-2xl sm:text-4xl font-display font-black text-border">
                  {s.step}
                </span>
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-3 sm:mb-4">
                  <Icon name={s.icon} size={18} className="text-gold" />
                </div>
                <h3 className="font-display font-semibold text-xs sm:text-sm text-foreground mb-1 sm:mb-2">
                  {s.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed hidden sm:block">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 sm:py-20 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-7 sm:mb-12">
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-1 sm:mb-2">
                Популярные категории
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">Добавляйте объявления в каталог</p>
            </div>
            <Button
              variant="ghost"
              className="text-gold hover:text-gold/80 font-semibold text-xs sm:text-sm"
              onClick={() => setActive("catalog")}
            >
              Весь каталог <Icon name="ArrowRight" size={14} className="ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
            {DISPLAY_CATEGORIES.map((c) => (
              <button
                key={c.label}
                onClick={() => setActive(c.action ?? "catalog")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background border border-border hover:border-gold/40 hover:bg-gold/5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                  <Icon
                    name={c.icon}
                    size={18}
                    className="text-muted-foreground group-hover:text-gold transition-colors"
                  />
                </div>
                <div className="text-[10px] font-display font-semibold text-foreground text-center leading-tight">
                  {c.label}
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
                  Гарантийная защита каждой сделки
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Система эскроу гарантирует: продавец получит деньги только после подтверждения
                  передачи товара. Комиссия — {PLATFORM_COMMISSION}%, поднятие в ТОП — ₽{BOOST_PRICE}.
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
                  {
                    icon: "Lock",
                    title: "Удержание средств",
                    desc: "Деньги заморожены до взаимного подтверждения",
                  },
                  { icon: "Scale", title: "Разрешение споров", desc: "Независимая служба медиации" },
                  { icon: "Eye", title: "Прозрачность", desc: "Полная история статусов сделки" },
                  { icon: "Headphones", title: "Поддержка 24/7", desc: "Команда экспертов готова помочь" },
                ].map((f) => (
                  <div key={f.title} className="bg-background rounded-xl p-5 border border-border">
                    <Icon name={f.icon} size={20} className="text-gold mb-3" />
                    <div className="font-display font-semibold text-sm text-foreground mb-1">
                      {f.title}
                    </div>
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

// ─── ADD PRODUCT PAGE ─────────────────────────────────────────────────────────

export function AddProductPage({ setActive }: { setActive: (s: string) => void }) {
  const { user, addProduct } = useAuth();
  const [categories, setCategories] = useState<{ name: string; unitLabel: string; holdDays: number }[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [desc, setDesc] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.products.categories().then(({ categories: list }) => {
      setCategories(list);
      if (list.length > 0) setCategory((prev) => prev || list[0].name);
    }).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center animate-fade-in">
        <Icon name="LogIn" size={40} className="mx-auto mb-4 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground mb-4">Войдите, чтобы разместить объявление</p>
        <Button
          className="bg-gold text-background hover:bg-gold/90 font-semibold"
          onClick={() => setActive("login")}
        >
          Войти
        </Button>
      </div>
    );
  }

  const currentCat = categories.find((c) => c.name === category);
  const holdDays = currentCat?.holdDays ?? 0;
  const unitLabel = currentCat?.unitLabel ?? "шт";

  const handleSubmit = () => {
    setError("");
    if (!title.trim()) {
      setError("Введите название товара");
      return;
    }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setError("Введите корректную цену");
      return;
    }
    const stockNum = parseInt(stock, 10);
    if (!stock || isNaN(stockNum) || stockNum <= 0) {
      setError("Введите корректное количество в наличии");
      return;
    }
    const p: AppProduct & { stock: number } = {
      id: Date.now(),
      title: title.trim(),
      category,
      price: Math.round(priceNum),
      stock: stockNum,
      rating: 0,
      reviews: 0,
      sellerId: user.id,
      sellerName: user.username,
      badge: null,
      boosted: false,
      verified: user.verified,
    };
    addProduct(p);
    setSuccess(true);
    setTitle("");
    setPrice("");
    setStock("1");
    setDesc("");
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      <button
        onClick={() => setActive("catalog")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <Icon name="ArrowLeft" size={14} />
        Назад
      </button>
      <h1 className="font-display font-bold text-2xl text-foreground mb-8">
        Разместить объявление
      </h1>

      {success && (
        <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Icon name="CheckCircle" size={18} className="text-emerald-400" />
          <div>
            <span className="text-sm text-emerald-400 font-semibold block">
              Объявление успешно опубликовано!
            </span>
            <span className="text-xs text-emerald-400/70">
              Товар появился на странице продавца и в каталоге.
            </span>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
            Название товара *
          </label>
          <Input
            placeholder="Например: Steam аккаунт — 200 игр"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSuccess(false);
              setError("");
            }}
            className="bg-background border-border text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Категория
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSuccess(false);
              }}
              className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
            >
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Цена за {unitLabel} (₽) *
            </label>
            <Input
              placeholder="5000"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setSuccess(false);
                setError("");
              }}
              type="number"
              min="1"
              className="bg-background border-border text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
            Количество в наличии ({unitLabel}) *
          </label>
          <Input
            placeholder="Например: 100"
            value={stock}
            onChange={(e) => {
              setStock(e.target.value);
              setSuccess(false);
              setError("");
            }}
            type="number"
            min="1"
            className="bg-background border-border text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Покупатель сможет указать, сколько {unitLabel} он хочет купить — не больше, чем есть в наличии.
          </p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
            Описание
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Подробное описание товара..."
            className="w-full h-24 px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-gold/50"
          />
        </div>

        {/* Hold warning */}
        {holdDays > 0 && (
          <div className="bg-purple-400/10 border border-purple-400/20 rounded-xl p-4 flex items-start gap-3">
            <Icon name="Clock" size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-400">
              <span className="font-bold">Холд {holdDays} дней: </span>
              Сразу после покупки этой категории средства будут удержаны на {holdDays} дней
              перед выплатой продавцу — независимо от подтверждения получения.
            </p>
          </div>
        )}

        {/* Commission info */}
        {price && parseFloat(price) > 0 && (
          <div className="bg-background border border-border rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Цена товара</span>
              <span>₽ {parseFloat(price).toLocaleString("ru-RU")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Комиссия платформы ({PLATFORM_COMMISSION}%)</span>
              <span className="text-red-400">
                - ₽{" "}
                {Math.round(parseFloat(price) * (PLATFORM_COMMISSION / 100)).toLocaleString("ru-RU")}
              </span>
            </div>
            {holdDays && (
              <div className="flex justify-between text-muted-foreground">
                <span>Холд после продажи</span>
                <span className="text-amber-400">{holdDays} дней</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
              <span>Вы получите</span>
              <span className="text-gold">
                ₽{" "}
                {Math.round(
                  parseFloat(price) * (1 - PLATFORM_COMMISSION / 100)
                ).toLocaleString("ru-RU")}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <Icon name="AlertCircle" size={12} />
            {error}
          </p>
        )}

        <Button
          className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
          onClick={handleSubmit}
        >
          <Icon name="Upload" size={15} className="mr-2" />
          Опубликовать объявление
        </Button>
      </div>
    </div>
  );
}

// ─── CATALOG PAGE ─────────────────────────────────────────────────────────────

type BuyResult = "ok" | "no_balance" | "self" | "verify_required" | "not_enough_stock" | "contact_required" | null;

export function CatalogPage({ setActive }: { setActive: (s: string) => void }) {
  const { user: me, buyProduct, boostProduct } = useAuth();
  const { format } = useCurrency();

  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [allProducts, setAllProducts] = useState<AppProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<{ name: string; unitLabel: string; holdDays: number }[]>([]);

  // AI bot state
  const [botWarning, setBotWarning] = useState(false);
  const [botExpanded, setBotExpanded] = useState(true);

  // Buy feedback per product id
  const [buyResult, setBuyResult] = useState<Record<number, BuyResult>>({});
  const [boostResult, setBoostResult] = useState<Record<number, string>>({});
  const [pendingBuy, setPendingBuy] = useState<AppProduct | null>(null);
  const [buyQuantity, setBuyQuantity] = useState<Record<number, number>>({});
  const [contactModalProduct, setContactModalProduct] = useState<AppProduct | null>(null);
  const [contactModalLoading, setContactModalLoading] = useState(false);
  const [contactModalError, setContactModalError] = useState("");
  const [pendingBuyContact, setPendingBuyContact] = useState("");

  // Загружаем товары и категории из API
  useEffect(() => {
    setLoadingProducts(true);
    api.products.list()
      .then(({ products }) => setAllProducts(products as AppProduct[]))
      .catch(() => setAllProducts([]))
      .finally(() => setLoadingProducts(false));
    api.products.categories().then(({ categories: list }) => setCategories(list)).catch(() => {});
  }, []);

  const filtered = allProducts
    .filter((p) => category === "Все" || p.category === category)
    .filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !priceMax || p.price <= parseFloat(priceMax));

  // Top categories by product count
  const categoryCounts = categories.map((c) => ({
    cat: c.name,
    count: allProducts.filter((p) => p.category === c.name).length,
  }));
  const topCategories = [...categoryCounts].sort((a, b) => b.count - a.count).slice(0, 4);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    SUSPICIOUS_URL_PATTERN.lastIndex = 0;
    setBotWarning(SUSPICIOUS_URL_PATTERN.test(val));
  };

  const handleBuy = (product: AppProduct) => {
    if (!me) {
      setActive("login");
      return;
    }
    setContactModalError("");
    setContactModalProduct(product);
  };

  const handleConfirmBuy = async (contact: string) => {
    const product = contactModalProduct;
    if (!product) return;
    setContactModalLoading(true);
    setContactModalError("");
    const quantity = Math.max(1, buyQuantity[product.id] ?? 1);
    const fakeSellerUser = { id: product.sellerId } as import("@/context/AuthContext").AppUser;
    const result = await buyProduct(product, fakeSellerUser, quantity, contact);
    setContactModalLoading(false);
    if (result === "verify_required") {
      setContactModalProduct(null);
      setPendingBuyContact(contact);
      setPendingBuy(product);
      return;
    }
    if (result === "contact_required") {
      setContactModalError("Укажите контакт для передачи товара");
      return;
    }
    setContactModalProduct(null);
    setBuyResult((prev) => ({ ...prev, [product.id]: result }));
    setTimeout(() => {
      setBuyResult((prev) => ({ ...prev, [product.id]: null }));
    }, 4000);
    if (result === "ok") {
      // Обновляем список товаров
      api.products.list().then(({ products }) => setAllProducts(products as AppProduct[])).catch(() => {});
    }
  };

  const handleBoost = async (productId: number) => {
    const result = await boostProduct(productId);
    setBoostResult((prev) => ({ ...prev, [productId]: result }));
    setTimeout(() => {
      setBoostResult((prev) => ({ ...prev, [productId]: "" }));
    }, 3000);
    if (result === "ok") {
      api.products.list().then(({ products }) => setAllProducts(products as AppProduct[])).catch(() => {});
    }
  };

  const getCategoryIcon = (cat: string) => {
    const map: Record<string, string> = {
      "Игровые аккаунты": "Gamepad2",
      "Программное обеспечение": "Monitor",
      "Подарочные карты": "Gift",
      "CS2 скины": "Sword",
      "PUBG Mobile akk": "Crosshair",
      "Прочее": "Star",
    };
    return map[cat] ?? "Package";
  };

  const getBuyLabel = (result: BuyResult): { text: string; color: string } | null => {
    if (!result) return null;
    if (result === "ok") return { text: "Куплено! Сделка создана.", color: "text-emerald-400" };
    if (result === "no_balance") return { text: "Недостаточно средств", color: "text-red-400" };
    if (result === "self") return { text: "Нельзя купить свой товар", color: "text-amber-400" };
    if (result === "not_enough_stock") return { text: "Недостаточно товара в наличии", color: "text-red-400" };
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-1">Каталог</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {allProducts.length === 0
              ? "Пока нет объявлений — станьте первым продавцом!"
              : `${allProducts.length} объявлений`}
          </p>
        </div>
        <Button
          className="bg-gold text-background hover:bg-gold/90 font-bold"
          onClick={() => setActive("add-product")}
        >
          <Icon name="Plus" size={15} className="mr-1.5" />
          Разместить
        </Button>
      </div>

      {/* AI Bot */}
      <div className="mb-6 bg-surface border border-gold/20 rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gold/5 transition-colors"
          onClick={() => setBotExpanded((v) => !v)}
        >
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
            <Icon name="ShieldCheck" size={18} className="text-gold" />
          </div>
          <div className="flex-1 text-left">
            <span className="font-display font-bold text-sm text-foreground">Gorant AI</span>
            <span className="text-xs text-muted-foreground ml-2">Умный помощник каталога</span>
          </div>
          <Icon
            name={botExpanded ? "ChevronUp" : "ChevronDown"}
            size={16}
            className="text-muted-foreground"
          />
        </button>

        {botExpanded && (
          <div className="px-5 pb-5 space-y-4">
            {/* Bot greeting */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="Bot" size={13} className="text-gold" />
              </div>
              <div className="bg-background border border-border rounded-xl rounded-tl-sm px-4 py-3 text-sm text-foreground max-w-lg">
                Привет! Я Gorant AI. Помогу найти нужный товар. Вот самые популярные категории
                прямо сейчас:
                <div className="flex flex-wrap gap-2 mt-3">
                  {topCategories.map(({ cat, count }) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold/10 border border-gold/20 text-xs text-gold font-semibold hover:bg-gold/20 transition-colors"
                    >
                      <Icon name={getCategoryIcon(cat)} size={11} />
                      {cat}
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {botWarning && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-red-400/10 border border-red-400/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="ShieldAlert" size={13} className="text-red-400" />
                </div>
                <div className="bg-red-400/10 border border-red-400/20 rounded-xl rounded-tl-sm px-4 py-3 text-sm text-red-400 max-w-lg">
                  <span className="font-semibold">Внимание!</span> Обнаружена внешняя ссылка в
                  поисковом запросе. Gorant Shop не несёт ответственности за переход по сторонним
                  сайтам. Не переходите по подозрительным ссылкам.
                </div>
              </div>
            )}

            {!botWarning && search && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="Bot" size={13} className="text-gold" />
                </div>
                <div className="bg-background border border-border rounded-xl rounded-tl-sm px-4 py-3 text-sm text-foreground max-w-lg">
                  Ищу «<span className="text-gold font-semibold">{search}</span>»... Найдено{" "}
                  <span className="font-semibold">{filtered.length}</span> товаров.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface border border-border rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Icon
            name="Search"
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
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
      </div>

      {/* Category buttons */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1 mb-6 sm:mb-8">
        <div className="flex gap-2 w-max sm:flex-wrap sm:w-auto">
        {["Все", ...categories.map((c) => c.name)].map((c) => (
          <button
            key={c}
            onClick={(e) => { e.preventDefault(); setCategory(c); }}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap ${
              category === c
                ? "bg-gold text-background border-gold"
                : "bg-surface border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
        </div>
      </div>

      {/* Products grid */}
      {loadingProducts ? (
        <div className="text-center py-24 text-muted-foreground">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Icon name="Package" size={18} className="text-gold" />
          </div>
          <p className="text-sm">Загрузка товаров...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Icon name="PackageOpen" size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-display font-semibold text-foreground mb-2">Товаров пока нет</p>
          <p className="text-sm mb-6">Здесь появятся объявления после их добавления продавцами</p>
          <Button
            className="bg-gold text-background hover:bg-gold/90 font-semibold"
            onClick={() => setActive("add-product")}
          >
            Разместить объявление
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((p) => {
            const isMyProduct = me?.id === p.sellerId;
            const pHoldDays = categories.find((c) => c.name === p.category)?.holdDays ?? 0;
            const sellerReceives = Math.round(p.price * (1 - PLATFORM_COMMISSION / 100));
            const result = buyResult[p.id];
            const buyFeedback = getBuyLabel(result);
            const bResult = boostResult[p.id];
            const stock = p.stock ?? 1;
            const unitLabel = p.unitLabel ?? "шт";
            const qty = Math.min(Math.max(1, buyQuantity[p.id] ?? 1), stock);

            return (
              <div
                key={p.id}
                className={`bg-surface border rounded-xl overflow-hidden flex flex-col relative transition-all ${
                  p.boosted
                    ? "border-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                    : "border-border hover:border-gold/20"
                }`}
              >
                {/* TOP badge */}
                {p.boosted && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gold text-background border border-gold/60">
                      ТОП
                    </span>
                  </div>
                )}

                {/* Thumbnail */}
                <div
                  className="category-glow h-36 flex items-center justify-center relative"
                  style={{
                    "--glow-color": getCategoryGlow(p.category).color,
                    "--glow-image": `url(${getCategoryGlow(p.category).image})`,
                  } as CSSProperties}
                >
                  <Icon
                    name={
                      p.category === "CS2 скины"
                        ? "Sword"
                        : p.category === "PUBG Mobile akk"
                        ? "Crosshair"
                        : p.category === "Игровые аккаунты"
                        ? "Gamepad2"
                        : p.category === "Подарочные карты"
                        ? "Gift"
                        : p.category === "Программное обеспечение"
                        ? "Monitor"
                        : "Package"
                    }
                    size={40}
                    className="text-border"
                  />
                  {p.badge && (
                    <span className="absolute top-3 right-3 text-xs font-display font-bold px-2 py-0.5 rounded bg-gold text-background">
                      {p.badge}
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1 gap-2">
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                  <h3 className="font-display font-semibold text-sm text-foreground leading-tight line-clamp-2">
                    {p.title}
                  </h3>

                  {/* Seller link */}
                  {p.sellerId && (
                    <button
                      onClick={() => setActive(`seller-${p.sellerId}`)}
                      className="text-xs text-muted-foreground hover:text-gold transition-colors text-left"
                    >
                      @{p.sellerName}
                    </button>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display font-bold text-lg text-foreground">
                      {format(p.price)}
                    </span>
                  </div>

                  {/* Seller receives info (for own product) */}
                  {isMyProduct && (
                    <p className="text-[10px] text-muted-foreground">
                      Продавец получит:{" "}
                      <span className="text-gold font-semibold">
                        ₽ {sellerReceives.toLocaleString("ru-RU")}
                      </span>
                    </p>
                  )}

                  {/* Hold + stock tags */}
                  <div className="flex flex-wrap gap-1">
                    {pHoldDays > 0 && (
                      <span className="text-[10px] text-purple-400 flex items-center gap-1 bg-purple-400/10 border border-purple-400/20 rounded-md px-2 py-0.5 w-fit">
                        <Icon name="Clock" size={9} />
                        Холд {pHoldDays} дн.
                      </span>
                    )}
                    {!isMyProduct && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-background border border-border rounded-md px-2 py-0.5 w-fit">
                        <Icon name="Package" size={9} />
                        В наличии: {stock} {unitLabel}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-2 space-y-2">
                    {/* Buy feedback */}
                    {buyFeedback && (
                      <p className={`text-xs flex items-center gap-1 ${buyFeedback.color}`}>
                        <Icon
                          name={result === "ok" ? "CheckCircle" : "AlertCircle"}
                          size={11}
                        />
                        {buyFeedback.text}
                      </p>
                    )}

                    {/* Buy / boost buttons */}
                    {isMyProduct ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground text-center">Ваш товар</p>
                        {!p.boosted && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-gold/30 text-gold hover:bg-gold/10 text-xs h-7"
                              onClick={() => handleBoost(p.id)}
                            >
                              <Icon name="TrendingUp" size={11} className="mr-1" />
                              Поднять в топ за ₽{BOOST_PRICE}
                            </Button>
                            {bResult === "no_balance" && (
                              <p className="text-[10px] text-red-400 flex items-center gap-1">
                                <Icon name="AlertCircle" size={10} />
                                Недостаточно средств
                              </p>
                            )}
                            {bResult === "ok" && (
                              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <Icon name="CheckCircle" size={10} />
                                Товар поднят в ТОП!
                              </p>
                            )}
                          </>
                        )}
                        {p.boosted && (
                          <p className="text-[10px] text-gold flex items-center gap-1 justify-center">
                            <Icon name="Star" size={10} />В топе
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {stock > 1 && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setBuyQuantity((prev) => ({ ...prev, [p.id]: Math.max(1, qty - 1) }))}
                              className="w-6 h-6 rounded border border-border text-muted-foreground hover:text-foreground hover:border-gold/40 flex items-center justify-center text-xs shrink-0"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={stock}
                              value={qty}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                setBuyQuantity((prev) => ({ ...prev, [p.id]: isNaN(v) ? 1 : Math.min(Math.max(1, v), stock) }));
                              }}
                              className="w-12 h-6 text-center text-xs bg-background border border-border rounded text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => setBuyQuantity((prev) => ({ ...prev, [p.id]: Math.min(stock, qty + 1) }))}
                              className="w-6 h-6 rounded border border-border text-muted-foreground hover:text-foreground hover:border-gold/40 flex items-center justify-center text-xs shrink-0"
                            >
                              +
                            </button>
                            <span className="text-[10px] text-muted-foreground">{unitLabel}</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          className="w-full bg-gold text-background hover:bg-gold/90 font-bold text-xs h-8"
                          onClick={() => handleBuy(p)}
                        >
                          <Icon name="ShoppingCart" size={12} className="mr-1" />
                          Купить{stock > 1 ? ` ${qty} ${unitLabel}` : ""}
                          {pHoldDays > 0 ? ` (холд ${pHoldDays}д)` : ""}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {contactModalProduct && (
        <BuyContactModal
          productTitle={contactModalProduct.title}
          quantity={Math.max(1, buyQuantity[contactModalProduct.id] ?? 1)}
          unitLabel={contactModalProduct.unitLabel ?? "шт"}
          totalPrice={format(contactModalProduct.price * Math.max(1, buyQuantity[contactModalProduct.id] ?? 1))}
          loading={contactModalLoading}
          error={contactModalError}
          onClose={() => setContactModalProduct(null)}
          onConfirm={handleConfirmBuy}
        />
      )}

      {pendingBuy && (
        <BigSpendVerifyModal
          onClose={() => setPendingBuy(null)}
          onConfirmed={async () => {
            const product = pendingBuy;
            setPendingBuy(null);
            const quantity = Math.max(1, buyQuantity[product.id] ?? 1);
            const fakeSellerUser = { id: product.sellerId } as import("@/context/AuthContext").AppUser;
            const result = await buyProduct(product, fakeSellerUser, quantity, pendingBuyContact);
            setBuyResult((prev) => ({ ...prev, [product.id]: result }));
            setTimeout(() => {
              setBuyResult((prev) => ({ ...prev, [product.id]: null }));
            }, 4000);
            if (result === "ok") {
              api.products.list().then(({ products }) => setAllProducts(products as AppProduct[])).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}