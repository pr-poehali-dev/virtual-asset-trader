import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLATFORM_COMMISSION } from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import { api, apiErrorMessage, type ApiAdminStats } from "@/api/client";
import type { AppUser } from "@/components/data/constants";
import { AdminBadge, AdminAvatar } from "@/components/ui/admin-badge";

export const STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  frozen: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  blocked: "text-red-400 bg-red-400/10 border-red-400/30",
};
export const STATUS_LABEL: Record<string, string> = {
  active: "Активен",
  frozen: "Заморожен",
  blocked: "Заблокирован",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "total";
const PERIOD_LABELS: Record<Period, string> = { day: "За день", week: "За неделю", month: "За месяц", total: "За всё время" };

function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-background rounded-lg">
      {(["day", "week", "month", "total"] as Period[]).map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${value === p ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function fmt(n: number) { return `₽\u00A0${Math.round(n).toLocaleString("ru-RU")}`; }

// ─── STATS TAB ────────────────────────────────────────────────────────────────

export function AdminStatsTab() {
  const [stats, setStats] = useState<ApiAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userPeriod, setUserPeriod] = useState<Period>("month");
  const [commPeriod, setCommPeriod] = useState<Period>("month");
  const [wdPeriod, setWdPeriod] = useState<Period>("month");

  const load = () => {
    setLoading(true);
    api.adminExtra.stats()
      .then(setStats)
      .catch((e) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Icon name="Loader" size={24} className="text-gold animate-spin" />
          <p className="text-sm text-muted-foreground">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="animate-fade-in bg-red-400/10 border border-red-400/20 rounded-xl p-6 text-center">
        <Icon name="AlertCircle" size={24} className="text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-400">{error || "Не удалось загрузить статистику"}</p>
        <Button size="sm" variant="outline" className="mt-3 border-border" onClick={load}>Повторить</Button>
      </div>
    );
  }

  const userGrowthVal = userPeriod === "total" ? stats.usersGrowth.total : stats.usersGrowth[userPeriod];
  const commVal = commPeriod === "total" ? stats.commission.total : stats.commission[commPeriod];
  const wdVal = wdPeriod === "total" ? stats.withdrawals.pendingVolume : stats.withdrawals[wdPeriod];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Кнопка обновления */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="border-border text-xs" onClick={load}>
          <Icon name="RefreshCw" size={13} className="mr-1.5" />Обновить
        </Button>
      </div>

      {/* ── Верхние карточки ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: "CheckCircle", label: "Всего сделок", value: stats.totalDeals.toLocaleString("ru-RU"), sub: `${fmt(stats.totalVolume)} оборот`, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
          { icon: "ArrowRightLeft", label: "Открытых сделок", value: stats.openDeals.toLocaleString("ru-RU"), sub: `${fmt(stats.openVolume)} на удержании`, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
          { icon: "TrendingUp", label: "% успешных", value: `${stats.successRate}%`, sub: "от всех сделок", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
          { icon: "Users", label: "Всего пользователей", value: stats.registeredUsers.toLocaleString("ru-RU"), sub: `+${stats.usersGrowth.day} сегодня`, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${s.bg}`}>
              <Icon name={s.icon} size={18} className={s.color} />
            </div>
            <div className={`font-display font-bold text-2xl mb-0.5 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-[10px] mt-1.5 font-semibold ${s.color} opacity-70`}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Три детальных блока ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Прирост пользователей */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Icon name="UserPlus" size={16} className="text-purple-400" />
              <h3 className="font-display font-semibold text-sm text-foreground">Прирост пользователей</h3>
            </div>
          </div>
          <PeriodTabs value={userPeriod} onChange={setUserPeriod} />
          <div>
            <div className="font-display font-bold text-4xl text-purple-400">+{userGrowthVal.toLocaleString("ru-RU")}</div>
            <div className="text-xs text-muted-foreground mt-1">{PERIOD_LABELS[userPeriod].toLowerCase()}</div>
          </div>
          <div className="pt-3 border-t border-border space-y-2">
            {(["active", "frozen", "blocked"] as const).map((st) => (
              <div key={st} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span>
                <span className="font-display font-bold text-sm text-foreground">{stats.usersByStatus[st] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Комиссии сайта */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="Banknote" size={16} className="text-gold" />
            <h3 className="font-display font-semibold text-sm text-foreground">Заработано с комиссии</h3>
          </div>
          <PeriodTabs value={commPeriod} onChange={setCommPeriod} />
          <div>
            <div className="font-display font-bold text-3xl text-gold">{fmt(commVal)}</div>
            <div className="text-xs text-muted-foreground mt-1">{PERIOD_LABELS[commPeriod].toLowerCase()}</div>
          </div>
          <div className="pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
            {([["day", "День"], ["week", "Неделя"], ["month", "Месяц"], ["total", "Всего"]] as const).map(([p, l]) => (
              <div key={p} className="bg-background rounded-lg p-2.5">
                <div className="text-muted-foreground mb-0.5">{l}</div>
                <div className="font-display font-bold text-gold">{fmt(stats.commission[p])}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Icon name="Info" size={10} />
            Ставка комиссии: {PLATFORM_COMMISSION}% от суммы сделки
          </div>
        </div>

        {/* Ожидающие выводы */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="Clock" size={16} className="text-amber-400" />
            <h3 className="font-display font-semibold text-sm text-foreground">Ожидают вывода</h3>
          </div>
          <PeriodTabs value={wdPeriod} onChange={setWdPeriod} />
          <div>
            <div className="font-display font-bold text-4xl text-amber-400">{stats.withdrawals.pendingCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">заявок · {fmt(stats.withdrawals.pendingVolume)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Поданных {PERIOD_LABELS[wdPeriod].toLowerCase()}: <span className="text-foreground font-semibold">{fmt(wdVal)}</span>
            </div>
          </div>
          <div className="pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
            {([["day", "День"], ["week", "Неделя"], ["month", "Месяц"]] as const).map(([p, l]) => (
              <div key={p} className="bg-background rounded-lg p-2.5">
                <div className="text-muted-foreground mb-0.5">{l}</div>
                <div className="font-display font-bold text-amber-400">{fmt(stats.withdrawals[p])}</div>
              </div>
            ))}
            <div className="bg-background rounded-lg p-2.5">
              <div className="text-muted-foreground mb-0.5">На обработке</div>
              <div className="font-display font-bold text-foreground">{fmt(stats.withdrawals.pendingVolume)}</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Открытые сделки — детальная карточка ── */}
      <div className="bg-surface border border-amber-400/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
            <Icon name="ArrowRightLeft" size={16} className="text-amber-400" />
          </div>
          <h3 className="font-display font-semibold text-base text-foreground">Открытые сделки (эскроу)</h3>
          <span className="ml-auto font-display font-bold text-2xl text-amber-400">{stats.openDeals}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Сумма на удержании</div>
            <div className="font-display font-bold text-lg text-amber-400">{fmt(stats.openVolume)}</div>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Комиссия (потенц.)</div>
            <div className="font-display font-bold text-lg text-gold">{fmt(stats.openVolume * PLATFORM_COMMISSION / 100)}</div>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Средняя сумма</div>
            <div className="font-display font-bold text-lg text-foreground">{fmt(stats.openDeals > 0 ? stats.openVolume / stats.openDeals : 0)}</div>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">% от всех сделок</div>
            <div className="font-display font-bold text-lg text-blue-400">
              {stats.totalDeals > 0 ? Math.round(stats.openDeals / (stats.totalDeals + stats.openDeals) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────

export function AdminUsersTab() {
  const { users, updateUsers } = useAuth();
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    action: AppUser["status"];
    reason: string;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Загружаем список пользователей из API
  const loadUsers = () => {
    setLoadingUsers(true);
    api.finance.adminUsers()
      .then(({ users: list }) => {
        // Конвертируем ApiAdminUser → AppUser совместимый формат
        const mapped = list.map((u) => ({
          ...u,
          accountId: u.accountId ?? "",
          isOwner: u.isOwner ?? false,
          balances: { RUB: u.balanceRub ?? 0 },
          lockedBalances: { RUB: u.lockedRub ?? 0 },
          deals: u.dealsCount ?? 0,
          joined: u.joinedAt ?? "",
          balance: u.balanceRub ?? 0,
          products: [],
          reviews: [],
          purchasedProductIds: [],
          notifications: [],
          staffPermissions: (u.staffPerms as import("@/components/data/constants").StaffPermission[]) ?? [],
        } as AppUser));
        updateUsers(mapped);
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.accountId.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = async (userId: string, status: AppUser["status"], reason: string) => {
    setActionError("");
    try {
      await api.finance.adminUserStatus(userId, status, reason);
      // Обновляем локально
      const updated = users.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          status,
          ...(status === "blocked" ? { blockReason: reason || "Нарушение правил платформы" } : {}),
          ...(status === "frozen" ? { freezeReason: reason || "Подозрительная активность на платформе" } : {}),
          ...(status === "active" ? { blockReason: undefined, freezeReason: undefined } : {}),
        };
      });
      updateUsers(updated);
    } catch (e) {
      setActionError(apiErrorMessage(e));
    }
    setConfirmAction(null);
    setReasonInput("");
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="relative max-w-sm flex-1">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, email, ID аккаунта..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border text-sm h-9"
          />
        </div>
        <Button variant="outline" size="sm" className="border-border text-xs ml-3" onClick={loadUsers} disabled={loadingUsers}>
          <Icon name={loadingUsers ? "Loader" : "RefreshCw"} size={13} className={`mr-1.5 ${loadingUsers ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      {actionError && (
        <div className="mb-4 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 text-xs text-red-400 flex items-center gap-2">
          <Icon name="AlertCircle" size={13} />{actionError}
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-background/50">
              {["Пользователь", "ID аккаунта", "Email", "Статус", "Сделки", "Действия"].map((h) => (
                <th key={h} className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className={`border-b border-border last:border-0 transition-colors ${
                u.status === "blocked" ? "bg-red-400/5" : u.status === "frozen" ? "bg-amber-400/5" : "hover:bg-background/30"
              }`}>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {u.role === "admin" || u.isOwner ? (
                      <AdminAvatar size={28} />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                        {u.username[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-display font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                        {u.username}
                        {u.isOwner && <span className="text-[9px] text-gold/80 font-bold bg-gold/15 px-1.5 py-0.5 rounded border border-gold/20">Владелец</span>}
                        {(u.role === "admin" || u.isOwner) && <AdminBadge size="xs" />}
                        {u.role === "staff" && <span className="text-[9px] text-blue-400/80 font-bold bg-blue-400/15 px-1.5 py-0.5 rounded border border-blue-400/20">Стафф</span>}
                        {u.verified && <Icon name="ShieldCheck" size={10} className="text-emerald-400" />}
                      </div>
                      <div className="text-xs text-muted-foreground">с {u.joined}</div>
                      {u.status === "blocked" && <div className="text-xs text-red-400 flex items-center gap-1 mt-0.5"><Icon name="Ban" size={9} />{u.blockReason || "Заблокирован"}</div>}
                      {u.status === "frozen" && <div className="text-xs text-amber-400 flex items-center gap-1 mt-0.5"><Icon name="Snowflake" size={9} />{u.freezeReason || "Подозрительная активность"}</div>}
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-xs text-muted-foreground">{u.accountId}</td>
                <td className="p-4 text-muted-foreground text-xs">{u.email}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
                </td>
                <td className="p-4 text-muted-foreground">{u.deals}</td>
                <td className="p-4">
                  {u.isOwner ? (
                    <span className="text-xs text-muted-foreground">Неприкосновенен</span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {u.status !== "active" && (
                        <button onClick={() => updateStatus(u.id, "active", "")} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors font-semibold border border-emerald-400/20">Разблокировать</button>
                      )}
                      {u.status !== "frozen" && (
                        <button onClick={() => { setConfirmAction({ userId: u.id, action: "frozen", reason: "" }); setReasonInput(""); }} className="text-xs px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors font-semibold border border-amber-400/20">Заморозить</button>
                      )}
                      {u.status !== "blocked" && (
                        <button onClick={() => { setConfirmAction({ userId: u.id, action: "blocked", reason: "" }); setReasonInput(""); }} className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors font-semibold border border-red-400/20">Заблокировать</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-400/10 flex items-center justify-center">
                <Icon name="AlertTriangle" size={20} className={confirmAction.action === "frozen" ? "text-amber-400" : "text-red-400"} />
              </div>
              <div>
                <div className="font-display font-bold text-base text-foreground">Подтверждение</div>
                <div className="text-xs text-muted-foreground">{confirmAction.action === "blocked" ? "Заблокировать" : "Заморозить"} пользователя?</div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">Причина (необязательно)</label>
              <Input placeholder="Укажите причину..." value={reasonInput} onChange={(e) => setReasonInput(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setConfirmAction(null)}>Отмена</Button>
              <Button
                className={`flex-1 text-white font-bold ${confirmAction.action === "frozen" ? "bg-amber-500 hover:bg-amber-600" : "bg-red-500 hover:bg-red-600"}`}
                onClick={() => updateStatus(confirmAction.userId, confirmAction.action, reasonInput)}
              >
                {confirmAction.action === "blocked" ? "Заблокировать" : "Заморозить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}