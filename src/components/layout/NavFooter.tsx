import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

// ─── NAV ─────────────────────────────────────────────────────────────────────

export function Nav({ active, setActive, isAdmin }: { active: string; setActive: (s: string) => void; isAdmin?: boolean }) {
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
            Gorant<span className="text-gold"> Shop</span>
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
          {isAdmin && (
            <button
              onClick={() => setActive("admin")}
              className={`px-3.5 py-2 text-sm font-medium rounded transition-colors ${
                active === "admin"
                  ? "text-red-400 bg-red-400/10"
                  : "text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
              }`}
            >
              Админ
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/30">
              <Icon name="ShieldAlert" size={14} className="text-red-400" />
              <span className="text-xs font-bold text-red-400">Slumon4ik</span>
              <span className="text-[10px] text-red-400/70 font-semibold bg-red-400/20 px-1.5 py-0.5 rounded">Админ</span>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActive("cabinet")}
              className="text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
            >
              <Icon name="User" size={15} className="mr-1.5" />
              Войти
            </Button>
          )}
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

// ─── FOOTER ───────────────────────────────────────────────────────────────────

export function Footer({ setActive }: { setActive: (s: string) => void }) {
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
                Gorant<span className="text-gold"> Shop</span>
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
          <p className="text-xs text-muted-foreground">© 2026 Gorant Shop. Все права защищены.</p>
          <p className="text-xs text-muted-foreground">ИНН 7701234567 · ООО «Горант Шоп» · Москва</p>
        </div>
      </div>
    </footer>
  );
}
