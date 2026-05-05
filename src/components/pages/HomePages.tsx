import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, SITE_STATS, LIVE_DEALS } from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/components/data/constants";

// ─── LIVE FEED ────────────────────────────────────────────────────────────────

function LiveFeed() {
  const [visible, setVisible] = useState(LIVE_DEALS.slice(0, 5));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTick((p) => {
        const next = p + 1;
        const idx = next % LIVE_DEALS.length;
        setVisible((prev) => {
          if (prev.find((d) => d.id === LIVE_DEALS[idx].id)) return prev;
          return [LIVE_DEALS[idx], ...prev.slice(0, 4)];
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

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
            <div key={d.id} className={`flex items-center gap-4 p-4 rounded-xl border bg-surface transition-all duration-500 ${i === 0 ? "border-emerald-400/30 bg-emerald-400/5" : "border-border"}`}>
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
  const { users } = useAuth();
  const registeredCount = users.filter((u) => u.role === "user").length;
  const totalVolumeStr = SITE_STATS.totalVolume >= 1000000
    ? `₽ ${(SITE_STATS.totalVolume / 1000000).toFixed(1)} млн`
    : `₽ ${SITE_STATS.totalVolume.toLocaleString("ru-RU")}`;

  return (
    <div className="animate-fade-in">
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
              Эскроу для<br /><span className="text-gold">виртуальных</span><br />ценностей
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">
              Мы удерживаем средства до тех пор, пока обе стороны не подтвердят выполнение сделки.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-gold text-background hover:bg-gold/90 font-bold px-8" onClick={() => setActive("catalog")}>
                Смотреть каталог<Icon name="ArrowRight" size={16} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-border hover:border-gold/50 font-semibold" onClick={() => setActive("escrow")}>
                Как работает эскроу
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-10 border-t border-border">
              {[
                [String(SITE_STATS.totalDeals), "сделок закрыто"],
                [totalVolumeStr, "продано"],
                [`${SITE_STATS.successRate}%`, "успешных"],
                [String(registeredCount), "пользователей"],
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
              <img src="https://cdn.poehali.dev/projects/6d96cf49-c0b6-45ab-ab7b-3c1367bdc4ef/files/bce0a5a2-1308-44c6-9ead-cae738702db0.jpg"
                alt="Gorant Shop" className="w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-surface border border-border rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                  <Icon name="ShieldCheck" size={20} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-display font-semibold">Сделка подтверждена</div>
                  <div className="text-xs text-muted-foreground">CS2 скин · ₽ 3 800</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LiveFeed />

      <section className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl text-foreground mb-4">Как работает платформа</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Четыре простых шага — от открытия сделки до получения ценности</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-border to-transparent hidden md:block" />
            {[
              { step: "01", icon: "CreditCard", title: "Покупатель оплачивает", desc: "Деньги поступают на счёт эскроу, не продавцу" },
              { step: "02", icon: "Lock", title: "Средства удержаны", desc: "Gorant Shop блокирует сумму до завершения сделки" },
              { step: "03", icon: "ArrowRightLeft", title: "Передача товара", desc: "Продавец передаёт виртуальную ценность покупателю" },
              { step: "04", icon: "CheckCircle", title: "Оба подтверждают", desc: "После подтверждения деньги переводятся продавцу" },
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { icon: "Gamepad2", label: "Игровые аккаунты", page: "catalog" },
              { icon: "Monitor", label: "Программы", page: "catalog" },
              { icon: "Gift", label: "Подарочные карты", page: "catalog" },
              { icon: "Palette", label: "Цифровое искусство", page: "catalog" },
              { icon: "Globe", label: "Домены", page: "catalog" },
              { icon: "Sword", label: "CS2 скины", page: "catalog" },
              { icon: "Star", label: "Прочее", page: "catalog" },
              { icon: "Plus", label: "Добавить товар", page: "add-product" },
            ].map((c) => (
              <button key={c.label} onClick={() => setActive(c.page)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background border border-border hover:border-gold/40 hover:bg-gold/5 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                  <Icon name={c.icon} size={18} className="text-muted-foreground group-hover:text-gold transition-colors" />
                </div>
                <div className="text-[10px] font-display font-semibold text-foreground text-center leading-tight">{c.label}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-surface border border-gold/20 rounded-2xl p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full blur-[80px]" />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-14 h-14 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mb-6">
                  <Icon name="ShieldCheck" size={28} className="text-gold" />
                </div>
                <h2 className="font-display font-bold text-3xl text-foreground mb-4">Гарантийная защита каждой сделки</h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Система эскроу гарантирует: продавец получит деньги только после подтверждения передачи товара.
                </p>
                <Button className="bg-gold text-background hover:bg-gold/90 font-semibold" onClick={() => setActive("escrow")}>
                  Подробнее о гарантиях
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "Lock", title: "Удержание средств", desc: "Деньги заморожены до взаимного подтверждения" },
                  { icon: "Scale", title: "Разрешение споров", desc: "Независимая служба медиации" },
                  { icon: "Eye", title: "Прозрачность", desc: "Полная история статусов сделки" },
                  { icon: "Headphones", title: "Поддержка 24/7", desc: "Команда экспертов готова помочь" },
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

// ─── ADD PRODUCT PAGE ─────────────────────────────────────────────────────────

export function AddProductPage({ setActive }: { setActive: (s: string) => void }) {
  const { user, addProduct } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [success, setSuccess] = useState(false);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center animate-fade-in">
        <Icon name="LogIn" size={40} className="mx-auto mb-4 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground mb-4">Войдите, чтобы разместить объявление</p>
        <Button className="bg-gold text-background hover:bg-gold/90 font-semibold" onClick={() => setActive("login")}>Войти</Button>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!title || !price) return;
    const p: Product = {
      id: Date.now(),
      title,
      category,
      price: parseInt(price),
      rating: 0,
      reviews: 0,
      sellerId: user.id,
      sellerName: user.username,
      badge: null,
      verified: false,
    };
    addProduct(p);
    setSuccess(true);
    setTitle(""); setPrice(""); setDesc("");
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      <button onClick={() => setActive("catalog")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
        <Icon name="ArrowLeft" size={14} />Назад
      </button>
      <h1 className="font-display font-bold text-2xl text-foreground mb-8">Разместить объявление</h1>

      {success && (
        <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Icon name="CheckCircle" size={18} className="text-emerald-400" />
          <span className="text-sm text-emerald-400 font-semibold">Объявление успешно опубликовано!</span>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Название товара *</label>
          <Input placeholder="Например: Steam аккаунт — 200 игр" value={title}
            onChange={(e) => { setTitle(e.target.value); setSuccess(false); }}
            className="bg-background border-border text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Категория</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground">
              {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Цена (₽) *</label>
            <Input placeholder="5000" value={price} onChange={(e) => { setPrice(e.target.value); setSuccess(false); }}
              type="number" className="bg-background border-border text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Описание</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Подробное описание товара..."
            className="w-full h-24 px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-gold/50" />
        </div>
        {category === "CS2 скины" && (
          <div className="bg-purple-400/10 border border-purple-400/20 rounded-xl p-4 flex items-start gap-3">
            <Icon name="Info" size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-400">
              <span className="font-bold">Важно: CS2 скины.</span> После подтверждения передачи скина обеими сторонами средства будут удержаны на 8 дней перед выплатой продавцу.
            </p>
          </div>
        )}
        <Button className="w-full bg-gold text-background hover:bg-gold/90 font-bold" onClick={handleSubmit}>
          <Icon name="Upload" size={15} className="mr-2" />Опубликовать объявление
        </Button>
      </div>
    </div>
  );
}

// ─── CATALOG ─────────────────────────────────────────────────────────────────

export function CatalogPage({ setActive }: { setActive: (s: string) => void }) {
  const { users } = useAuth();
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const allProducts = users.flatMap((u) => u.products);
  const filtered = allProducts
    .filter((p) => category === "Все" || p.category === category)
    .filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !priceMax || p.price <= parseInt(priceMax));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground mb-1">Каталог</h1>
          <p className="text-muted-foreground text-sm">
            {allProducts.length === 0 ? "Пока нет объявлений — станьте первым продавцом!" : `${allProducts.length} объявлений`}
          </p>
        </div>
        <Button className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={() => setActive("add-product")}>
          <Icon name="Plus" size={15} className="mr-1.5" />Разместить
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface border border-border rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск по названию..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border text-sm h-9" />
        </div>
        <Input placeholder="Цена до ₽" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
          type="number" className="w-36 bg-background border-border text-sm h-9" />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${category === c ? "bg-gold text-background border-gold" : "bg-surface border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"}`}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Icon name="PackageOpen" size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-display font-semibold text-foreground mb-2">Товаров пока нет</p>
          <p className="text-sm mb-6">Здесь появятся объявления после их добавления продавцами</p>
          <Button className="bg-gold text-background hover:bg-gold/90 font-semibold" onClick={() => setActive("add-product")}>
            Разместить объявление
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((p) => {
            const seller = users.find((u) => u.id === p.sellerId);
            const isCS2 = p.category === "CS2 скины";
            return (
              <div key={p.id} className="bg-surface border border-border rounded-xl overflow-hidden hover-scale group cursor-pointer">
                <div className="h-40 bg-gradient-to-br from-secondary to-background flex items-center justify-center relative">
                  <Icon name={isCS2 ? "Sword" : "Package"} size={40} className="text-border group-hover:text-gold/40 transition-colors" />
                  {p.badge && <span className="absolute top-3 left-3 text-xs font-display font-bold px-2 py-0.5 rounded bg-gold text-background">{p.badge}</span>}
                  {isCS2 && <span className="absolute top-3 right-3 text-[10px] bg-purple-400/20 text-purple-400 border border-purple-400/30 px-1.5 py-0.5 rounded font-semibold">CS2</span>}
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{p.category}</p>
                  <h3 className="font-display font-semibold text-sm text-foreground mb-2 leading-tight line-clamp-2">{p.title}</h3>
                  {seller && (
                    <button onClick={() => setActive(`seller-${seller.id}`)} className="text-xs text-muted-foreground hover:text-gold transition-colors mb-2 block">
                      @{seller.username}
                    </button>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-lg text-foreground">₽ {p.price.toLocaleString("ru-RU")}</span>
                    <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold text-xs h-7 px-3">Купить</Button>
                  </div>
                  {isCS2 && <p className="text-[10px] text-purple-400 mt-2 flex items-center gap-1"><Icon name="Clock" size={9} />Холд 8 дней</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
