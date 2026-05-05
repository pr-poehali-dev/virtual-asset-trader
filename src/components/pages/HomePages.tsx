import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, PRODUCTS, DEALS, STATUS_MAP, LIVE_DEALS, SITE_STATS } from "@/components/data/constants";

// ─── LIVE FEED ────────────────────────────────────────────────────────────────

function LiveFeed() {
  const [visible, setVisible] = useState(LIVE_DEALS.slice(0, 5));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTick((p) => p + 1);
      setVisible((prev) => {
        const next = [...prev];
        const idx = tick % LIVE_DEALS.length;
        if (!next.find((d) => d.id === LIVE_DEALS[idx].id)) {
          next.unshift(LIVE_DEALS[idx]);
          if (next.length > 5) next.pop();
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [tick]);

  return (
    <section className="py-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="font-display font-bold text-xl text-foreground">Последние закрытые сделки</h2>
          <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium">Live</span>
        </div>

        <div className="space-y-2">
          {visible.map((d, i) => (
            <div
              key={d.id}
              className={`flex items-center gap-4 p-4 rounded-xl border border-border bg-surface transition-all duration-500 ${i === 0 ? "border-emerald-400/30 bg-emerald-400/5" : ""}`}
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                <Icon name="CheckCircle" size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-display font-semibold text-sm text-foreground">{d.product}</span>
                <span className="text-xs text-muted-foreground ml-2">{d.buyer} ← {d.seller}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display font-bold text-sm text-gold">₽ {d.amount.toLocaleString("ru-RU")}</div>
                <div className="text-[10px] text-muted-foreground">{d.timeAgo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

export function HomePage({ setActive }: { setActive: (s: string) => void }) {
  const totalVolumeStr = SITE_STATS.totalVolume >= 1000000
    ? `₽ ${(SITE_STATS.totalVolume / 1000000).toFixed(1)} млн`
    : `₽ ${SITE_STATS.totalVolume.toLocaleString("ru-RU")}`;

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
              {[
                [String(SITE_STATS.totalDeals), "сделок закрыто"],
                [totalVolumeStr, "продано на платформе"],
                [`${SITE_STATS.successRate}%`, "успешных сделок"],
              ].map(([val, label]) => (
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
                alt="Gorant Shop Escrow Platform"
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
                  <div className="text-xs text-muted-foreground">Steam аккаунт · ₽ 5 200</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live feed */}
      <LiveFeed />

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
              { step: "02", icon: "Lock", title: "Средства удержаны", desc: "Gorant Shop блокирует сумму до завершения сделки" },
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
              <p className="text-muted-foreground text-sm">Добавляйте объявления в каталог</p>
            </div>
            <Button variant="ghost" className="text-gold hover:text-gold/80 font-semibold" onClick={() => setActive("catalog")}>
              Весь каталог <Icon name="ArrowRight" size={14} className="ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: "Gamepad2", label: "Игровые\nаккаунты" },
              { icon: "Monitor", label: "Программное\nобеспечение" },
              { icon: "Gift", label: "Подарочные\nкарты" },
              { icon: "Palette", label: "Цифровое\nискусство" },
              { icon: "Globe", label: "Домены" },
              { icon: "MoreHorizontal", label: "Прочее" },
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

export function CatalogPage() {
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
        <p className="text-muted-foreground text-sm">
          {PRODUCTS.length === 0 ? "Пока нет объявлений — станьте первым продавцом!" : `${PRODUCTS.length} объявлений · все сделки защищены эскроу`}
        </p>
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

      <div className="text-center py-24 text-muted-foreground">
        <Icon name="PackageOpen" size={48} className="mx-auto mb-4 opacity-20" />
        <p className="font-display font-semibold text-foreground mb-2">Каталог пуст</p>
        <p className="text-sm">Здесь появятся объявления после их добавления продавцами</p>
        <Button className="mt-6 bg-gold text-background hover:bg-gold/90 font-semibold">
          Разместить объявление
        </Button>
      </div>
    </div>
  );
}

// ─── CABINET ──────────────────────────────────────────────────────────────────

export function CabinetPage() {
  const [role, setRole] = useState<"buyer" | "seller">("buyer");

  const buyerStats = [
    { icon: "ShoppingBag", label: "Всего покупок", value: "0" },
    { icon: "Lock", label: "В эскроу", value: "₽ 0" },
    { icon: "CheckCircle", label: "Закрыто сделок", value: "0" },
  ];

  const sellerStats = [
    { icon: "Package", label: "Активных лотов", value: "0" },
    { icon: "TrendingUp", label: "Выручка за месяц", value: "₽ 0" },
    { icon: "Star", label: "Рейтинг продавца", value: "—" },
  ];

  const stats = role === "buyer" ? buyerStats : sellerStats;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground mb-1">Личный кабинет</h1>
          <p className="text-muted-foreground text-sm">Войдите или зарегистрируйтесь для доступа</p>
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
        {DEALS.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Icon name="Inbox" size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Сделок пока нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {DEALS.map((d) => {
              const s = STATUS_MAP[d.status];
              return (
                <div key={d.id} className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border">
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
        )}
      </div>
    </div>
  );
}
