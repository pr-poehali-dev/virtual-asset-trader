import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USERS, LIVE_DEALS, SITE_STATS, ADMIN_PASSWORD, AppUser } from "@/components/data/constants";

// ─── LOGIN ────────────────────────────────────────────────────────────────────

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
            <h1 className="font-display font-bold text-xl text-foreground mb-1">Панель администратора</h1>
            <p className="text-xs text-muted-foreground">Доступ только для авторизованных администраторов</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Пароль администратора</label>
              <Input
                type="password"
                placeholder="Введите пароль..."
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className={`bg-background border-border ${error ? "border-red-400/60 focus-visible:ring-red-400/30" : ""}`}
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

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

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

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────

export function AdminPage() {
  const [tab, setTab] = useState<"stats" | "users" | "deals">("stats");
  const [users, setUsers] = useState<AppUser[]>(USERS);
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: AppUser["status"] } | null>(null);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = (userId: string, status: AppUser["status"]) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status } : u));
    setConfirmAction(null);
  };

  const totalVolume = LIVE_DEALS.reduce((s, d) => s + d.amount, 0);
  const totalDeals = LIVE_DEALS.length;

  const tabs = [
    { id: "stats", label: "Статистика", icon: "BarChart2" },
    { id: "users", label: "Пользователи", icon: "Users" },
    { id: "deals", label: "Сделки", icon: "ArrowRightLeft" },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center justify-center">
          <Icon name="ShieldAlert" size={24} className="text-red-400" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">Панель администратора</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">Авторизован как:</span>
            <span className="text-xs font-bold text-red-400">Slumon4ik</span>
            <span className="text-[10px] text-red-400/70 font-semibold bg-red-400/20 px-1.5 py-0.5 rounded">Админ</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl mb-8 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-red-500/20 text-red-400 border border-red-400/30" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* STATS */}
      {tab === "stats" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { icon: "CheckCircle", label: "Всего сделок", value: String(totalDeals), color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
              { icon: "Banknote", label: "Продано на платформе", value: `₽ ${totalVolume.toLocaleString("ru-RU")}`, color: "text-gold", bg: "bg-gold/10 border-gold/20" },
              { icon: "TrendingUp", label: "Успешных сделок", value: `${SITE_STATS.successRate}%`, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
            ].map((s) => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-6">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${s.bg}`}>
                  <Icon name={s.icon} size={22} className={s.color} />
                </div>
                <div className={`font-display font-bold text-2xl mb-1 ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">Пользователи по статусу</h3>
              <div className="space-y-3">
                {(["active", "frozen", "blocked"] as const).map((st) => {
                  const count = users.filter((u) => u.status === st).length;
                  return (
                    <div key={st} className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span>
                      <span className="font-display font-bold text-sm text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">Комиссия платформы</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-display font-black text-4xl text-gold">5%</span>
                <span className="text-muted-foreground text-sm">от сделки</span>
              </div>
              <div className="text-xs text-muted-foreground mb-4">Заработано с {totalDeals} сделок:</div>
              <div className="font-display font-bold text-xl text-gold">
                ₽ {Math.round(totalVolume * 0.05).toLocaleString("ru-RU")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USERS */}
      {tab === "users" && (
        <div className="animate-fade-in">
          <div className="mb-5">
            <div className="relative">
              <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background border-border text-sm h-9 max-w-sm"
              />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Пользователь</th>
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Роль</th>
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Статус</th>
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">Сделки</th>
                  <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-background/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-display font-semibold text-foreground flex items-center gap-1.5">
                            {u.username}
                            {u.role === "admin" && (
                              <span className="text-[10px] text-red-400/80 font-bold bg-red-400/15 px-1.5 py-0.5 rounded">Админ</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">с {u.joined}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{u.email}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        u.role === "admin"
                          ? "text-red-400 bg-red-400/10 border-red-400/30"
                          : "text-muted-foreground bg-secondary border-border"
                      }`}>
                        {u.role === "admin" ? "Администратор" : "Пользователь"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[u.status]}`}>
                        {STATUS_LABEL[u.status]}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{u.deals}</td>
                    <td className="p-4 text-right">
                      {u.role !== "admin" ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          {u.status !== "active" && (
                            <button
                              onClick={() => updateStatus(u.id, "active")}
                              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors font-semibold border border-emerald-400/20"
                            >
                              Активировать
                            </button>
                          )}
                          {u.status !== "frozen" && (
                            <button
                              onClick={() => setConfirmAction({ userId: u.id, action: "frozen" })}
                              className="text-xs px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors font-semibold border border-amber-400/20"
                            >
                              Заморозить
                            </button>
                          )}
                          {u.status !== "blocked" && (
                            <button
                              onClick={() => setConfirmAction({ userId: u.id, action: "blocked" })}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors font-semibold border border-red-400/20"
                            >
                              Заблокировать
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
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
                    <Icon name="AlertTriangle" size={20} className="text-red-400" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-base text-foreground">Подтверждение</div>
                    <div className="text-xs text-muted-foreground">
                      {confirmAction.action === "blocked" ? "Заблокировать" : "Заморозить"} пользователя?
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {confirmAction.action === "blocked"
                    ? "Пользователь потеряет доступ к платформе полностью."
                    : "Пользователь не сможет открывать новые сделки до снятия заморозки."}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-border"
                    onClick={() => setConfirmAction(null)}
                  >
                    Отмена
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                    onClick={() => updateStatus(confirmAction.userId, confirmAction.action)}
                  >
                    {confirmAction.action === "blocked" ? "Заблокировать" : "Заморозить"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEALS */}
      {tab === "deals" && (
        <div className="animate-fade-in">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">ID</th>
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Товар</th>
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">Покупатель</th>
                  <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:table-cell">Продавец</th>
                  <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Сумма</th>
                  <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Комиссия 5%</th>
                </tr>
              </thead>
              <tbody>
                {LIVE_DEALS.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-background/30 transition-colors">
                    <td className="p-4 text-xs text-muted-foreground font-mono">{d.id}</td>
                    <td className="p-4 font-display font-semibold text-foreground text-xs max-w-[160px] truncate">{d.product}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{d.buyer}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{d.seller}</td>
                    <td className="p-4 text-right font-display font-bold text-gold">₽ {d.amount.toLocaleString("ru-RU")}</td>
                    <td className="p-4 text-right text-emerald-400 font-semibold">₽ {Math.round(d.amount * 0.05).toLocaleString("ru-RU")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-background/50 border-t border-gold/20">
                  <td colSpan={4} className="p-4 font-display font-bold text-foreground text-xs hidden md:table-cell">Итого</td>
                  <td colSpan={4} className="p-4 font-display font-bold text-foreground text-xs md:hidden">Итого</td>
                  <td className="p-4 text-right font-display font-bold text-gold">₽ {totalVolume.toLocaleString("ru-RU")}</td>
                  <td className="p-4 text-right font-display font-bold text-emerald-400">₽ {Math.round(totalVolume * 0.05).toLocaleString("ru-RU")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
