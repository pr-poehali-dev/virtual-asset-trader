import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LIVE_DEALS,
  SITE_STATS,
  ADMIN_PASSWORD,
  Requisite,
  INITIAL_REQUISITES,
  INITIAL_WITHDRAWALS,
  WITHDRAW_STATUS_MAP,
  WithdrawRequest,
  DEPOSIT_STATUS_MAP,
  PLATFORM_COMMISSION,
  StaffPermission,
} from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import type { AppUser } from "@/components/data/constants";

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      onSuccess();
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center justify-center mx-auto mb-4">
              <Icon name="ShieldAlert" size={28} className="text-red-400" />
            </div>
            <h1 className="font-display font-bold text-xl text-foreground mb-1">
              Панель администратора
            </h1>
            <p className="text-xs text-muted-foreground">
              Доступ только для авторизованных администраторов
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Пароль администратора
              </label>
              <Input
                type="password"
                placeholder="Введите пароль..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className={`bg-background border-border ${error ? "border-red-400/60" : ""}`}
              />
              {error && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <Icon name="AlertCircle" size={12} />
                  Неверный пароль
                </p>
              )}
            </div>
            <Button
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold"
              onClick={handleLogin}
            >
              Войти в панель
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  frozen: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  blocked: "text-red-400 bg-red-400/10 border-red-400/30",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Активен",
  frozen: "Заморожен",
  blocked: "Заблокирован",
};

let reqCounter = INITIAL_REQUISITES.length + 1;
function genReqId() {
  return `req-${String(reqCounter++).padStart(3, "0")}`;
}

const ALL_PERMISSIONS: { id: StaffPermission; label: string }[] = [
  { id: "manage_users", label: "Управление пользователями" },
  { id: "manage_deals", label: "Управление сделками" },
  { id: "manage_withdrawals", label: "Управление выводами" },
  { id: "manage_deposits", label: "Управление пополнениями" },
  { id: "manage_requisites", label: "Управление реквизитами" },
  { id: "manage_staff", label: "Управление сотрудниками" },
  { id: "arbiter", label: "Арбитр" },
];

type AdminTab =
  | "stats"
  | "users"
  | "deals"
  | "requisites"
  | "withdrawals"
  | "deposits"
  | "staff";

// ─── DISPUTE RESOLVE BUTTONS ──────────────────────────────────────────────────
// Separate component so hooks are called at top level of a component

function DisputeResolveButtons({ dealId }: { dealId: string }) {
  const { resolveDispute } = useAuth();
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => resolveDispute(dealId, true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 font-semibold flex items-center gap-1"
      >
        <Icon name="RotateCcw" size={11} />
        Вернуть покупателю
      </button>
      <button
        onClick={() => resolveDispute(dealId, false)}
        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 font-semibold flex items-center gap-1"
      >
        <Icon name="CheckCircle" size={11} />
        Выплатить продавцу
      </button>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────

export function AdminPage() {
  const {
    users,
    deals: contextDeals,
    deposits: contextDeposits,
    updateUsers,
    addStaff,
    removeStaff,
    updateStaffPerms,
    assignArbiter,
    confirmDeposit,
    rejectDeposit,
    addNotification,
  } = useAuth();

  const [tab, setTab] = useState<AdminTab>("stats");
  const [search, setSearch] = useState("");

  // Confirm action modal for freeze/block
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    action: AppUser["status"];
    reason: string;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  // Requisites
  const [requisites, setRequisites] = useState<Requisite[]>(INITIAL_REQUISITES);
  const [reqForm, setReqForm] = useState<Partial<Requisite & { currency: string }> | null>(null);

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>(INITIAL_WITHDRAWALS);
  const [withdrawCommission, setWithdrawCommission] = useState(PLATFORM_COMMISSION);

  // Deals — arbiter assignment local state
  const [arbiterSelect, setArbiterSelect] = useState<Record<string, string>>({});

  // Staff management
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [newStaffUserId, setNewStaffUserId] = useState("");
  const [newStaffPerms, setNewStaffPerms] = useState<StaffPermission[]>([]);
  const [editingPermsId, setEditingPermsId] = useState<string | null>(null);
  const [editingPerms, setEditingPerms] = useState<StaffPermission[]>([]);

  // Deposits: use live context deposits (pending only)
  const pendingDeposits = contextDeposits.filter((d) => d.status === "pending");

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.accountId.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalVolume = LIVE_DEALS.reduce((s, d) => s + d.amount, 0);
  const totalDeals = LIVE_DEALS.length;
  const registeredUsers = users.filter((u) => u.role === "user").length;

  const updateStatus = (userId: string, status: AppUser["status"], reason: string) => {
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      return {
        ...u,
        status,
        ...(status === "blocked" ? { blockReason: reason || "Нарушение правил платформы" } : {}),
        ...(status === "frozen"
          ? { freezeReason: reason || "Подозрительная активность на платформе" }
          : {}),
        ...(status === "active" ? { blockReason: undefined, freezeReason: undefined } : {}),
      };
    });
    updateUsers(updated);
    setConfirmAction(null);
    setReasonInput("");
  };

  const handleAssignArbiter = (dealId: string) => {
    const arbiterId = arbiterSelect[dealId];
    if (!arbiterId) return;
    assignArbiter(dealId, arbiterId);
    addNotification(arbiterId, {
      type: "dispute",
      title: "Назначен арбитром",
      text: `Вы назначены арбитром по сделке ${dealId}.`,
      shield: true,
    });
  };

  const staffUsers = users.filter((u) => u.role === "admin" || u.role === "staff");
  const arbiterUsers = users.filter(
    (u) =>
      u.role === "admin" ||
      (u.role === "staff" && u.staffPermissions?.includes("arbiter"))
  );

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: "stats", label: "Статистика", icon: "BarChart2" },
    { id: "users", label: "Пользователи", icon: "Users" },
    { id: "deals", label: "Сделки", icon: "ArrowRightLeft" },
    { id: "requisites", label: "Реквизиты", icon: "CreditCard" },
    { id: "withdrawals", label: "Выводы", icon: "Banknote" },
    { id: "deposits", label: "Пополнения", icon: "PlusCircle" },
    { id: "staff", label: "Сотрудники", icon: "UserCheck" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center justify-center">
          <Icon name="ShieldAlert" size={24} className="text-red-400" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">
            Панель администратора
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">Gorant Shop Admin</span>
            <span className="text-[10px] text-red-400/70 font-semibold bg-red-400/20 px-1.5 py-0.5 rounded">
              Системный доступ
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-surface border border-border rounded-xl mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-red-500/20 text-red-400 border border-red-400/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── STATS ── */}
      {tab === "stats" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
            {[
              {
                icon: "CheckCircle",
                label: "Всего сделок",
                value: String(totalDeals),
                color: "text-emerald-400",
                bg: "bg-emerald-400/10 border-emerald-400/20",
              },
              {
                icon: "Banknote",
                label: "Продано",
                value: `₽ ${totalVolume.toLocaleString("ru-RU")}`,
                color: "text-gold",
                bg: "bg-gold/10 border-gold/20",
              },
              {
                icon: "TrendingUp",
                label: "Успешных",
                value: `${SITE_STATS.successRate}%`,
                color: "text-blue-400",
                bg: "bg-blue-400/10 border-blue-400/20",
              },
              {
                icon: "Users",
                label: "Пользователей",
                value: String(registeredUsers),
                color: "text-purple-400",
                bg: "bg-purple-400/10 border-purple-400/20",
              },
            ].map((s) => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${s.bg}`}
                >
                  <Icon name={s.icon} size={18} className={s.color} />
                </div>
                <div className={`font-display font-bold text-xl mb-1 ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">
                Пользователи по статусу
              </h3>
              <div className="space-y-3">
                {(["active", "frozen", "blocked"] as const).map((st) => {
                  const count = users.filter((u) => u.status === st).length;
                  return (
                    <div key={st} className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[st]}`}
                      >
                        {STATUS_LABEL[st]}
                      </span>
                      <span className="font-display font-bold text-sm text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">Доходы</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-display font-black text-4xl text-gold">
                  {PLATFORM_COMMISSION}%
                </span>
                <span className="text-muted-foreground text-sm">комиссия</span>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Заработано с {totalDeals} сделок:
              </div>
              <div className="font-display font-bold text-xl text-gold">
                ₽ {Math.round(totalVolume * (PLATFORM_COMMISSION / 100)).toLocaleString("ru-RU")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        <div className="animate-fade-in">
          <div className="mb-5">
            <div className="relative max-w-sm">
              <Icon
                name="Search"
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Поиск по имени, email, ID аккаунта..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background border-border text-sm h-9"
              />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  {["Пользователь", "ID аккаунта", "Email", "Статус", "Сделки", "Действия"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-border last:border-0 transition-colors ${
                      u.status === "blocked"
                        ? "bg-red-400/5"
                        : u.status === "frozen"
                        ? "bg-amber-400/5"
                        : "hover:bg-background/30"
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-display font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                            {u.username}
                            {u.isOwner && (
                              <span className="text-[9px] text-gold/80 font-bold bg-gold/15 px-1.5 py-0.5 rounded border border-gold/20">
                                Владелец
                              </span>
                            )}
                            {u.role === "admin" && !u.isOwner && (
                              <span className="text-[9px] text-red-400/80 font-bold bg-red-400/15 px-1.5 py-0.5 rounded border border-red-400/20">
                                Админ
                              </span>
                            )}
                            {u.role === "staff" && (
                              <span className="text-[9px] text-blue-400/80 font-bold bg-blue-400/15 px-1.5 py-0.5 rounded border border-blue-400/20">
                                Стафф
                              </span>
                            )}
                            {u.verified && (
                              <Icon name="ShieldCheck" size={10} className="text-emerald-400" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">с {u.joined}</div>
                          {u.status === "blocked" && (
                            <div className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
                              <Icon name="Ban" size={9} />
                              {u.blockReason || "Заблокирован"}
                            </div>
                          )}
                          {u.status === "frozen" && (
                            <div className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                              <Icon name="Snowflake" size={9} />
                              {u.freezeReason || "Подозрительная активность"}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{u.accountId}</td>
                    <td className="p-4 text-muted-foreground text-xs">{u.email}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[u.status]}`}
                      >
                        {STATUS_LABEL[u.status]}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{u.deals}</td>
                    <td className="p-4">
                      {u.isOwner ? (
                        <span className="text-xs text-muted-foreground">Неприкосновенен</span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {u.status !== "active" && (
                            <button
                              onClick={() => updateStatus(u.id, "active", "")}
                              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors font-semibold border border-emerald-400/20"
                            >
                              Разблокировать
                            </button>
                          )}
                          {u.status !== "frozen" && (
                            <button
                              onClick={() => {
                                setConfirmAction({ userId: u.id, action: "frozen", reason: "" });
                                setReasonInput("");
                              }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors font-semibold border border-amber-400/20"
                            >
                              Заморозить
                            </button>
                          )}
                          {u.status !== "blocked" && (
                            <button
                              onClick={() => {
                                setConfirmAction({ userId: u.id, action: "blocked", reason: "" });
                                setReasonInput("");
                              }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors font-semibold border border-red-400/20"
                            >
                              Заблокировать
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Confirm dialog */}
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-400/10 flex items-center justify-center">
                    <Icon
                      name="AlertTriangle"
                      size={20}
                      className={
                        confirmAction.action === "frozen" ? "text-amber-400" : "text-red-400"
                      }
                    />
                  </div>
                  <div>
                    <div className="font-display font-bold text-base text-foreground">
                      Подтверждение
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {confirmAction.action === "blocked" ? "Заблокировать" : "Заморозить"}{" "}
                      пользователя?
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Причина (необязательно)
                  </label>
                  <Input
                    placeholder="Укажите причину..."
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-border"
                    onClick={() => setConfirmAction(null)}
                  >
                    Отмена
                  </Button>
                  <Button
                    className={`flex-1 text-white font-bold ${
                      confirmAction.action === "frozen"
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                    onClick={() =>
                      updateStatus(confirmAction.userId, confirmAction.action, reasonInput)
                    }
                  >
                    {confirmAction.action === "blocked" ? "Заблокировать" : "Заморозить"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DEALS ── */}
      {tab === "deals" && (
        <div className="animate-fade-in space-y-4">
          {/* Static live deals table */}
          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[650px]">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  {[
                    "ID",
                    "Товар",
                    "Покупатель",
                    "Продавец",
                    "Сумма",
                    `Комиссия ${PLATFORM_COMMISSION}%`,
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LIVE_DEALS.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border last:border-0 hover:bg-background/30"
                  >
                    <td className="p-4 text-xs text-muted-foreground font-mono">{d.id}</td>
                    <td className="p-4 font-display font-semibold text-foreground text-xs">
                      {d.product}
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">{d.buyer}</td>
                    <td className="p-4 text-muted-foreground text-xs">{d.seller}</td>
                    <td className="p-4 font-display font-bold text-gold">
                      ₽ {d.amount.toLocaleString("ru-RU")}
                    </td>
                    <td className="p-4 text-emerald-400 font-semibold">
                      ₽{" "}
                      {Math.round(d.amount * (PLATFORM_COMMISSION / 100)).toLocaleString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-background/50 border-t border-gold/20">
                  <td colSpan={4} className="p-4 font-display font-bold text-foreground text-xs">
                    Итого
                  </td>
                  <td className="p-4 font-display font-bold text-gold">
                    ₽ {totalVolume.toLocaleString("ru-RU")}
                  </td>
                  <td className="p-4 font-display font-bold text-emerald-400">
                    ₽{" "}
                    {Math.round(totalVolume * (PLATFORM_COMMISSION / 100)).toLocaleString("ru-RU")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Live context deals (disputes etc.) */}
          {contextDeals.length > 0 && (
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground mb-3">
                Активные сделки платформы
              </h3>
              <div className="space-y-3">
                {contextDeals.map((deal) => (
                  <div key={deal.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{deal.id}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              deal.status === "dispute"
                                ? "text-red-400 bg-red-400/10 border-red-400/30"
                                : deal.status === "completed"
                                ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
                                : "text-amber-400 bg-amber-400/10 border-amber-400/30"
                            }`}
                          >
                            {deal.status}
                          </span>
                        </div>
                        <div className="font-display font-semibold text-sm text-foreground">
                          {deal.product}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {deal.buyerName} → {deal.sellerName} · ₽{" "}
                          {deal.amount.toLocaleString("ru-RU")}
                        </div>
                      </div>

                      {/* Arbiter assignment for dispute deals */}
                      {deal.status === "dispute" && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={arbiterSelect[deal.id] ?? deal.arbiterId ?? ""}
                            onChange={(e) =>
                              setArbiterSelect((prev) => ({
                                ...prev,
                                [deal.id]: e.target.value,
                              }))
                            }
                            className="h-8 px-2 rounded-md bg-background border border-border text-xs text-foreground"
                          >
                            <option value="">Выбрать арбитра...</option>
                            {arbiterUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.username}
                              </option>
                            ))}
                          </select>
                          {arbiterSelect[deal.id] && (
                            <button
                              onClick={() => handleAssignArbiter(deal.id)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 font-semibold"
                            >
                              Назначить
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dispute messages preview */}
                    {deal.status === "dispute" &&
                      deal.disputeMessages &&
                      deal.disputeMessages.length > 0 && (
                        <div className="bg-background border border-border rounded-lg p-3 mb-3 space-y-1 max-h-32 overflow-y-auto">
                          {deal.disputeMessages.map((msg, i) => (
                            <div key={i} className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{msg.from}</span>
                              {" · "}
                              {msg.text}
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Resolve dispute buttons */}
                    {deal.status === "dispute" && <DisputeResolveButtons dealId={deal.id} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REQUISITES ── */}
      {tab === "requisites" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-base text-foreground">
              Реквизиты для оплаты
            </h2>
            <Button
              size="sm"
              className="bg-gold text-background hover:bg-gold/90 font-bold"
              onClick={() =>
                setReqForm({ name: "", type: "", details: "", currency: "RUB", active: true })
              }
            >
              <Icon name="Plus" size={14} className="mr-1.5" />
              Добавить
            </Button>
          </div>

          {reqForm !== null && (
            <div className="bg-surface border border-gold/20 rounded-xl p-5 mb-6">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">
                {reqForm.id ? "Редактировать реквизит" : "Новый реквизит"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Название</label>
                  <Input
                    placeholder="Сбербанк"
                    value={reqForm.name || ""}
                    onChange={(e) => setReqForm((p) => ({ ...p, name: e.target.value }))}
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
                  <Input
                    placeholder="Банковская карта"
                    value={reqForm.type || ""}
                    onChange={(e) => setReqForm((p) => ({ ...p, type: e.target.value }))}
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Реквизиты</label>
                  <Input
                    placeholder="4276 **** **** 1234"
                    value={reqForm.details || ""}
                    onChange={(e) => setReqForm((p) => ({ ...p, details: e.target.value }))}
                    className="bg-background border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Валюта</label>
                  <select
                    value={reqForm.currency || "RUB"}
                    onChange={(e) => setReqForm((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
                  >
                    <option value="RUB">RUB</option>
                    <option value="USDT">USDT</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!reqForm.active}
                    onChange={(e) => setReqForm((p) => ({ ...p, active: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground">Активен (отображается пользователям)</span>
                </label>
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border"
                    onClick={() => setReqForm(null)}
                  >
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gold text-background hover:bg-gold/90 font-bold"
                    onClick={() => {
                      if (!reqForm.name || !reqForm.type || !reqForm.details) return;
                      if (reqForm.id) {
                        setRequisites((prev) =>
                          prev.map((r) =>
                            r.id === reqForm.id ? ({ ...r, ...reqForm } as Requisite) : r
                          )
                        );
                      } else {
                        setRequisites((prev) => [
                          ...prev,
                          {
                            id: genReqId(),
                            name: reqForm.name!,
                            type: reqForm.type!,
                            details: reqForm.details!,
                            currency: reqForm.currency || "RUB",
                            active: !!reqForm.active,
                          },
                        ]);
                      }
                      setReqForm(null);
                    }}
                  >
                    Сохранить
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {requisites.map((r) => (
              <div
                key={r.id}
                className={`bg-surface border rounded-xl p-4 flex items-center gap-4 ${
                  !r.active ? "opacity-50 border-border" : "border-border"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    r.active
                      ? "bg-gold/10 border border-gold/20"
                      : "bg-secondary border border-border"
                  }`}
                >
                  <Icon
                    name={
                      r.type === "Криптовалюта"
                        ? "Bitcoin"
                        : r.type === "Электронный кошелёк"
                        ? "Wallet"
                        : "CreditCard"
                    }
                    size={18}
                    className={r.active ? "text-gold" : "text-muted-foreground"}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-sm text-foreground">
                      {r.name}
                    </span>
                    <span className="text-xs text-muted-foreground">· {r.type}</span>
                    <span className="text-xs font-mono text-muted-foreground">· {r.currency}</span>
                    {!r.active && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        Неактивна
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{r.details}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <button
                    onClick={() =>
                      setRequisites((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x))
                      )
                    }
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                      r.active
                        ? "bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400/20"
                        : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20"
                    }`}
                  >
                    {r.active ? "Деактивировать" : "Активировать"}
                  </button>
                  <button
                    onClick={() => setReqForm({ ...r })}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 font-semibold"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => setRequisites((prev) => prev.filter((x) => x.id !== r.id))}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WITHDRAWALS ── */}
      {tab === "withdrawals" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
            <h2 className="font-display font-semibold text-base text-foreground">
              Заявки на вывод
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Комиссия вывода:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={withdrawCommission}
                  onChange={(e) => setWithdrawCommission(Number(e.target.value))}
                  className="bg-background border-border text-sm h-8 w-20 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {withdrawals.length === 0 && (
              <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
                <Icon name="Inbox" size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Заявок на вывод нет</p>
              </div>
            )}
            {withdrawals.map((w) => {
              const s = WITHDRAW_STATUS_MAP[w.status] ?? {
                label: w.status,
                color: "text-muted-foreground bg-muted/10 border-border",
              };
              const toReceive = Math.round(w.amount * (1 - withdrawCommission / 100));
              return (
                <div key={w.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{w.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>
                          {s.label}
                        </span>
                      </div>
                      <div className="font-display font-bold text-lg text-gold">
                        ₽ {w.amount.toLocaleString("ru-RU")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {w.username} · {w.requisiteType} · {w.requisiteDetails}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Дата: {w.date} · К выплате:{" "}
                        <span className="text-foreground font-semibold">
                          ₽ {toReceive.toLocaleString("ru-RU")}
                        </span>{" "}
                        (комиссия {withdrawCommission}%)
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      {w.status === "pending" && (
                        <button
                          onClick={() =>
                            setWithdrawals((prev) =>
                              prev.map((x) =>
                                x.id === w.id ? { ...x, status: "processing" } : x
                              )
                            )
                          }
                          className="text-xs px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 font-semibold"
                        >
                          В обработку
                        </button>
                      )}
                      {w.status === "processing" && (
                        <button
                          onClick={() =>
                            setWithdrawals((prev) =>
                              prev.map((x) =>
                                x.id === w.id ? { ...x, status: "done" } : x
                              )
                            )
                          }
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 font-semibold"
                        >
                          Выплачено ✓
                        </button>
                      )}
                      {(w.status === "pending" || w.status === "processing") && (
                        <button
                          onClick={() =>
                            setWithdrawals((prev) =>
                              prev.map((x) =>
                                x.id === w.id ? { ...x, status: "rejected" } : x
                              )
                            )
                          }
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold"
                        >
                          Отклонить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DEPOSITS ── */}
      {tab === "deposits" && (
        <div className="animate-fade-in">
          <h2 className="font-display font-semibold text-base text-foreground mb-5">
            Заявки на пополнение
          </h2>

          {pendingDeposits.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
              <Icon name="Inbox" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Нет ожидающих заявок на пополнение</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDeposits.map((dep) => {
                const s = DEPOSIT_STATUS_MAP[dep.status] ?? {
                  label: dep.status,
                  color: "text-muted-foreground bg-muted/10 border-border",
                };
                return (
                  <div key={dep.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{dep.id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>
                            {s.label}
                          </span>
                        </div>
                        <div className="font-display font-bold text-lg text-gold">
                          {dep.amount.toLocaleString("ru-RU")} {dep.currency}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dep.username} · {dep.requisiteType}
                        </div>
                        <div className="text-xs text-muted-foreground">Дата: {dep.date}</div>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <button
                          onClick={() => confirmDeposit(dep.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 font-semibold flex items-center gap-1"
                        >
                          <Icon name="CheckCircle" size={11} />
                          Успешное пополнение
                        </button>
                        <button
                          onClick={() => rejectDeposit(dep.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold flex items-center gap-1"
                        >
                          <Icon name="XCircle" size={11} />
                          Оплата не обнаружена
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STAFF ── */}
      {tab === "staff" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-base text-foreground">Сотрудники</h2>
            <Button
              size="sm"
              className="bg-gold text-background hover:bg-gold/90 font-bold"
              onClick={() => {
                setAddStaffOpen(true);
                setNewStaffUserId("");
                setNewStaffPerms([]);
              }}
            >
              <Icon name="UserPlus" size={14} className="mr-1.5" />
              Добавить сотрудника
            </Button>
          </div>

          {/* Add staff form */}
          {addStaffOpen && (
            <div className="bg-surface border border-gold/20 rounded-xl p-5 mb-6">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">
                Новый сотрудник
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Пользователь</label>
                  <select
                    value={newStaffUserId}
                    onChange={(e) => setNewStaffUserId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
                  >
                    <option value="">Выберите пользователя...</option>
                    {users
                      .filter((u) => u.role === "user")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username} ({u.email})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Права доступа</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newStaffPerms.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewStaffPerms((prev) => [...prev, perm.id]);
                            } else {
                              setNewStaffPerms((prev) => prev.filter((p) => p !== perm.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-foreground">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border"
                    onClick={() => setAddStaffOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gold text-background hover:bg-gold/90 font-bold"
                    onClick={() => {
                      if (!newStaffUserId) return;
                      addStaff(newStaffUserId, newStaffPerms);
                      setAddStaffOpen(false);
                    }}
                  >
                    Добавить
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Staff list */}
          <div className="space-y-3">
            {staffUsers.length === 0 && (
              <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
                <Icon name="Users" size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Сотрудников пока нет</p>
              </div>
            )}
            {staffUsers.map((u) => (
              <div key={u.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-sm font-bold text-gold">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold text-sm text-foreground">
                          {u.username}
                        </span>
                        {u.isOwner && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">
                            Владелец
                          </span>
                        )}
                        {u.role === "admin" && !u.isOwner && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-400/20 text-red-400 border border-red-400/30">
                            Администратор
                          </span>
                        )}
                        {u.role === "staff" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-400 border border-blue-400/30">
                            Сотрудник
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>

                  {/* Actions — disabled for owner */}
                  {!u.isOwner && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPermsId(u.id);
                          setEditingPerms(u.staffPermissions ?? []);
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 font-semibold"
                      >
                        Права
                      </button>
                      <button
                        onClick={() => removeStaff(u.id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold"
                      >
                        Снять
                      </button>
                    </div>
                  )}
                </div>

                {/* Permissions display */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(u.staffPermissions ?? []).length === 0 && u.role !== "admin" && (
                    <span className="text-xs text-muted-foreground">Нет прав</span>
                  )}
                  {u.role === "admin" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-400/10 text-red-400 border border-red-400/20">
                      Полный доступ
                    </span>
                  )}
                  {u.role !== "admin" &&
                    (u.staffPermissions ?? []).map((perm) => {
                      const label = ALL_PERMISSIONS.find((p) => p.id === perm)?.label ?? perm;
                      return (
                        <span
                          key={perm}
                          className="text-xs px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20"
                        >
                          {label}
                        </span>
                      );
                    })}
                </div>

                {/* Inline permission editor */}
                {editingPermsId === u.id && (
                  <div className="bg-background border border-border rounded-lg p-4 mt-2">
                    <p className="text-xs text-muted-foreground font-semibold mb-3">
                      Редактирование прав: {u.username}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {ALL_PERMISSIONS.map((perm) => (
                        <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingPerms.includes(perm.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingPerms((prev) => [...prev, perm.id]);
                              } else {
                                setEditingPerms((prev) => prev.filter((p) => p !== perm.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-foreground">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border"
                        onClick={() => setEditingPermsId(null)}
                      >
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gold text-background hover:bg-gold/90 font-bold"
                        onClick={() => {
                          updateStaffPerms(u.id, editingPerms);
                          setEditingPermsId(null);
                        }}
                      >
                        Сохранить
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
