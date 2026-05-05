import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { INITIAL_REQUISITES, INITIAL_WITHDRAWALS, WITHDRAW_STATUS_MAP, WithdrawRequest, Requisite } from "@/components/data/constants";

// ─── FROZEN PAGE ──────────────────────────────────────────────────────────────

export function FrozenPage({ reason, onSupport }: { reason?: string; onSupport: () => void }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-6">
          <Icon name="Snowflake" size={36} className="text-amber-400" />
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground mb-3">Аккаунт заморожен</h1>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          Ваш аккаунт был заморожен за подозрительную активность.
        </p>
        {reason && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 mb-6 text-sm text-amber-400">
            {reason}
          </div>
        )}
        <p className="text-sm text-muted-foreground mb-8">
          Для разморозки обратитесь в техническую поддержку!
        </p>
        <Button className="bg-gold text-background hover:bg-gold/90 font-semibold" onClick={onSupport}>
          Написать в поддержку
        </Button>
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────

export function LoginPage({ onRegister, onFrozen }: { onRegister: () => void; onFrozen: (reason?: string) => void }) {
  const { login, users } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!email || !password) { setError("Заполните все поля"); return; }
    const result = login(email, password);
    if (result === "ok") return;
    if (result === "frozen") {
      const u = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      onFrozen(u?.freezeReason);
      return;
    }
    if (result === "blocked") { setError("Ваш аккаунт заблокирован. Обратитесь в поддержку."); return; }
    setError("Неверный email или пароль");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in px-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-border rounded-2xl p-8">
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4">
              <Icon name="LogIn" size={22} className="text-gold" />
            </div>
            <h1 className="font-display font-bold text-xl text-foreground mb-1">Вход в аккаунт</h1>
            <p className="text-xs text-muted-foreground">Gorant Shop</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Email</label>
              <Input placeholder="your@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Пароль</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleLogin()} className="bg-background border-border text-sm" />
            </div>
            {error && <p className="text-xs text-red-400 flex items-center gap-1"><Icon name="AlertCircle" size={12} />{error}</p>}
            <Button className="w-full bg-gold text-background hover:bg-gold/90 font-bold" onClick={handleLogin}>Войти</Button>
            <p className="text-center text-xs text-muted-foreground">
              Нет аккаунта?{" "}
              <button onClick={onRegister} className="text-gold hover:underline font-semibold">Зарегистрироваться</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTER PAGE ────────────────────────────────────────────────────────────

export function RegisterPage({ onLogin }: { onLogin: () => void }) {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");

  const handleRegister = () => {
    if (!username || !email || !password || !password2) { setError("Заполните все поля"); return; }
    if (password !== password2) { setError("Пароли не совпадают"); return; }
    if (password.length < 6) { setError("Пароль не менее 6 символов"); return; }
    const result = register(username, email, password);
    if (result === "exists") { setError("Email или имя уже используется"); return; }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in px-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-border rounded-2xl p-8">
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4">
              <Icon name="UserPlus" size={22} className="text-gold" />
            </div>
            <h1 className="font-display font-bold text-xl text-foreground mb-1">Регистрация</h1>
            <p className="text-xs text-muted-foreground">Создайте аккаунт Gorant Shop</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Имя пользователя</label>
              <Input placeholder="username" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Email</label>
              <Input placeholder="your@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Пароль</label>
              <Input type="password" placeholder="мин. 6 символов" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Повторите пароль</label>
              <Input type="password" placeholder="••••••••" value={password2} onChange={(e) => { setPassword2(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleRegister()} className="bg-background border-border text-sm" />
            </div>
            {error && <p className="text-xs text-red-400 flex items-center gap-1"><Icon name="AlertCircle" size={12} />{error}</p>}
            <Button className="w-full bg-gold text-background hover:bg-gold/90 font-bold" onClick={handleRegister}>Создать аккаунт</Button>
            <p className="text-center text-xs text-muted-foreground">
              Уже есть аккаунт?{" "}
              <button onClick={onLogin} className="text-gold hover:underline font-semibold">Войти</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SELLER PROFILE (public) ──────────────────────────────────────────────────

export function SellerProfilePage({ sellerId, setActive }: { sellerId: string; setActive: (s: string) => void }) {
  const { users, user: me } = useAuth();
  const seller = users.find((u) => u.id === sellerId);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const { addReview } = useAuth();

  if (!seller) return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center text-muted-foreground">
      <Icon name="UserX" size={40} className="mx-auto mb-4 opacity-30" />
      <p>Продавец не найден</p>
    </div>
  );

  const avgRating = seller.reviews.length
    ? (seller.reviews.reduce((s, r) => s + r.rating, 0) / seller.reviews.length).toFixed(1)
    : "—";

  const handleReview = () => {
    if (!me || !reviewText.trim()) return;
    addReview(seller.id, { fromUser: me.username, rating: reviewRating, text: reviewText.trim(), date: new Date().toLocaleDateString("ru-RU") });
    setReviewText("");
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <button onClick={() => setActive("catalog")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
        <Icon name="ArrowLeft" size={14} />Назад в каталог
      </button>

      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-2xl font-bold text-gold">
            {seller.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground mb-1">{seller.username}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Icon name="Star" size={13} className="text-gold" />{avgRating}</span>
              <span className="flex items-center gap-1"><Icon name="MessageSquare" size={13} />{seller.reviews.length} отзывов</span>
              <span className="flex items-center gap-1"><Icon name="ShoppingBag" size={13} />{seller.deals} сделок</span>
              <span className="flex items-center gap-1"><Icon name="Calendar" size={13} />с {seller.joined}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-display font-semibold text-base text-foreground mb-4">Товары продавца</h2>
          {seller.products.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted-foreground">
              <Icon name="Package" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Нет активных товаров</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {seller.products.map((p) => (
                <div key={p.id} className="bg-surface border border-border rounded-xl p-4 hover-scale cursor-pointer">
                  <p className="text-xs text-muted-foreground mb-1">{p.category}</p>
                  <h3 className="font-display font-semibold text-sm text-foreground mb-2">{p.title}</h3>
                  <div className="font-display font-bold text-lg text-gold">₽ {p.price.toLocaleString("ru-RU")}</div>
                </div>
              ))}
            </div>
          )}

          <h2 className="font-display font-semibold text-base text-foreground mt-8 mb-4">Отзывы</h2>
          {seller.reviews.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">Отзывов пока нет</div>
          ) : (
            <div className="space-y-3">
              {seller.reviews.map((r) => (
                <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {r.fromUser[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm text-foreground">{r.fromUser}</span>
                    <div className="flex items-center gap-0.5 ml-auto">
                      {[1,2,3,4,5].map((s) => (
                        <Icon key={s} name="Star" size={11} className={s <= r.rating ? "text-gold" : "text-border"} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{r.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.text}</p>
                </div>
              ))}
            </div>
          )}

          {me && me.id !== seller.id && (
            <div className="mt-6 bg-surface border border-border rounded-xl p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-3">Оставить отзыв</h3>
              <div className="flex items-center gap-2 mb-3">
                {[1,2,3,4,5].map((s) => (
                  <button key={s} onClick={() => setReviewRating(s)}>
                    <Icon name="Star" size={20} className={s <= reviewRating ? "text-gold" : "text-border"} />
                  </button>
                ))}
              </div>
              <Input
                placeholder="Напишите отзыв..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="bg-background border-border text-sm mb-3"
              />
              <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-semibold" onClick={handleReview}>
                Отправить
              </Button>
            </div>
          )}
        </div>

        <div>
          <div className="bg-surface border border-border rounded-xl p-5 sticky top-24">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">Статистика</h3>
            <div className="space-y-3">
              {[
                ["Рейтинг", avgRating],
                ["Всего отзывов", String(seller.reviews.length)],
                ["Завершено сделок", String(seller.deals)],
                ["На платформе с", seller.joined],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CABINET / PROFILE ────────────────────────────────────────────────────────

export function CabinetPage({ setActive }: { setActive: (s: string) => void }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<"overview" | "withdrawals">("overview");
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>(INITIAL_WITHDRAWALS.filter((w) => w.userId === user?.id));
  const [requisites] = useState(INITIAL_REQUISITES.filter((r) => r.active));
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [wAmount, setWAmount] = useState("");
  const [wReqId, setWReqId] = useState("");

  if (!user) {
    return <LoginPage onRegister={() => setActive("register")} onFrozen={() => {}} />;
  }

  const submitWithdrawal = () => {
    if (!wAmount || !wReqId) return;
    const req = requisites.find((r) => r.id === wReqId);
    if (!req) return;
    const amount = parseInt(wAmount);
    if (isNaN(amount) || amount <= 0) return;
    const commission = 5;
    const newWd: WithdrawRequest = {
      id: `WD-${String(Date.now()).slice(-5)}`,
      userId: user.id,
      username: user.username,
      amount,
      commission,
      requisiteType: req.type,
      requisiteDetails: req.details,
      status: "pending",
      date: new Date().toLocaleDateString("ru-RU"),
    };
    setWithdrawals((prev) => [newWd, ...prev]);
    setWAmount("");
    setWReqId("");
    setShowWithdrawForm(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-xl font-bold text-gold">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl text-foreground">{user.username}</h1>
              {user.role === "admin" && (
                <span className="text-[10px] text-red-400/80 font-bold bg-red-400/15 px-1.5 py-0.5 rounded border border-red-400/20">Админ</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">ID аккаунта: <span className="text-foreground font-mono">{user.accountId}</span></p>
            <p className="text-xs text-muted-foreground">На платформе с {user.joined}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground" onClick={logout}>
          <Icon name="LogOut" size={14} className="mr-1.5" />Выйти
        </Button>
      </div>

      <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl mb-8 w-fit">
        {(["overview", "withdrawals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "overview" ? "Обзор" : "Заявки на вывод"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { icon: "Wallet", label: "Баланс", value: `₽ ${user.balance.toLocaleString("ru-RU")}` },
              { icon: "CheckCircle", label: "Сделок завершено", value: String(user.deals) },
              { icon: "Package", label: "Активных товаров", value: String(user.products.length) },
            ].map((s) => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
                <Icon name={s.icon} size={20} className="text-gold mb-3" />
                <div className="font-display font-bold text-2xl text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 mb-4">
            <h2 className="font-display font-semibold text-sm text-foreground mb-3">Мои данные</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-foreground">{user.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ID аккаунта</span><span className="text-foreground font-mono text-xs">{user.accountId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Роль</span><span className="text-foreground">{user.role === "admin" ? "Администратор" : "Пользователь"}</span></div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
              <Icon name="Lock" size={10} />Личные данные видны только вам и администраторам
            </p>
          </div>

          <button
            onClick={() => setActive(`seller-${user.id}`)}
            className="w-full text-left bg-surface border border-border rounded-xl p-5 hover:border-gold/40 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-semibold text-sm text-foreground mb-1">Страница продавца</div>
                <div className="text-xs text-muted-foreground">Посмотреть, как вас видят другие</div>
              </div>
              <Icon name="ExternalLink" size={16} className="text-muted-foreground group-hover:text-gold transition-colors" />
            </div>
          </button>
        </div>
      )}

      {tab === "withdrawals" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-base text-foreground">Заявки на вывод</h2>
            <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={() => setShowWithdrawForm(true)}>
              <Icon name="Plus" size={14} className="mr-1.5" />Создать заявку
            </Button>
          </div>

          {showWithdrawForm && (
            <div className="bg-surface border border-gold/20 rounded-xl p-5 mb-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">Новая заявка на вывод</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Сумма (₽)</label>
                  <Input placeholder="1000" value={wAmount} onChange={(e) => setWAmount(e.target.value)} type="number" className="bg-background border-border text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Реквизит для вывода</label>
                  <select
                    value={wReqId}
                    onChange={(e) => setWReqId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
                  >
                    <option value="">Выберите реквизит...</option>
                    {requisites.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} — {r.details}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">Комиссия платформы: 5% от суммы</p>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="flex-1 border-border" onClick={() => setShowWithdrawForm(false)}>Отмена</Button>
                  <Button size="sm" className="flex-1 bg-gold text-background hover:bg-gold/90 font-bold" onClick={submitWithdrawal}>Подать заявку</Button>
                </div>
              </div>
            </div>
          )}

          {withdrawals.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
              <Icon name="Inbox" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Заявок на вывод ещё нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => {
                const s = WITHDRAW_STATUS_MAP[w.status];
                return (
                  <div key={w.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">{w.id}</div>
                        <div className="font-display font-bold text-lg text-gold mt-0.5">₽ {w.amount.toLocaleString("ru-RU")}</div>
                        <div className="text-xs text-muted-foreground">Комиссия {w.commission}% · {w.requisiteType}</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full border ${s.color}`}>{s.label}</span>
                        <div className="text-xs text-muted-foreground mt-1">{w.date}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Итого к получению: <span className="text-foreground font-semibold">₽ {Math.round(w.amount * (1 - w.commission / 100)).toLocaleString("ru-RU")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}