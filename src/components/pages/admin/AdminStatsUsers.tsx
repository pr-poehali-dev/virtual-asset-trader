import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLATFORM_COMMISSION } from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import { api, apiErrorMessage, type ApiAdminStats } from "@/api/client";
import type { AppUser } from "@/components/data/constants";

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

// ─── STATS TAB ────────────────────────────────────────────────────────────────

export function AdminStatsTab() {
  const [stats, setStats] = useState<ApiAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="animate-fade-in">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" className="border-border text-xs" onClick={load}>
          <Icon name="RefreshCw" size={13} className="mr-1.5" />Обновить
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {[
          { icon: "CheckCircle", label: "Всего сделок", value: stats.totalDeals.toLocaleString("ru-RU"), color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
          { icon: "Banknote", label: "Продано", value: `₽ ${Math.round(stats.totalVolume).toLocaleString("ru-RU")}`, color: "text-gold", bg: "bg-gold/10 border-gold/20" },
          { icon: "TrendingUp", label: "Успешных", value: `${stats.successRate}%`, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
          { icon: "Users", label: "Пользователей", value: stats.registeredUsers.toLocaleString("ru-RU"), color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${s.bg}`}>
              <Icon name={s.icon} size={18} className={s.color} />
            </div>
            <div className={`font-display font-bold text-xl mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Пользователи по статусу */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">Пользователи по статусу</h3>
          <div className="space-y-3">
            {(["active", "frozen", "blocked"] as const).map((st) => (
              <div key={st} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span>
                <span className="font-display font-bold text-sm text-foreground">{stats.usersByStatus[st] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Доходы */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">Доходы</h3>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="font-display font-black text-4xl text-gold">{PLATFORM_COMMISSION}%</span>
            <span className="text-muted-foreground text-sm">комиссия</span>
          </div>
          <div className="text-xs text-muted-foreground mb-2">Заработано всего:</div>
          <div className="font-display font-bold text-xl text-gold">₽ {Math.round(stats.commissionEarned).toLocaleString("ru-RU")}</div>
        </div>

        {/* Ожидающие выводы */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">Ожидающие выводы</h3>
          <div className="font-display font-bold text-3xl text-amber-400 mb-1">{stats.pendingWithdrawals}</div>
          <div className="text-xs text-muted-foreground mb-3">заявок на сумму</div>
          <div className="font-display font-bold text-lg text-foreground">₽ {Math.round(stats.pendingWithdrawalsVolume).toLocaleString("ru-RU")}</div>
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
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-display font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                        {u.username}
                        {u.isOwner && <span className="text-[9px] text-gold/80 font-bold bg-gold/15 px-1.5 py-0.5 rounded border border-gold/20">Владелец</span>}
                        {u.role === "admin" && !u.isOwner && <span className="text-[9px] text-red-400/80 font-bold bg-red-400/15 px-1.5 py-0.5 rounded border border-red-400/20">Админ</span>}
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
