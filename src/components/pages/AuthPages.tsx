import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api, apiErrorMessage } from "@/api/client";
import {
  INITIAL_REQUISITES,
  INITIAL_WITHDRAWALS,
  WITHDRAW_STATUS_MAP,
  WithdrawRequest,
  PLATFORM_COMMISSION,
  HOLD_CATEGORIES,
} from "@/components/data/constants";

// ─── FROZEN PAGE ──────────────────────────────────────────────────────────────

export function FrozenPage({ reason, onSupport }: { reason?: string; onSupport: () => void }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in px-4">
      <div className="text-center max-w-md w-full">
        <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-6">
          <Icon name="Snowflake" size={36} className="text-amber-400" />
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground mb-3">Аккаунт заморожен</h1>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          Ваш аккаунт был заморожен администрацией платформы.
        </p>
        {reason && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 mb-6 text-sm text-amber-400">
            <span className="font-semibold">Причина: </span>{reason}
          </div>
        )}
        <p className="text-sm text-muted-foreground mb-8">
          Для разморозки обратитесь в техническую поддержку.
        </p>
        <Button
          className="bg-gold text-background hover:bg-gold/90 font-semibold"
          onClick={onSupport}
        >
          <Icon name="MessageCircle" size={15} className="mr-2" />
          Написать в поддержку
        </Button>
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────

export function LoginPage({
  onRegister,
  onFrozen,
}: {
  onRegister: () => void;
  onFrozen: (reason?: string) => void;
}) {
  const { login, users } = useAuth();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!loginValue || !password) {
      setError("Заполните все поля");
      return;
    }
    const result = login(loginValue, password);
    if (result === "ok") return;
    if (result === "frozen") {
      const found = users.find(
        (u) =>
          u.email.toLowerCase() === loginValue.toLowerCase() ||
          u.username.toLowerCase() === loginValue.toLowerCase()
      );
      onFrozen(found?.freezeReason);
      return;
    }
    if (result === "blocked") {
      setError("Ваш аккаунт заблокирован. Обратитесь в поддержку.");
      return;
    }
    setError("Неверный email / имя пользователя или пароль");
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
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Email или имя пользователя
              </label>
              <Input
                placeholder="your@email.com или username"
                value={loginValue}
                onChange={(e) => {
                  setLoginValue(e.target.value);
                  setError("");
                }}
                className="bg-background border-border text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Пароль</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="bg-background border-border text-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <Icon name="AlertCircle" size={12} />
                {error}
              </p>
            )}

            <Button
              className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
              onClick={handleLogin}
            >
              Войти
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Нет аккаунта?{" "}
              <button onClick={onRegister} className="text-gold hover:underline font-semibold">
                Зарегистрироваться
              </button>
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
    if (!username || !email || !password || !password2) {
      setError("Заполните все поля");
      return;
    }
    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }
    const result = register(username, email, password);
    if (result === "exists") {
      setError("Этот никнейм или email уже занят — выберите другой");
      return;
    }
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
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Имя пользователя
              </label>
              <Input
                placeholder="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                className="bg-background border-border text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Email</label>
              <Input
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="bg-background border-border text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Пароль</label>
              <Input
                type="password"
                placeholder="мин. 6 символов"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="bg-background border-border text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Повторите пароль
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password2}
                onChange={(e) => {
                  setPassword2(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                className="bg-background border-border text-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <Icon name="AlertCircle" size={12} />
                {error}
              </p>
            )}

            <Button
              className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
              onClick={handleRegister}
            >
              Создать аккаунт
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Уже есть аккаунт?{" "}
              <button onClick={onLogin} className="text-gold hover:underline font-semibold">
                Войти
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CABINET / PROFILE ────────────────────────────────────────────────────────

type CabinetTab = "overview" | "notifications" | "withdrawals" | "deposit";

export function CabinetPage({ setActive }: { setActive: (s: string) => void }) {
  const { user, logout, markNotifRead, addDeposit } = useAuth();
  const { format } = useCurrency();

  const [tab, setTab] = useState<CabinetTab>("overview");

  // ── Withdrawals state ──
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [activeRequisites] = useState(INITIAL_REQUISITES.filter((r) => r.active));
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [wAmount, setWAmount] = useState("");
  const [wReqId, setWReqId] = useState("");
  const [wError, setWError] = useState("");

  // ── Deposit state ──
  const [depAmount, setDepAmount] = useState("");
  const [depCurrency, setDepCurrency] = useState("RUB");
  const [depReqType, setDepReqType] = useState("");
  const [depSuccess, setDepSuccess] = useState(false);
  const [depError, setDepError] = useState("");

  // Загружаем выводы из API при открытии вкладки
  useEffect(() => {
    if (!user || tab !== "withdrawals") return;
    api.finance.myWithdrawals()
      .then(({ withdrawals: list }) => setWithdrawals(list.map((w) => ({
        id: w.id, userId: user.id, username: user.username,
        amount: w.amount, currency: w.currency, commission: w.commission,
        toReceive: w.toReceive, requisiteType: w.requisiteType,
        requisiteDetails: w.requisiteDetails, status: w.status as WithdrawRequest["status"],
        date: w.date,
      }))))
      .catch(() => {});
  }, [user, tab]);

  if (!user) {
    return <LoginPage onRegister={() => setActive("register")} onFrozen={() => {}} />;
  }

  const balanceRUB = user.balances.RUB ?? 0;
  const lockedRUB = user.lockedBalances.RUB ?? 0;

  // commission preview
  const wAmountNum = parseFloat(wAmount) || 0;
  const commissionAmount = Math.round(wAmountNum * (PLATFORM_COMMISSION / 100));
  const toReceive = Math.max(0, wAmountNum - commissionAmount);

  const submitWithdrawal = async () => {
    setWError("");
    if (!wAmount || !wReqId) { setWError("Заполните все поля"); return; }
    const amount = parseFloat(wAmount);
    if (isNaN(amount) || amount <= 0) { setWError("Введите корректную сумму"); return; }
    if (amount > balanceRUB) { setWError("Недостаточно средств на балансе"); return; }
    const req = activeRequisites.find((r) => r.id === wReqId);
    if (!req) { setWError("Выберите реквизит"); return; }
    try {
      const res = await api.finance.withdraw({
        amount,
        currency: "RUB",
        requisite_type: req.name,
        requisite_details: req.details,
        commission: PLATFORM_COMMISSION,
      });
      const newWd: WithdrawRequest = {
        id: res.id,
        userId: user.id,
        username: user.username,
        amount,
        currency: "RUB",
        commission: PLATFORM_COMMISSION,
        toReceive: res.to_receive,
        requisiteType: req.name,
        requisiteDetails: req.details,
        status: "pending",
        date: new Date().toLocaleDateString("ru-RU"),
      };
      setWithdrawals((prev) => [newWd, ...prev]);
      setWAmount(""); setWReqId(""); setWError("");
      setShowWithdrawForm(false);
    } catch (e) {
      setWError(apiErrorMessage(e));
    }
  };

  const submitDeposit = () => {
    setDepError("");
    setDepSuccess(false);
    if (!depAmount || !depReqType) {
      setDepError("Заполните все поля");
      return;
    }
    const amount = parseFloat(depAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepError("Введите корректную сумму");
      return;
    }
    addDeposit({
      userId: user.id,
      username: user.username,
      amount,
      currency: depCurrency,
      requisiteType: depReqType,
    });
    setDepAmount("");
    setDepReqType("");
    setDepSuccess(true);
  };

  const TABS: { key: CabinetTab; label: string }[] = [
    { key: "overview", label: "Обзор" },
    { key: "notifications", label: "Уведомления" },
    { key: "withdrawals", label: "Выводы" },
    { key: "deposit", label: "Пополнение баланса" },
  ];

  const unreadCount = user.notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-xl font-bold text-gold">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-xl text-foreground">{user.username}</h1>
              {user.role === "admin" && (
                <span className="text-[10px] text-red-400/80 font-bold bg-red-400/15 px-1.5 py-0.5 rounded border border-red-400/20">
                  Администратор
                </span>
              )}
              {user.role === "staff" && (
                <span className="text-[10px] text-blue-400/80 font-bold bg-blue-400/15 px-1.5 py-0.5 rounded border border-blue-400/20">
                  Персонал
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ID: <span className="text-foreground font-mono">{user.accountId}</span>
            </p>
            <p className="text-xs text-muted-foreground">На платформе с {user.joined}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-border text-muted-foreground hover:text-red-400 hover:border-red-400/30"
          onClick={logout}
        >
          <Icon name="LogOut" size={14} className="mr-1.5" />
          Выйти
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-surface border border-border rounded-xl mb-8 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-gold text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.key === "notifications" && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="animate-fade-in space-y-5">
          {/* Balance cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <Icon name="Wallet" size={20} className="text-gold mb-3" />
              <div className="font-display font-bold text-2xl text-foreground">
                ₽ {balanceRUB.toLocaleString("ru-RU")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Баланс (RUB)</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <Icon name="Lock" size={20} className="text-amber-400 mb-3" />
              <div className="font-display font-bold text-2xl text-foreground">
                ₽ {lockedRUB.toLocaleString("ru-RU")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Заморожено (RUB)</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <Icon name="CheckCircle" size={20} className="text-emerald-400 mb-3" />
              <div className="font-display font-bold text-2xl text-foreground">{user.deals}</div>
              <div className="text-xs text-muted-foreground mt-1">Сделок завершено</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <Icon name="Package" size={20} className="text-blue-400 mb-3" />
              <div className="font-display font-bold text-2xl text-foreground">
                {user.products.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Активных товаров</div>
            </div>
          </div>

          {/* User info */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-display font-semibold text-sm text-foreground mb-4">Мои данные</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ID аккаунта</span>
                <span className="text-foreground font-mono text-xs">{user.accountId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Роль</span>
                <span className="text-foreground">
                  {user.role === "admin"
                    ? "Администратор"
                    : user.role === "staff"
                    ? "Персонал"
                    : "Пользователь"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">На платформе с</span>
                <span className="text-foreground">{user.joined}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Верификация</span>
                {user.verified ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                    <Icon name="ShieldCheck" size={13} className="text-emerald-400" />
                    Верифицирован
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Icon name="Shield" size={13} />
                    Не верифицирован
                  </span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1">
              <Icon name="Lock" size={10} />
              Личные данные видны только вам и администраторам
            </p>
          </div>

          {/* Withdrawal note */}
          {lockedRUB > 0 && (
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 text-sm text-amber-400 flex items-start gap-3">
              <Icon name="Info" size={16} className="mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Заморожено ₽ {lockedRUB.toLocaleString("ru-RU")}.</span>{" "}
                {user.verified
                  ? "Верифицированные продавцы получают средства сразу после продажи, кроме CS2/PUBG товаров (холд до окончания периода удержания)."
                  : "Не верифицированные пользователи получают средства через 2 дня после продажи. CS2/PUBG — после окончания периода холда."}
              </div>
            </div>
          )}

          {/* Верификация — кнопка если не верифицирован */}
          {!user.verified && (
            <button
              onClick={() => setActive("verify")}
              className="w-full text-left bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-5 hover:border-emerald-400/40 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="ShieldCheck" size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-sm text-foreground mb-0.5">
                      Верифицировать аккаунт
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Мгновенный вывод средств и значок доверия
                    </div>
                  </div>
                </div>
                <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-emerald-400 transition-colors" />
              </div>
            </button>
          )}

          {/* Link to seller profile */}
          <button
            onClick={() => setActive(`seller-${user.id}`)}
            className="w-full text-left bg-surface border border-border rounded-xl p-5 hover:border-gold/40 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-semibold text-sm text-foreground mb-1">
                  Страница продавца
                </div>
                <div className="text-xs text-muted-foreground">
                  Посмотреть, как вас видят другие покупатели
                </div>
              </div>
              <Icon
                name="ExternalLink"
                size={16}
                className="text-muted-foreground group-hover:text-gold transition-colors"
              />
            </div>
          </button>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab === "notifications" && (
        <div className="animate-fade-in space-y-3">
          <h2 className="font-display font-semibold text-base text-foreground mb-4">
            Уведомления
          </h2>
          {user.notifications.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
              <Icon name="Bell" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Уведомлений пока нет</p>
            </div>
          ) : (
            user.notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && markNotifRead(n.id)}
                className={`bg-surface border rounded-xl p-4 cursor-pointer transition-colors ${
                  n.read
                    ? "border-border opacity-60"
                    : "border-gold/30 hover:border-gold/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      n.shield
                        ? "bg-blue-400/10 border border-blue-400/30"
                        : "bg-gold/10 border border-gold/30"
                    }`}
                  >
                    <Icon
                      name={n.shield ? "ShieldAlert" : "Bell"}
                      size={15}
                      className={n.shield ? "text-blue-400" : "text-gold"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-foreground">{n.title}</span>
                      {n.shield && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-400/15 text-blue-400 border border-blue-400/20">
                          Оповещение
                        </span>
                      )}
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gold ml-auto shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.date}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── WITHDRAWALS ── */}
      {tab === "withdrawals" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-base text-foreground">Заявки на вывод</h2>
            <Button
              size="sm"
              className="bg-gold text-background hover:bg-gold/90 font-bold"
              onClick={() => {
                setShowWithdrawForm(true);
                setWError("");
              }}
            >
              <Icon name="Plus" size={14} className="mr-1.5" />
              Создать заявку
            </Button>
          </div>

          {/* Info about withdrawal timing */}
          <div className="bg-surface border border-border rounded-xl p-4 mb-5 text-xs text-muted-foreground flex items-start gap-2">
            <Icon name="Info" size={14} className="mt-0.5 shrink-0 text-gold" />
            <div>
              {user.verified ? (
                <>
                  <span className="font-semibold text-foreground">Верифицированный аккаунт:</span>{" "}
                  вывод доступен сразу после зачисления средств от продажи (кроме CS2/PUBG — после
                  окончания холда).
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground">Не верифицирован:</span> вывод
                  доступен через 2 дня после продажи. Товары CS2/PUBG — после окончания периода
                  удержания. Пройдите верификацию для вывода без ожидания.
                </>
              )}
            </div>
          </div>

          {showWithdrawForm && (
            <div className="bg-surface border border-gold/20 rounded-xl p-5 mb-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">
                Новая заявка на вывод
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Сумма (₽)</label>
                  <Input
                    placeholder="1000"
                    value={wAmount}
                    onChange={(e) => {
                      setWAmount(e.target.value);
                      setWError("");
                    }}
                    type="number"
                    min="1"
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Реквизит для вывода
                  </label>
                  <select
                    value={wReqId}
                    onChange={(e) => {
                      setWReqId(e.target.value);
                      setWError("");
                    }}
                    className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
                  >
                    <option value="">Выберите реквизит...</option>
                    {activeRequisites.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} — {r.details}
                      </option>
                    ))}
                  </select>
                </div>

                {wAmountNum > 0 && (
                  <div className="bg-background border border-border rounded-lg p-3 text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Сумма вывода</span>
                      <span>₽ {wAmountNum.toLocaleString("ru-RU")}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Комиссия платформы ({PLATFORM_COMMISSION}%)</span>
                      <span className="text-red-400">- ₽ {commissionAmount.toLocaleString("ru-RU")}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                      <span>К получению</span>
                      <span className="text-gold">₽ {toReceive.toLocaleString("ru-RU")}</span>
                    </div>
                  </div>
                )}

                {wError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <Icon name="AlertCircle" size={12} />
                    {wError}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-border"
                    onClick={() => {
                      setShowWithdrawForm(false);
                      setWError("");
                      setWAmount("");
                      setWReqId("");
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-gold text-background hover:bg-gold/90 font-bold"
                    onClick={submitWithdrawal}
                  >
                    Подать заявку
                  </Button>
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
                const s = WITHDRAW_STATUS_MAP[w.status] ?? {
                  label: w.status,
                  color: "text-muted-foreground bg-muted/10 border-border",
                };
                return (
                  <div key={w.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">{w.id}</div>
                        <div className="font-display font-bold text-lg text-gold mt-0.5">
                          ₽ {w.amount.toLocaleString("ru-RU")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Комиссия {w.commission}% · {w.requisiteType}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full border ${s.color}`}>
                          {s.label}
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">{w.date}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      К получению:{" "}
                      <span className="text-foreground font-semibold">
                        ₽ {w.toReceive.toLocaleString("ru-RU")}
                      </span>
                    </div>
                    {w.requisiteDetails && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Реквизиты: <span className="text-foreground">{w.requisiteDetails}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DEPOSIT ── */}
      {tab === "deposit" && (
        <div className="animate-fade-in">
          <h2 className="font-display font-semibold text-base text-foreground mb-5">
            Пополнение баланса
          </h2>

          {/* Requisites list */}
          <div className="mb-6 space-y-3">
            <h3 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              Доступные реквизиты для пополнения
            </h3>
            {INITIAL_REQUISITES.filter((r) => r.active).map((r) => (
              <div
                key={r.id}
                className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                  <Icon
                    name={
                      r.type === "Криптовалюта"
                        ? "Bitcoin"
                        : r.type === "Электронный кошелёк"
                        ? "Wallet"
                        : "CreditCard"
                    }
                    size={16}
                    className="text-gold"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-foreground">{r.details}</div>
                  <div className="text-xs text-muted-foreground">{r.currency}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Deposit form */}
          <div className="bg-surface border border-gold/20 rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">
              Создать заявку на пополнение
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Сумма</label>
                <Input
                  placeholder="1000"
                  value={depAmount}
                  onChange={(e) => {
                    setDepAmount(e.target.value);
                    setDepError("");
                    setDepSuccess(false);
                  }}
                  type="number"
                  min="1"
                  className="bg-background border-border text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Валюта</label>
                <select
                  value={depCurrency}
                  onChange={(e) => {
                    setDepCurrency(e.target.value);
                    setDepError("");
                    setDepSuccess(false);
                  }}
                  className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
                >
                  <option value="RUB">RUB — Российский рубль</option>
                  <option value="USDT">USDT — Tether</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Способ пополнения
                </label>
                <select
                  value={depReqType}
                  onChange={(e) => {
                    setDepReqType(e.target.value);
                    setDepError("");
                    setDepSuccess(false);
                  }}
                  className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
                >
                  <option value="">Выберите реквизит...</option>
                  {INITIAL_REQUISITES.filter((r) => r.active).map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name} — {r.details}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                После отправки платежа на указанные реквизиты создайте заявку. Администратор
                подтвердит поступление средств и зачислит их на ваш баланс.
              </p>

              {depError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <Icon name="AlertCircle" size={12} />
                  {depError}
                </p>
              )}

              {depSuccess && (
                <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-lg p-3 text-xs text-emerald-400 flex items-center gap-2">
                  <Icon name="CheckCircle" size={14} />
                  Заявка создана! Ожидайте подтверждения от администратора.
                </div>
              )}

              <Button
                className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
                onClick={submitDeposit}
              >
                Создать заявку на пополнение
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SELLER PROFILE (public) ──────────────────────────────────────────────────

export function SellerProfilePage({
  sellerId,
  setActive,
}: {
  sellerId: string;
  setActive: (s: string) => void;
}) {
  const { users, user: me, addReview, buyProduct } = useAuth();
  const { format } = useCurrency();

  const seller = users.find((u) => u.id === sellerId);

  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const [buyError, setBuyError] = useState<Record<number, string>>({});
  const [buySuccess, setBuySuccess] = useState<Record<number, boolean>>({});

  if (!seller) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-muted-foreground">
        <Icon name="UserX" size={40} className="mx-auto mb-4 opacity-30" />
        <p>Продавец не найден</p>
      </div>
    );
  }

  const avgRating =
    seller.reviews.length
      ? (seller.reviews.reduce((s, r) => s + r.rating, 0) / seller.reviews.length).toFixed(1)
      : null;

  // Masked account ID: show first 8 chars, rest as *
  const maskedAccountId =
    seller.accountId.length > 8
      ? seller.accountId.slice(0, 8) + "*".repeat(seller.accountId.length - 8)
      : seller.accountId;

  const handleReview = () => {
    setReviewError("");
    if (!me) {
      setReviewError("Войдите в аккаунт, чтобы оставить отзыв");
      return;
    }
    if (!reviewText.trim()) {
      setReviewError("Напишите текст отзыва");
      return;
    }
    const result = addReview(seller.id, {
      fromUserId: me.id,
      fromUser: me.username,
      rating: reviewRating,
      text: reviewText.trim(),
      date: new Date().toLocaleDateString("ru-RU"),
    });
    if (result === "not_buyer") {
      setReviewError("Отзыв можно оставить только после покупки у этого продавца");
      return;
    }
    setReviewText("");
    setReviewSuccess(true);
  };

  const handleBuy = (product: (typeof seller.products)[0]) => {
    if (!me) {
      setBuyError((prev) => ({ ...prev, [product.id]: "Войдите в аккаунт" }));
      return;
    }
    const result = buyProduct(product, seller);
    if (result === "ok") {
      setBuySuccess((prev) => ({ ...prev, [product.id]: true }));
      setBuyError((prev) => ({ ...prev, [product.id]: "" }));
    } else if (result === "no_balance") {
      setBuyError((prev) => ({ ...prev, [product.id]: "Недостаточно средств на балансе" }));
    } else if (result === "self") {
      setBuyError((prev) => ({ ...prev, [product.id]: "Нельзя купить собственный товар" }));
    }
  };

  const hasHold = (category: string) => !!HOLD_CATEGORIES[category];
  const holdDays = (category: string) => HOLD_CATEGORIES[category];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <button
        onClick={() => setActive("catalog")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <Icon name="ArrowLeft" size={14} />
        Назад в каталог
      </button>

      {/* Seller header */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-2xl font-bold text-gold shrink-0">
            {seller.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-display font-bold text-2xl text-foreground">{seller.username}</h1>
              {seller.verified ? (
                <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  <Icon name="ShieldCheck" size={11} />
                  Верифицирован
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground text-xs bg-muted/10 border border-border px-2 py-0.5 rounded-full">
                  <Icon name="Shield" size={11} />
                  Не верифицирован
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {avgRating && (
                <span className="flex items-center gap-1">
                  <Icon name="Star" size={13} className="text-gold" />
                  {avgRating}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Icon name="MessageSquare" size={13} />
                {seller.reviews.length} отзывов
              </span>
              <span className="flex items-center gap-1">
                <Icon name="ShoppingBag" size={13} />
                {seller.deals} сделок
              </span>
              <span className="flex items-center gap-1">
                <Icon name="Calendar" size={13} />с {seller.joined}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              ID: {maskedAccountId}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: products + reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products */}
          <div>
            <h2 className="font-display font-semibold text-base text-foreground mb-4">
              Товары продавца
            </h2>
            {seller.products.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted-foreground">
                <Icon name="Package" size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Нет активных товаров</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {seller.products.map((p) => (
                  <div
                    key={p.id}
                    className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2 relative"
                  >
                    {p.boosted && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">
                          ТОП
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                    <h3 className="font-display font-semibold text-sm text-foreground pr-8">
                      {p.title}
                    </h3>
                    <div className="font-display font-bold text-lg text-gold">
                      {format(p.price)}
                    </div>

                    {hasHold(p.category) && (
                      <div className="text-xs text-amber-400 flex items-center gap-1 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-1">
                        <Icon name="Clock" size={11} />
                        Холд {holdDays(p.category)} дней после покупки
                      </div>
                    )}

                    {buySuccess[p.id] ? (
                      <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                        <Icon name="CheckCircle" size={12} />
                        Куплено! Сделка создана.
                      </div>
                    ) : (
                      <>
                        {buyError[p.id] && (
                          <p className="text-xs text-red-400 flex items-center gap-1">
                            <Icon name="AlertCircle" size={11} />
                            {buyError[p.id]}
                          </p>
                        )}
                        <Button
                          size="sm"
                          className="bg-gold text-background hover:bg-gold/90 font-semibold mt-auto"
                          onClick={() => handleBuy(p)}
                        >
                          Купить
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews list */}
          <div>
            <h2 className="font-display font-semibold text-base text-foreground mb-4">Отзывы</h2>
            {seller.reviews.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
                Отзывов пока нет
              </div>
            ) : (
              <div className="space-y-3">
                {seller.reviews.map((r) => (
                  <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {r.fromUser[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm text-foreground">{r.fromUser}</span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Icon
                            key={s}
                            name="Star"
                            size={11}
                            className={s <= r.rating ? "text-gold" : "text-border"}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review form */}
          {me && me.id !== seller.id && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-3">
                Оставить отзыв
              </h3>

              {reviewSuccess ? (
                <div className="text-xs text-emerald-400 flex items-center gap-1">
                  <Icon name="CheckCircle" size={13} />
                  Отзыв успешно добавлен!
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setReviewRating(s)}>
                        <Icon
                          name="Star"
                          size={20}
                          className={s <= reviewRating ? "text-gold" : "text-border"}
                        />
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Напишите отзыв..."
                    value={reviewText}
                    onChange={(e) => {
                      setReviewText(e.target.value);
                      setReviewError("");
                    }}
                    className="bg-background border-border text-sm mb-3"
                  />
                  {reviewError && (
                    <p className="text-xs text-amber-400 flex items-center gap-1 mb-3">
                      <Icon name="AlertTriangle" size={12} />
                      {reviewError}
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="bg-gold text-background hover:bg-gold/90 font-semibold"
                    onClick={handleReview}
                  >
                    Отправить отзыв
                  </Button>
                </>
              )}
            </div>
          )}

          {!me && (
            <div className="bg-surface border border-border rounded-xl p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Icon name="Info" size={14} className="text-gold shrink-0" />
              Войдите в аккаунт, чтобы оставить отзыв или купить товар.
            </div>
          )}
        </div>

        {/* Right: stats sidebar */}
        <div>
          <div className="bg-surface border border-border rounded-xl p-5 sticky top-24">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">
              Статистика продавца
            </h3>
            <div className="space-y-3">
              {[
                ["Рейтинг", avgRating ?? "—"],
                ["Всего отзывов", String(seller.reviews.length)],
                ["Завершено сделок", String(seller.deals)],
                ["Товаров в продаже", String(seller.products.length)],
                ["На платформе с", seller.joined],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground font-semibold">{v}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Верификация</span>
                  {seller.verified ? (
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <Icon name="ShieldCheck" size={11} />
                      Верифицирован
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Icon name="Shield" size={11} />
                      Не верифицирован
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}