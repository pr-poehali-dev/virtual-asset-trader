import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { PLATFORM_COMMISSION, BOOST_PRICE } from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api } from "@/api/client";
import { PublicTeamSection } from "@/components/pages/PublicTeam";
import { LiveFeed } from "@/components/pages/home/LiveFeed";

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
