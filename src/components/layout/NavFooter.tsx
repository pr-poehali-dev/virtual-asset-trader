import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { CURRENCIES, LANGUAGES } from "@/components/data/constants";

// ─── NAV ─────────────────────────────────────────────────────────────────────

export function Nav({ active, setActive, isAdmin }: { active: string; setActive: (s: string) => void; isAdmin?: boolean }) {
  const { user, logout } = useAuth();
  const { currency, setCurrency, lang, setLang } = useCurrency();
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const unreadCount = user?.notifications.filter((n) => !n.read).length ?? 0;

  const links = [
    { id: "home", label: "Главная" },
    { id: "catalog", label: "Каталог" },
    { id: "deals", label: "Сделки" },
    { id: "about", label: "Gorant Shop" },
    { id: "support", label: "Поддержка" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      {/* Security badge */}
      <div className="bg-emerald-400/5 border-b border-emerald-400/10 px-6 py-0.5 flex items-center justify-center gap-2">
        <Icon name="Lock" size={10} className="text-emerald-400" />
        <span className="text-[10px] text-emerald-400/70 font-medium">Защищённое соединение · SSL/TLS шифрование · Gorant Shop</span>
      </div>

      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
        <button onClick={() => setActive("home")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-gold flex items-center justify-center">
            <Icon name="Shield" size={16} className="text-background" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-foreground">
            Gorant<span className="text-gold"> Shop</span>
          </span>
        </button>

        <div className="hidden md:flex items-center gap-0.5">
          {links.map((l) => (
            <button key={l.id} onClick={() => setActive(l.id)}
              className={`px-3 py-2 text-sm font-medium rounded transition-colors ${active === l.id ? "text-gold bg-gold/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {l.label}
            </button>
          ))}
          {isAdmin && (
            <button onClick={() => setActive("admin")}
              className={`px-3 py-2 text-sm font-medium rounded transition-colors ${active === "admin" ? "text-red-400 bg-red-400/10" : "text-red-400/70 hover:text-red-400 hover:bg-red-400/10"}`}>
              Админ
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language picker */}
          <div className="relative">
            <button onClick={() => { setShowLangMenu((p) => !p); setShowCurrencyMenu(false); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-surface border border-border hover:border-gold/30 text-xs text-muted-foreground transition-colors">
              <span>{lang.flag}</span>
              <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
              <Icon name="ChevronDown" size={12} />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-9 w-44 bg-surface border border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                {LANGUAGES.map((l) => (
                  <button key={l.code} onClick={() => { setLang(l); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary transition-colors ${lang.code === l.code ? "text-gold" : "text-foreground"}`}>
                    <span>{l.flag}</span><span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Currency picker */}
          <div className="relative">
            <button onClick={() => { setShowCurrencyMenu((p) => !p); setShowLangMenu(false); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-surface border border-border hover:border-gold/30 text-xs text-muted-foreground transition-colors">
              <span>{currency.symbol}</span>
              <span className="hidden sm:inline">{currency.code}</span>
              <Icon name="ChevronDown" size={12} />
            </button>
            {showCurrencyMenu && (
              <div className="absolute right-0 top-9 w-48 bg-surface border border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                {CURRENCIES.map((c) => (
                  <button key={c.code} onClick={() => { setCurrency(c); setShowCurrencyMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-secondary transition-colors ${currency.code === c.code ? "text-gold" : "text-foreground"}`}>
                    <span>{c.nameRu}</span><span className="text-muted-foreground">{c.symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-400/10 border border-red-400/30">
              <Icon name="ShieldAlert" size={13} className="text-red-400" />
              <span className="text-xs font-bold text-red-400">Slumon4ik</span>
              <span className="text-[10px] text-red-400/70 font-semibold bg-red-400/20 px-1 py-0.5 rounded">Админ</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setActive("cabinet")} className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-gold/40 transition-colors">
                <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-foreground hidden sm:inline">{user.username}</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{unreadCount}</span>
                )}
              </button>
              <button onClick={logout} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="LogOut" size={14} />
              </button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setActive("login")}
              className="text-muted-foreground hover:text-foreground border border-transparent hover:border-border text-xs h-8">
              <Icon name="User" size={13} className="mr-1" />Войти
            </Button>
          )}
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold text-xs h-8" onClick={() => setActive("catalog")}>
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
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <button onClick={() => setActive("home")} className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-sm bg-gold flex items-center justify-center">
                <Icon name="Shield" size={16} className="text-background" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">
                Gorant<span className="text-gold"> Shop</span>
              </span>
            </button>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Безопасные сделки с виртуальными ценностями. Ваши деньги под защитой.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Icon name="Lock" size={11} />
              <span>SSL/TLS шифрование</span>
            </div>
          </div>
          {[
            { title: "Платформа", links: [["Каталог", "catalog"], ["Gorant Shop", "about"], ["Поддержка", "support"]] },
            { title: "Аккаунт", links: [["Войти / Регистрация", "login"], ["Мои сделки", "deals"], ["Продать", "add-product"]] },
            { title: "Помощь", links: [["Центр помощи", "support"], ["Разрешение споров", "support"], ["Написать нам", "support"]] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-widest mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(([label, pg]) => (
                  <li key={label}>
                    <button onClick={() => setActive(pg)} className="text-sm text-muted-foreground hover:text-gold transition-colors">{label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© 2024 Gorant Shop. Все права защищены.</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Icon name="Lock" size={11} className="text-emerald-400" />
            <span>Данные зашифрованы и защищены</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
