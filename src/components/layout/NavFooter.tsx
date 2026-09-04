import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { CURRENCIES, LANGUAGES } from "@/components/data/constants";
import { AdminBadge, AdminAvatar } from "@/components/ui/admin-badge";

// ─── VK ICON (SVG) ────────────────────────────────────────────────────────────

function VkIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.408 4 7.932c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.848c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.118-.254.322-.491.762-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.745-.576.745z"/>
    </svg>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────

export function Nav({ active, setActive, isAdmin }: { active: string; setActive: (s: string) => void; isAdmin?: boolean }) {
  const { user, logout } = useAuth();
  const { currency, setCurrency, lang, setLang, t } = useCurrency();
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = user?.notifications.filter((n) => !n.read).length ?? 0;

  const links = [
    { id: "home",    label: t("home"),    icon: "Home" },
    { id: "catalog", label: t("catalog"), icon: "ShoppingBag" },
    // "Сделки" видны только авторизованным — гостям нечего там смотреть
    ...(user ? [{ id: "deals", label: t("deals"), icon: "ArrowRightLeft" }] : []),
    { id: "games",   label: t("games"),   icon: "Coins" },
    { id: "about",   label: t("about"),   icon: "Info" },
    { id: "support", label: t("support"), icon: "Headphones" },
  ];

  const closeAll = () => {
    setShowCurrencyMenu(false);
    setShowLangMenu(false);
    setMobileOpen(false);
  };

  const navigate = (id: string) => { setActive(id); closeAll(); };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        {/* Security badge */}
        <div className="bg-emerald-400/5 border-b border-emerald-400/10 px-4 py-0.5 flex items-center justify-center gap-2">
          <Icon name="Lock" size={10} className="text-emerald-400" />
          <span className="text-[10px] text-emerald-400/70 font-medium">{t("protected")} · SSL/TLS · Gorant Shop</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <button onClick={() => navigate("home")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-gold flex items-center justify-center shrink-0">
              <Icon name="Shield" size={16} className="text-background" />
            </div>
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-foreground">
              Gorant<span className="text-gold"> Shop</span>
            </span>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map((l) => (
              <button key={l.id} onClick={() => navigate(l.id)}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors ${active === l.id ? "text-gold bg-gold/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                {l.label}
              </button>
            ))}
            {isAdmin && (
              <button onClick={() => navigate("admin")}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors ${active === "admin" ? "text-red-400 bg-red-400/10" : "text-red-400/70 hover:text-red-400 hover:bg-red-400/10"}`}>
                {t("admin")}
              </button>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language picker — desktop only */}
            <div className="relative hidden sm:block">
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
                      className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-secondary transition-colors ${lang.code === l.code ? "text-gold" : "text-foreground"}`}>
                      <span>{l.flag}</span><span>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Telegram link — desktop only */}
            <a
              href="https://t.me/GorantShopOffical"
              target="_blank"
              rel="noopener noreferrer"
              title="Наш Telegram"
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-surface border border-border hover:border-[#26A5E4]/50 text-muted-foreground hover:text-[#26A5E4] transition-colors"
            >
              <Icon name="Send" size={14} />
            </a>

            {/* Currency picker — desktop only */}
            <div className="relative hidden sm:block">
              <button onClick={() => { setShowCurrencyMenu((p) => !p); setShowLangMenu(false); }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-surface border border-border hover:border-gold/30 text-xs text-muted-foreground transition-colors">
                <span>{currency.symbol}</span>
                <span>{currency.code}</span>
                <Icon name="ChevronDown" size={12} />
              </button>
              {showCurrencyMenu && (
                <div className="absolute right-0 top-9 w-48 bg-surface border border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                  {CURRENCIES.map((c) => (
                    <button key={c.code} onClick={() => { setCurrency(c); setShowCurrencyMenu(false); }}
                      className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-secondary transition-colors ${currency.code === c.code ? "text-gold" : "text-foreground"}`}>
                      <span>{c.nameRu}</span><span className="text-muted-foreground">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User / login */}
            {isAdmin ? (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gold/5 border border-gold/30">
                <AdminAvatar size={24} />
                <span className="text-xs font-bold text-foreground">Gorant Shop</span>
                <AdminBadge size="sm" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-1">
                <button onClick={() => navigate("cabinet")}
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-gold/40 transition-colors min-h-[36px]">
                  {user.role === "admin" || user.isOwner ? (
                    <AdminAvatar size={24} />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold shrink-0">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-foreground hidden sm:inline max-w-[80px] truncate">{user.username}</span>
                  {(user.role === "admin" || user.isOwner) && <AdminBadge size="xs" />}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{unreadCount}</span>
                  )}
                </button>
                <button onClick={logout} className="p-2 text-muted-foreground hover:text-foreground transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
                  <Icon name="LogOut" size={15} />
                </button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("login")}
                className="text-muted-foreground hover:text-foreground border border-transparent hover:border-border text-xs h-9 hidden sm:flex">
                <Icon name="User" size={13} className="mr-1" />{t("login")}
              </Button>
            )}

            {/* Start deal — desktop */}
            <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold text-xs h-9 hidden md:flex" onClick={() => navigate("catalog")}>
              {t("start_deal")}
            </Button>

            {/* Hamburger — mobile */}
            <button
              onClick={() => setMobileOpen((p) => !p)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name={mobileOpen ? "X" : "Menu"} size={18} />
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background/98 backdrop-blur-md">
            <div className="px-4 py-3 space-y-1">
              {links.map((l) => (
                <button key={l.id} onClick={() => navigate(l.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${active === l.id ? "text-gold bg-gold/10 border border-gold/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                  <Icon name={l.icon} size={17} />
                  {l.label}
                </button>
              ))}
              {isAdmin && (
                <button onClick={() => navigate("admin")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${active === "admin" ? "text-red-400 bg-red-400/10" : "text-red-400/70 hover:text-red-400 hover:bg-red-400/10"}`}>
                  <Icon name="ShieldAlert" size={17} />
                  {t("admin")}
                </button>
              )}
            </div>

            {/* Mobile bottom bar */}
            <div className="px-4 pb-4 pt-2 border-t border-border space-y-2">
              {/* Currency + Language row */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <button onClick={() => { setShowLangMenu((p) => !p); setShowCurrencyMenu(false); }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-muted-foreground">
                    <span>{lang.flag}</span><span>{lang.label}</span><Icon name="ChevronDown" size={13} />
                  </button>
                  {showLangMenu && (
                    <div className="absolute bottom-12 left-0 right-0 bg-surface border border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                      {LANGUAGES.map((l) => (
                        <button key={l.code} onClick={() => { setLang(l); setShowLangMenu(false); }}
                          className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-secondary ${lang.code === l.code ? "text-gold" : "text-foreground"}`}>
                          <span>{l.flag}</span><span>{l.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative flex-1">
                  <button onClick={() => { setShowCurrencyMenu((p) => !p); setShowLangMenu(false); }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-muted-foreground">
                    <span>{currency.symbol}</span><span>{currency.code}</span><Icon name="ChevronDown" size={13} />
                  </button>
                  {showCurrencyMenu && (
                    <div className="absolute bottom-12 left-0 right-0 bg-surface border border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                      {CURRENCIES.map((c) => (
                        <button key={c.code} onClick={() => { setCurrency(c); setShowCurrencyMenu(false); }}
                          className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-secondary ${currency.code === c.code ? "text-gold" : "text-foreground"}`}>
                          <span>{c.nameRu}</span><span className="text-muted-foreground">{c.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {!user ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-border font-semibold h-11" onClick={() => navigate("login")}>
                    <Icon name="User" size={15} className="mr-2" />Войти
                  </Button>
                  <Button className="flex-1 bg-gold text-background hover:bg-gold/90 font-bold h-11" onClick={() => navigate("catalog")}>
                    Начать
                  </Button>
                </div>
              ) : (
                <Button className="w-full bg-gold text-background hover:bg-gold/90 font-bold h-11" onClick={() => navigate("catalog")}>
                  <Icon name="ShoppingBag" size={15} className="mr-2" />{t("start_deal")}
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile bottom nav bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { id: "home",    icon: "Home",             label: "Главная" },
            { id: "catalog", icon: "ShoppingBag",      label: "Каталог" },
            // "Сделки" видны только авторизованным
            ...(user ? [{ id: "deals", icon: "ArrowRightLeft", label: "Сделки" }] : []),
            { id: "support", icon: "Headphones",       label: "Чат" },
            { id: user ? "cabinet" : "login", icon: user ? "User" : "LogIn", label: user ? "Профиль" : "Войти" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors relative ${
                active === item.id ? "text-gold" : "text-muted-foreground"
              }`}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.id === (user ? "cabinet" : "login") && unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

export function Footer({ setActive }: { setActive: (s: string) => void }) {
  return (
    <footer className="border-t border-border bg-surface mt-10 mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="col-span-2 md:col-span-1">
            <button onClick={() => setActive("home")} className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-sm bg-gold flex items-center justify-center shrink-0">
                <Icon name="Shield" size={16} className="text-background" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">
                Gorant<span className="text-gold"> Shop</span>
              </span>
            </button>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Безопасные сделки с виртуальными ценностями. Ваши деньги под защитой.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Icon name="Lock" size={11} />
                <span>SSL/TLS</span>
              </div>
              {/* VK link */}
              <a
                href="https://vk.com/gorantshop"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#4680C2] transition-colors"
                title="ВКонтакте"
              >
                <VkIcon size={16} />
                <span>ВКонтакте</span>
              </a>
              {/* Telegram link */}
              <a
                href="https://t.me/GorantShopOffical"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#26A5E4] transition-colors"
                title="Telegram"
              >
                <Icon name="Send" size={15} />
                <span>Telegram</span>
              </a>
            </div>
          </div>
          {[
            { title: "Платформа", links: [["Каталог", "catalog"], ["О нас", "about"], ["Поддержка", "support"]] },
            { title: "Аккаунт",  links: [["Войти / Регистрация", "login"], ["Мои сделки", "deals"], ["Продать", "add-product"]] },
            { title: "Помощь",   links: [["Центр помощи", "support"], ["Споры", "support"], ["Написать нам", "support"]] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-widest mb-3">{col.title}</h4>
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
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground text-center sm:text-left">© 2024 Gorant Shop. Все права защищены.</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name="Lock" size={11} className="text-emerald-400" />
              <span>Данные зашифрованы</span>
            </div>
            <a
              href="https://vk.com/gorantshop"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#4680C2] transition-colors"
            >
              <VkIcon size={14} />
              <span>VK</span>
            </a>
            <a
              href="https://t.me/GorantShopOffical"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#26A5E4] transition-colors"
            >
              <Icon name="Send" size={14} />
              <span>Telegram</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}