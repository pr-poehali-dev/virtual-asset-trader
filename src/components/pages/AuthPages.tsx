import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api, apiErrorMessage, type ApiDepositRequisite } from "@/api/client";
import { WithdrawalRequisitesTab } from "@/components/pages/WithdrawalRequisites";
import { PartnerPage as PartnerPageInline } from "@/components/pages/PartnerPage";
import {
  INITIAL_REQUISITES,
  INITIAL_WITHDRAWALS,
  WITHDRAW_STATUS_MAP,
  WithdrawRequest,
  PLATFORM_COMMISSION,
  HOLD_CATEGORIES,
} from "@/components/data/constants";

// ─── FROZEN PAGE ──────────────────────────────────────────────────────────────

export function FrozenPage({
  reason,
  blocked,
  onSupport,
}: {
  reason?: string;
  blocked?: boolean;
  onSupport: () => void;
}) {
  const color = blocked ? "red" : "amber";
  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in px-4">
      <div className="text-center max-w-md w-full">
        <div
          className={`w-20 h-20 rounded-2xl bg-${color}-400/10 border border-${color}-400/30 flex items-center justify-center mx-auto mb-6`}
        >
          <Icon
            name={blocked ? "Ban" : "Snowflake"}
            size={36}
            className={`text-${color}-400`}
          />
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground mb-3">
          {blocked ? "Аккаунт заблокирован" : "Аккаунт заморожен"}
        </h1>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          {blocked
            ? "Ваш аккаунт был заблокирован. Доступ к большинству функций ограничен."
            : "Ваш аккаунт был заморожен администрацией платформы."}
        </p>
        {reason && (
          <div
            className={`bg-${color}-400/10 border border-${color}-400/20 rounded-xl p-4 mb-6 text-sm text-${color}-400`}
          >
            <span className="font-semibold">Причина: </span>
            {reason}
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
  return (
    <div className="space-y-2">
      <div className="relative flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">или войти через</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div ref={containerRef} />
    </div>
  );
}

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
          u.username.toLowerCase() === loginValue.toLowerCase(),
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
            <h1 className="font-display font-bold text-xl text-foreground mb-1">
              Вход в аккаунт
            </h1>
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
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Пароль
              </label>
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

// ─── REGISTER PAGE ────────────────────────────────────────────────────────────

export function RegisterPage({ onLogin }: { onLogin: () => void }) {
  const { register } = useAuth();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(
      () => setResendTimer((p) => Math.max(0, p - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [resendTimer]);

  const handleSendCode = async () => {
    setError("");
    if (!username.trim() || !email.trim() || !password || !password2) {
      setError("Заполните все поля");
      return;
    }
    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      setError("Пароль не менее 6 символов");
      return;
    }
    if (!email.includes("@")) {
      setError("Введите корректный email");
      return;
    }
    setSending(true);
    try {
      await api.emailVerify.send(email.trim().toLowerCase());
      setStep("verify");
      setResendTimer(60);
    } catch (e) {
      const ae = e as { error?: string };
      if (ae?.error === "email_taken")
        setError("Этот email уже зарегистрирован");
      else if (ae?.error === "too_soon")
        setError("Подождите перед повторной отправкой");
      else if (ae?.error === "send_failed")
        setError("Не удалось отправить письмо. Проверьте email.");
      else setError("Ошибка отправки. Попробуйте снова.");
    }
    setSending(false);
  };

  const handleVerify = async () => {
    setError("");
    if (!code.trim()) {
      setError("Введите код из письма");
      return;
    }
    setRegistering(true);
    try {
      const { verified } = await api.emailVerify.check(
        email.trim().toLowerCase(),
        code.trim(),
      );
      if (!verified) {
        setError("Неверный код");
        setRegistering(false);
        return;
      }
      const result = register(username, email, password);
      if (result === "exists") {
        setError("Никнейм или email уже занят");
      }
    } catch {
      setError("Неверный или просроченный код");
    }
    setRegistering(false);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setSending(true);
    try {
      await api.emailVerify.send(email.trim().toLowerCase());
      setResendTimer(60);
      setError("");
    } catch {
      setError("Ошибка повторной отправки");
    }
    setSending(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in px-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-border rounded-2xl p-8">
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4">
              <Icon
                name={step === "verify" ? "Mail" : "UserPlus"}
                size={22}
                className="text-gold"
              />
            </div>
            <h1 className="font-display font-bold text-xl text-foreground mb-1">
              {step === "verify" ? "Подтверждение email" : "Регистрация"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {step === "verify"
                ? `Код отправлен на ${email}`
                : "Создайте аккаунт Gorant Shop"}
            </p>
          </div>

          {step === "form" ? (
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
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                  Email
                </label>
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
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                  Пароль
                </label>
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
                  onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
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
                onClick={handleSendCode}
                disabled={sending}
              >
                {sending ? (
                  <Icon name="Loader" size={15} className="animate-spin mr-2" />
                ) : null}
                {sending ? "Отправляем код..." : "Получить код подтверждения"}
              </Button>

              <VKIDWidget onError={setError} />

              <p className="text-center text-xs text-muted-foreground">
                Уже есть аккаунт?{" "}
                <button
                  onClick={onLogin}
                  className="text-gold hover:underline font-semibold"
                >
                  Войти
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Письмо с кодом отправлено на
                </p>
                <p className="font-semibold text-sm text-foreground">{email}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                  Код из письма
                </label>
                <Input
                  placeholder="123456"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  className="bg-background border-border text-sm text-center font-mono text-lg tracking-widest"
                  maxLength={6}
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
                onClick={handleVerify}
                disabled={registering || code.length < 6}
              >
                {registering ? (
                  <Icon name="Loader" size={15} className="animate-spin mr-2" />
                ) : (
                  <Icon name="CheckCircle" size={15} className="mr-2" />
                )}
                Подтвердить и создать аккаунт
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setStep("form");
                    setCode("");
                    setError("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0 || sending}
                  className={`font-semibold ${resendTimer > 0 ? "text-muted-foreground" : "text-gold hover:underline"}`}
                >
                  {resendTimer > 0
                    ? `Повторно через ${resendTimer}с`
                    : "Отправить снова"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ВКЛАДКА ПОПОЛНЕНИЯ (полный флоу) ────────────────────────────────────────

const DEPOSIT_TIMEOUT_MIN = 15;

function DepositTab() {
  const { user } = useAuth();
  type Phase = "form" | "awaiting" | "processing" | "cancelled" | "expired";

  const [phase, setPhase] = useState<Phase>("form");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [depId, setDepId] = useState("");
  const [requisite, setRequisite] = useState<ApiDepositRequisite | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  // Восстанавливаем активную заявку при монтировании
  useEffect(() => {
    if (!user) return;
    api.finance
      .depositActive()
      .then(({ deposit }) => {
        if (!deposit) return;
        if (deposit.status === "awaiting_payment" && deposit.expiresAt) {
          const exp = new Date(deposit.expiresAt);
          if (exp > new Date()) {
            setDepId(deposit.id);
            setRequisite(deposit.requisite);
            setExpiresAt(exp);
            setAmount(String(deposit.amount));
            setPhase("awaiting");
            return;
          }
        }
        if (deposit.status === "pending") {
          setPhase("processing");
          setDepId(deposit.id);
          setAmount(String(deposit.amount));
          setCurrency(deposit.currency);
        }
      })
      .catch(() => {});
  }, [user]);

  // Таймер
  useEffect(() => {
    if (phase !== "awaiting" || !expiresAt) return;
    const tick = () => {
      const diff = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      );
      setTimeLeft(diff);
      if (diff === 0) {
        setShowExpiredModal(true);
        setPhase("expired");
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [phase, expiresAt]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const pct = expiresAt
    ? Math.round((timeLeft / (DEPOSIT_TIMEOUT_MIN * 60)) * 100)
    : 100;
  const timerColor =
    timeLeft < 120
      ? "text-red-400"
      : timeLeft < 300
        ? "text-amber-400"
        : "text-emerald-400";

  const handleCreate = async () => {
    setError("");
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError("Введите корректную сумму");
      return;
    }
    setLoading(true);
    try {
      const res = await api.finance.deposit(num, currency);
      setDepId(res.id);
      setRequisite(res.requisite);
      setExpiresAt(new Date(res.expiresAt));
      setPhase("awaiting");
    } catch (e) {
      const ae = e as { error?: string };
      if (ae?.error === "no_requisites")
        setError("Реквизиты временно недоступны. Обратитесь в поддержку.");
      else if (ae?.error === "already_pending")
        setError("У вас уже есть активная заявка.");
      else setError(apiErrorMessage(e));
    }
    setLoading(false);
  };

  const handlePaid = async () => {
    setLoading(true);
    try {
      await api.finance.depositPaid(depId);
      setPhase("processing");
    } catch {
      setError("Ошибка. Попробуйте снова.");
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await api.finance.depositCancel(depId);
    } catch {
      /* ignore */
    }
    setPhase("cancelled");
    setLoading(false);
  };

  // ── Форма ввода суммы ─────────────────────────────────────────────────────
  if (phase === "form")
    return (
      <div className="animate-fade-in max-w-md">
        <h2 className="font-display font-semibold text-base text-foreground mb-5">
          Пополнение баланса
        </h2>
        <div className="bg-surface border border-gold/20 rounded-xl p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Введите сумму — мы выдадим реквизиты для перевода. У вас будет{" "}
            {DEPOSIT_TIMEOUT_MIN} минут на оплату.
          </p>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Сумма пополнения
            </label>
            <Input
              type="number"
              min="1"
              placeholder="100"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="bg-background border-border text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Валюта
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
            >
              <option value="RUB">RUB — Российский рубль</option>
              <option value="USDT">USDT — Tether</option>
            </select>
          </div>
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <Icon name="AlertCircle" size={12} />
              {error}
            </p>
          )}
          <Button
            className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <Icon name="Loader" size={15} className="animate-spin mr-2" />
            ) : null}
            Получить реквизиты
          </Button>
        </div>
      </div>
    );

  // ── Ожидание оплаты ───────────────────────────────────────────────────────
  if (phase === "awaiting")
    return (
      <div className="animate-fade-in max-w-md space-y-4">
        <h2 className="font-display font-semibold text-base text-foreground">
          Пополнение баланса
        </h2>

        {/* Таймер */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Время на оплату
            </span>
            <span
              className={`font-display font-bold text-2xl tabular-nums ${timerColor}`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${timeLeft < 120 ? "bg-red-400" : timeLeft < 300 ? "bg-amber-400" : "bg-emerald-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Сумма */}
        <div className="bg-gold/5 border border-gold/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Сумма к переводу
          </span>
          <span className="font-display font-bold text-xl text-gold">
            {parseFloat(amount).toLocaleString("ru-RU")} {currency}
          </span>
        </div>

        {/* Реквизиты */}
        {requisite && (
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon
                name={
                  requisite.type === "crypto"
                    ? "Bitcoin"
                    : requisite.type === "sbp"
                      ? "Smartphone"
                      : "CreditCard"
                }
                size={16}
                className="text-gold"
              />
              <h3 className="font-display font-semibold text-sm text-foreground">
                {requisite.name}
              </h3>
              {requisite.bank && (
                <span className="text-xs text-muted-foreground">
                  · {requisite.bank}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3">
              <span className="font-mono text-base text-foreground font-semibold flex-1 select-all">
                {requisite.details}
              </span>
              <button
                onClick={() => copy(requisite.details)}
                className="text-xs text-gold hover:text-gold/80 flex items-center gap-1 font-semibold shrink-0"
              >
                <Icon name={copied ? "Check" : "Copy"} size={14} />
                {copied ? "Скопировано" : "Копировать"}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-start gap-1.5">
              <Icon
                name="AlertTriangle"
                size={11}
                className="shrink-0 mt-0.5 text-amber-400"
              />
              Переводите ровно указанную сумму. Не закрывайте страницу до
              нажатия «Оплатил».
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <Icon name="AlertCircle" size={12} />
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-border"
            onClick={handleCancel}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            className="flex-1 bg-gold text-background hover:bg-gold/90 font-bold"
            onClick={handlePaid}
            disabled={loading}
          >
            {loading ? (
              <Icon name="Loader" size={14} className="animate-spin mr-1.5" />
            ) : (
              <Icon name="CheckCircle" size={14} className="mr-1.5" />
            )}
            Оплатил
          </Button>
        </div>

        {/* Модалка истечения */}
        {showExpiredModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                  <Icon name="Clock" size={20} className="text-amber-400" />
                </div>
                <h3 className="font-display font-bold text-base text-foreground">
                  Время истекло
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Если вы уже отправили средства, но не успели нажать «Оплатил» —
                не переживайте. Напишите нам в{" "}
                <span className="text-gold font-semibold">
                  службу поддержки
                </span>{" "}
                с указанием суммы и скриншотом перевода — мы зачислим вручную.
              </p>
              <Button
                className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
                onClick={() => {
                  setShowExpiredModal(false);
                  setPhase("form");
                  setAmount("");
                }}
              >
                Понятно
              </Button>
            </div>
          </div>
        )}
      </div>
    );

  // ── В обработке ───────────────────────────────────────────────────────────
  if (phase === "processing")
    return (
      <div className="animate-fade-in max-w-md">
        <h2 className="font-display font-semibold text-base text-foreground mb-5">
          Пополнение баланса
        </h2>
        <div className="bg-emerald-400/5 border border-emerald-400/30 rounded-xl p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mx-auto">
            <Icon name="Clock" size={26} className="text-emerald-400" />
          </div>
          <h3 className="font-display font-bold text-lg text-foreground">
            Заявка на проверке
          </h3>
          <p className="text-sm text-muted-foreground">
            Заявка <span className="font-mono text-foreground">{depId}</span> на
            сумму{" "}
            <span className="font-bold text-gold">
              {parseFloat(amount).toLocaleString("ru-RU")} {currency}
            </span>{" "}
            передана администратору. Средства будут зачислены после
            подтверждения.
          </p>
          <p className="text-xs text-muted-foreground">
            Обычно это занимает от 5 до 24х часов.
          </p>
          <Button
            variant="outline"
            className="border-border text-sm"
            onClick={() => {
              setPhase("form");
              setAmount("");
              setDepId("");
            }}
          >
            Создать ещё одну заявку
          </Button>
        </div>
      </div>
    );

  // ── Отмена / истечение ────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in max-w-md">
      <h2 className="font-display font-semibold text-base text-foreground mb-5">
        Пополнение баланса
      </h2>
      <div className="bg-surface border border-border rounded-xl p-6 text-center space-y-3">
        <Icon
          name="XCircle"
          size={32}
          className="mx-auto text-muted-foreground opacity-40"
        />
        <p className="text-sm text-muted-foreground">
          {phase === "cancelled"
            ? "Пополнение отменено."
            : "Время на оплату истекло."}
        </p>
        <Button
          className="bg-gold text-background hover:bg-gold/90 font-bold"
          onClick={() => {
            setPhase("form");
            setAmount("");
            setDepId("");
          }}
        >
          Попробовать снова
        </Button>
      </div>
    </div>
  );
}

// ─── РАНДОМНЫЙ РЕКВИЗИТ ПОПОЛНЕНИЯ ───────────────────────────────────────────

function DepositRequisiteBlock() {
  const [req, setReq] = useState<ApiDepositRequisite | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .depositRequisite()
      .then(setReq)
      .catch(() => setReq(null))
      .finally(() => setLoading(false));
  }, []);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading)
    return (
      <div className="h-24 bg-surface border border-border rounded-xl animate-pulse mb-6" />
    );
  if (!req) return null;

  return (
    <div className="bg-gold/5 border border-gold/30 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="ArrowDownCircle" size={16} className="text-gold" />
        <h3 className="font-display font-semibold text-sm text-foreground">
          Реквизиты для перевода
        </h3>
        <span className="ml-auto text-[10px] text-muted-foreground bg-background border border-border rounded px-2 py-0.5">
          Актуально
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2.5 border border-border">
          <div>
            <div className="text-xs text-muted-foreground">{req.name}</div>
            <div className="font-mono text-sm text-foreground font-semibold">
              {req.details}
            </div>
            {req.bank && (
              <div className="text-[10px] text-muted-foreground">
                {req.bank}
              </div>
            )}
          </div>
          <button
            onClick={() => copy(req.details)}
            className="text-xs text-gold hover:text-gold/80 flex items-center gap-1 font-semibold shrink-0"
          >
            <Icon name={copied ? "Check" : "Copy"} size={13} />
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 flex items-start gap-1.5">
        <Icon name="Info" size={11} className="shrink-0 mt-0.5" />
        После перевода создайте заявку на пополнение ниже. Реквизиты обновляются
        автоматически.
      </p>
    </div>
  );
}

// ─── CABINET / PROFILE ────────────────────────────────────────────────────────

type CabinetTab =
  | "overview"
  | "notifications"
  | "withdrawals"
  | "deposit"
  | "requisites"
  | "partner";

export function CabinetPage({ setActive }: { setActive: (s: string) => void }) {
  const { user, logout, markNotifRead, addDeposit } = useAuth();
  const { format } = useCurrency();

  const [tab, setTab] = useState<CabinetTab>("overview");

  // ── Withdrawals state ──
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [wAmount, setWAmount] = useState("");
  const [wReqId, setWReqId] = useState("");
  const [wReqLabel, setWReqLabel] = useState("");
  const [wShowReqPicker, setWShowReqPicker] = useState(false);
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
    api.finance
      .myWithdrawals()
      .then(({ withdrawals: list }) =>
        setWithdrawals(
          list.map((w) => ({
            id: w.id,
            userId: user.id,
            username: user.username,
            amount: w.amount,
            currency: w.currency,
            commission: w.commission,
            toReceive: w.toReceive,
            requisiteType: w.requisiteType,
            requisiteDetails: w.requisiteDetails,
            status: w.status as WithdrawRequest["status"],
            date: w.date,
          })),
        ),
      )
      .catch(() => {});
  }, [user, tab]);

  if (!user) {
    return (
      <LoginPage onRegister={() => setActive("register")} onFrozen={() => {}} />
    );
  }

  const balanceRUB = user.balances.RUB ?? 0;
  const lockedRUB = user.lockedBalances.RUB ?? 0;

  // commission preview
  const wAmountNum = parseFloat(wAmount) || 0;
  const commissionAmount = Math.round(wAmountNum * (PLATFORM_COMMISSION / 100));
  const toReceive = Math.max(0, wAmountNum - commissionAmount);

  const submitWithdrawal = async () => {
    setWError("");
    if (!wAmount || !wReqId) {
      setWError("Выберите реквизит и введите сумму");
      return;
    }
    const amount = parseFloat(wAmount);
    if (isNaN(amount) || amount <= 0) {
      setWError("Введите корректную сумму");
      return;
    }
    if (amount > balanceRUB) {
      setWError("Недостаточно средств на балансе");
      return;
    }
    try {
      const res = await api.finance.withdraw({
        amount,
        currency: "RUB",
        requisite_type: wReqLabel,
        requisite_details: wReqId,
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
        requisiteType: wReqLabel,
        requisiteDetails: wReqId,
        status: "pending",
        date: new Date().toLocaleDateString("ru-RU"),
      };
      setWithdrawals((prev) => [newWd, ...prev]);
      setWAmount("");
      setWReqId("");
      setWReqLabel("");
      setWError("");
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

  const isAdminUser =
    user.role === "admin" || user.role === "staff" || user.isOwner;

  const TABS: { key: CabinetTab; label: string }[] = [
    { key: "overview", label: "Обзор" },
    { key: "notifications", label: "Уведомления" },
    { key: "withdrawals", label: "Выводы" },
    { key: "requisites", label: "Реквизиты" },
    { key: "deposit", label: "Пополнение" },
    { key: "partner", label: "Партнёрство" },
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
              <h1 className="font-display font-bold text-xl text-foreground">
                {user.username}
              </h1>
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
              ID:{" "}
              <span className="text-foreground font-mono">
                {user.accountId}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              На платформе с {user.joined}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdminUser && (
            <Button
              size="sm"
              className="bg-red-500/10 text-red-400 border border-red-400/30 hover:bg-red-500/20 font-semibold"
              onClick={() => setActive("admin")}
            >
              <Icon name="ShieldAlert" size={14} className="mr-1.5" />
              Админпанель
            </Button>
          )}
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
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-1 mb-6 sm:mb-8 -mx-1 px-1">
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-max min-w-full sm:w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
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
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="animate-fade-in space-y-5">
          {/* Balance cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-surface border border-border rounded-xl p-3 sm:p-5">
              <Icon
                name="Wallet"
                size={18}
                className="text-gold mb-2 sm:mb-3"
              />
              <div className="font-display font-bold text-lg sm:text-2xl text-foreground">
                ₽ {balanceRUB.toLocaleString("ru-RU")}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Баланс (RUB)
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3 sm:p-5">
              <Icon
                name="Lock"
                size={18}
                className="text-amber-400 mb-2 sm:mb-3"
              />
              <div className="font-display font-bold text-lg sm:text-2xl text-foreground">
                ₽ {lockedRUB.toLocaleString("ru-RU")}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Заморожено
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3 sm:p-5">
              <Icon
                name="CheckCircle"
                size={18}
                className="text-emerald-400 mb-2 sm:mb-3"
              />
              <div className="font-display font-bold text-lg sm:text-2xl text-foreground">
                {user.deals}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Сделок
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3 sm:p-5">
              <Icon
                name="Package"
                size={18}
                className="text-blue-400 mb-2 sm:mb-3"
              />
              <div className="font-display font-bold text-lg sm:text-2xl text-foreground">
                {user.products.length}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Товаров
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-display font-semibold text-sm text-foreground mb-4">
              Мои данные
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ID аккаунта</span>
                <span className="text-foreground font-mono text-xs">
                  {user.accountId}
                </span>
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
                    <Icon
                      name="ShieldCheck"
                      size={13}
                      className="text-emerald-400"
                    />
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
                <span className="font-semibold">
                  Заморожено ₽ {lockedRUB.toLocaleString("ru-RU")}.
                </span>{" "}
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
                    <Icon
                      name="ShieldCheck"
                      size={18}
                      className="text-emerald-400"
                    />
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
                <Icon
                  name="ChevronRight"
                  size={16}
                  className="text-muted-foreground group-hover:text-emerald-400 transition-colors"
                />
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

          {/* Мои товары */}
          <MyProductsList />
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
                      <span className="font-semibold text-sm text-foreground">
                        {n.title}
                      </span>
                      {n.shield && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-400/15 text-blue-400 border border-blue-400/20">
                          Оповещение
                        </span>
                      )}
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gold ml-auto shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {n.text}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {n.date}
                    </p>
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
            <h2 className="font-display font-semibold text-base text-foreground">
              Заявки на вывод
            </h2>
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
                  <span className="font-semibold text-foreground">
                    Верифицированный аккаунт:
                  </span>{" "}
                  вывод доступен сразу после зачисления средств от продажи
                  (кроме CS2/PUBG — после окончания холда).
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground">
                    Не верифицирован:
                  </span>{" "}
                  вывод доступен через 2 дня после продажи. Товары CS2/PUBG —
                  после окончания периода удержания. Пройдите верификацию для
                  вывода без ожидания.
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
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Сумма (₽)
                  </label>
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
                  {wReqId ? (
                    <div className="flex items-center gap-2 p-3 bg-background border border-gold/40 rounded-lg">
                      <Icon
                        name="CreditCard"
                        size={14}
                        className="text-gold shrink-0"
                      />
                      <span className="text-sm text-foreground flex-1 truncate">
                        {wReqLabel}
                      </span>
                      <button
                        onClick={() => {
                          setWReqId("");
                          setWReqLabel("");
                          setWShowReqPicker(true);
                        }}
                        className="text-xs text-gold hover:underline shrink-0"
                      >
                        Изменить
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setWShowReqPicker(true)}
                      className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-muted-foreground text-left hover:border-gold/40 transition-colors flex items-center gap-2"
                    >
                      <Icon name="Plus" size={13} />
                      Выбрать реквизит...
                    </button>
                  )}
                  {wShowReqPicker && (
                    <div className="mt-2 bg-background border border-border rounded-xl overflow-hidden">
                      <WithdrawalRequisitesTab
                        showSelect
                        selectedId={wReqId}
                        onSelect={(id, label) => {
                          setWReqId(id);
                          setWReqLabel(label);
                          setWShowReqPicker(false);
                          setWError("");
                        }}
                      />
                      <div className="p-3 border-t border-border">
                        <button
                          onClick={() => setWShowReqPicker(false)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {wAmountNum > 0 && (
                  <div className="bg-background border border-border rounded-lg p-3 text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Сумма вывода</span>
                      <span>₽ {wAmountNum.toLocaleString("ru-RU")}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Комиссия платформы ({PLATFORM_COMMISSION}%)</span>
                      <span className="text-red-400">
                        - ₽ {commissionAmount.toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                      <span>К получению</span>
                      <span className="text-gold">
                        ₽ {toReceive.toLocaleString("ru-RU")}
                      </span>
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
              <Icon
                name="Inbox"
                size={32}
                className="mx-auto mb-3 opacity-20"
              />
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
                  <div
                    key={w.id}
                    className="bg-surface border border-border rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {w.id}
                        </div>
                        <div className="font-display font-bold text-lg text-gold mt-0.5">
                          ₽ {w.amount.toLocaleString("ru-RU")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Комиссия {w.commission}% · {w.requisiteType}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded-full border ${s.color}`}
                        >
                          {s.label}
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">
                          {w.date}
                        </div>
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
                        Реквизиты:{" "}
                        <span className="text-foreground">
                          {w.requisiteDetails}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REQUISITES ── */}
      {tab === "requisites" && <WithdrawalRequisitesTab />}

      {/* ── PARTNER ── */}
      {tab === "partner" && <PartnerPageInline />}

      {/* ── DEPOSIT ── */}
      {tab === "deposit" && <DepositTab />}
    </div>
  );
}

// ─── MY PRODUCTS LIST (внутри профиля) ───────────────────────────────────────

function MyProductsList() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = () => {
    if (!user) return;
    setLoading(true);
    api.products
      .my()
      .then(({ products: list }) => setProducts(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.products.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* ignore */
    }
    setDeletingId(null);
  };

  if (loading) return null;
  if (products.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-sm text-foreground">
          Мои товары
        </h2>
        <span className="text-xs text-muted-foreground">
          {products.length} активных
        </span>
      </div>
      <div className="space-y-2">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl"
          >
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-sm text-foreground truncate">
                {p.title}
              </div>
              <div className="text-xs text-muted-foreground">{p.category}</div>
            </div>
            <div className="font-display font-bold text-sm text-gold shrink-0">
              {format(p.price)}
            </div>
            {p.boosted && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30 shrink-0">
                ТОП
              </span>
            )}
            <button
              onClick={() => handleDelete(p.id)}
              disabled={deletingId === p.id}
              className="w-7 h-7 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center text-red-400 hover:bg-red-400/20 transition-colors shrink-0 disabled:opacity-40"
              title="Удалить товар"
            >
              {deletingId === p.id ? (
                <Icon name="Loader" size={13} className="animate-spin" />
              ) : (
                <Icon name="Trash2" size={13} />
              )}
            </button>
          </div>
        ))}
      </div>
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
  const { user: me, buyProduct } = useAuth();
  const { format } = useCurrency();

  const [data, setData] = useState<{
    seller: ApiSeller;
    products: ApiProduct[];
    reviews: ApiReview[];
    avgRating: number;
  } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [buyError, setBuyError] = useState<Record<number, string>>({});
  const [buySuccess, setBuySuccess] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api.products
      .seller(sellerId)
      .then(setData)
      .catch(() => setLoadError("Не удалось загрузить профиль продавца"));
  }, [sellerId]);

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-muted-foreground">
        <Icon name="UserX" size={40} className="mx-auto mb-4 opacity-30" />
        <p>{loadError}</p>
        <button
          onClick={() => setActive("catalog")}
          className="mt-4 text-gold text-sm hover:underline"
        >
          ← Назад в каталог
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 flex items-center justify-center">
        <Icon name="Loader" size={28} className="text-gold animate-spin" />
      </div>
    );
  }

  const { seller, products, reviews, avgRating } = data;
  const avgStr = avgRating > 0 ? avgRating.toFixed(1) : null;
  const maskedAccountId =
    seller.accountId.length > 8
      ? seller.accountId.slice(0, 8) + "*".repeat(seller.accountId.length - 8)
      : seller.accountId;

  const hasHold = (category: string) => !!HOLD_CATEGORIES[category];
  const holdDays = (category: string) => HOLD_CATEGORIES[category];

  const handleReview = async () => {
    setReviewError("");
    if (!me) {
      setReviewError("Войдите в аккаунт, чтобы оставить отзыв");
      return;
    }
    if (!reviewText.trim()) {
      setReviewError("Напишите текст отзыва");
      return;
    }
    try {
      await api.finance.review(seller.id, reviewRating, reviewText.trim());
      setReviewText("");
      setReviewSuccess(true);
    } catch {
      setReviewError(
        "Отзыв можно оставить только после покупки у этого продавца",
      );
    }
  };

  const handleBuy = async (p: ApiProduct) => {
    if (!me) {
      setBuyError((prev) => ({ ...prev, [p.id]: "Войдите в аккаунт" }));
      return;
    }
    const result = await buyProduct(
      p as unknown as import("@/context/AuthContext").AppProduct,
      me,
    );
    if (result === "ok") {
      setBuySuccess((prev) => ({ ...prev, [p.id]: true }));
      setBuyError((prev) => ({ ...prev, [p.id]: "" }));
    } else if (result === "no_balance") {
      setBuyError((prev) => ({
        ...prev,
        [p.id]: "Недостаточно средств на балансе",
      }));
    } else if (result === "self") {
      setBuyError((prev) => ({
        ...prev,
        [p.id]: "Нельзя купить собственный товар",
      }));
    }
  };

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
              <h1 className="font-display font-bold text-2xl text-foreground">
                {seller.username}
              </h1>
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
              {avgStr && (
                <span className="flex items-center gap-1">
                  <Icon name="Star" size={13} className="text-gold" />
                  {avgStr}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Icon name="MessageSquare" size={13} />
                {reviews.length} отзывов
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
        <div className="lg:col-span-2 space-y-6">
          {/* Products */}
          <div>
            <h2 className="font-display font-semibold text-base text-foreground mb-4">
              Товары продавца
            </h2>
            {products.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted-foreground">
                <Icon
                  name="Package"
                  size={32}
                  className="mx-auto mb-3 opacity-20"
                />
                <p className="text-sm">Нет активных товаров</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((p) => (
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
                    <p className="text-xs text-muted-foreground">
                      {p.category}
                    </p>
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
                    ) : me?.id === seller.id ? (
                      <div className="text-xs text-muted-foreground bg-background border border-border rounded-lg px-3 py-1.5 flex items-center gap-1.5 mt-auto">
                        <Icon name="Package" size={12} />
                        Это ваш товар
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

          {/* Reviews */}
          <div>
            <h2 className="font-display font-semibold text-base text-foreground mb-4">
              Отзывы
            </h2>
            {reviews.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
                Отзывов пока нет
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-surface border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {r.fromUser[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm text-foreground">
                        {r.fromUser}
                      </span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Icon
                            key={s}
                            name="Star"
                            size={11}
                            className={
                              s <= r.rating ? "text-gold" : "text-border"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {r.date}
                      </span>
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
                          className={
                            s <= reviewRating ? "text-gold" : "text-border"
                          }
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

        {/* Sidebar */}
        <div>
          <div className="bg-surface border border-border rounded-xl p-5 sticky top-24">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">
              Статистика продавца
            </h3>
            <div className="space-y-3">
              {(
                [
                  ["Рейтинг", avgStr ?? "—"],
                  ["Всего отзывов", String(reviews.length)],
                  ["Завершено сделок", String(seller.deals)],
                  ["Товаров в продаже", String(products.length)],
                  ["На платформе с", seller.joined],
                ] as [string, string][]
              ).map(([k, v]) => (
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