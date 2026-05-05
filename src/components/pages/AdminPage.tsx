import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIVE_DEALS, SITE_STATS, ADMIN_PASSWORD, Requisite, INITIAL_REQUISITES, INITIAL_WITHDRAWALS, WITHDRAW_STATUS_MAP, WithdrawRequest } from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import type { AppUser } from "@/components/data/constants";

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) { onSuccess(); setError(false); }
    else { setError(true); setPassword(""); }
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
              <Input type="password" placeholder="Введите пароль..." value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className={`bg-background border-border ${error ? "border-red-400/60" : ""}`}
              />
              {error && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><Icon name="AlertCircle" size={12} />Неверный пароль</p>}
            </div>
            <Button className="w-full bg-red-500 hover:bg-red-600 text-white font-bold" onClick={handleLogin}>Войти в панель</Button>
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
const STATUS_LABEL: Record<string, string> = { active: "Активен", frozen: "Заморожен", blocked: "Заблокирован" };

let reqCounter = INITIAL_REQUISITES.length + 1;
function genReqId() { return `req-${String(reqCounter++).padStart(3, "0")}`; }

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────

export function AdminPage() {
  const { users, updateUsers } = useAuth();
  const [tab, setTab] = useState<"stats" | "users" | "deals" | "requisites" | "withdrawals">("stats");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: AppUser["status"]; reason: string } | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  // Requisites state
  const [requisites, setRequisites] = useState<Requisite[]>(INITIAL_REQUISITES);
  const [reqForm, setReqForm] = useState<Partial<Requisite> | null>(null);

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>(INITIAL_WITHDRAWALS);
  const [withdrawCommission, setWithdrawCommission] = useState(5);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.accountId.toLowerCase().includes(search.toLowerCase()) ||
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = (userId: string, status: AppUser["status"], reason: string) => {
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      return {
        ...u,
        status,
        ...(status === "blocked" ? { blockReason: reason } : {}),
        ...(status === "frozen" ? { freezeReason: reason || "Подозрительная активность на платформе" } : {}),
        ...(status === "active" ? { blockReason: undefined, freezeReason: undefined } : {}),
      };
    });
    updateUsers(updated);
    setConfirmAction(null);
    setReasonInput("");
  };

  const totalVolume = LIVE_DEALS.reduce((s, d) => s + d.amount, 0);
  const totalDeals = LIVE_DEALS.length;
  const registeredUsers = users.filter((u) => u.role === "user").length;

  const tabs = [
    { id: "stats", label: "Статистика", icon: "BarChart2" },
    { id: "users", label: "Пользователи", icon: "Users" },
    { id: "deals", label: "Сделки", icon: "ArrowRightLeft" },
    { id: "requisites", label: "Реквизиты", icon: "CreditCard" },
    { id: "withdrawals", label: "Выводы", icon: "Banknote" },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
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
      <div className="flex flex-wrap gap-1 p-1 bg-surface border border-border rounded-xl mb-8">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? "bg-red-500/20 text-red-400 border border-red-400/30" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} size={15} />{t.label}
          </button>
        ))}
      </div>

      {/* STATS */}
      {tab === "stats" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
            {[
              { icon: "CheckCircle", label: "Всего сделок", value: String(totalDeals), color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
              { icon: "Banknote", label: "Продано", value: `₽ ${totalVolume.toLocaleString("ru-RU")}`, color: "text-gold", bg: "bg-gold/10 border-gold/20" },
              { icon: "TrendingUp", label: "Успешных", value: `${SITE_STATS.successRate}%`, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
              { icon: "Users", label: "Пользователей", value: String(registeredUsers), color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
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
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">Доходы</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-display font-black text-4xl text-gold">5%</span>
                <span className="text-muted-foreground text-sm">комиссия</span>
              </div>
              <div className="text-xs text-muted-foreground mb-2">Заработано с {totalDeals} сделок:</div>
              <div className="font-display font-bold text-xl text-gold">₽ {Math.round(totalVolume * 0.05).toLocaleString("ru-RU")}</div>
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
              <Input placeholder="Поиск по имени, email, ID аккаунта..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background border-border text-sm h-9 max-w-sm" />
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  {["Пользователь", "ID аккаунта", "Email", "Статус", "Сделки", "Действия"].map((h) => (
                    <th key={h} className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className={`border-b border-border last:border-0 transition-colors ${u.status === "blocked" ? "bg-red-400/5 border-red-400/10" : "hover:bg-background/30"}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-display font-semibold text-foreground flex items-center gap-1.5">
                            {u.username}
                            {u.role === "admin" && <span className="text-[10px] text-red-400/80 font-bold bg-red-400/15 px-1.5 py-0.5 rounded">Админ</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">с {u.joined}</div>
                        </div>
                      </div>
                      {u.status === "blocked" && (
                        <div className="mt-1 text-xs text-red-400 flex items-center gap-1">
                          <Icon name="Ban" size={10} />
                          <span className="font-semibold">Заблокирован{u.blockReason ? `: ${u.blockReason}` : ""}</span>
                        </div>
                      )}
                      {u.status === "frozen" && (
                        <div className="mt-1 text-xs text-amber-400 flex items-center gap-1">
                          <Icon name="Snowflake" size={10} />
                          <span>{u.freezeReason || "Подозрительная активность"}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{u.accountId}</td>
                    <td className="p-4 text-muted-foreground text-xs">{u.email}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">{u.deals}</td>
                    <td className="p-4 text-right">
                      {u.role !== "admin" ? (
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          {u.status !== "active" && (
                            <button onClick={() => updateStatus(u.id, "active", "")}
                              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors font-semibold border border-emerald-400/20">
                              Разблокировать
                            </button>
                          )}
                          {u.status !== "frozen" && (
                            <button onClick={() => { setConfirmAction({ userId: u.id, action: "frozen", reason: "" }); setReasonInput(""); }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors font-semibold border border-amber-400/20">
                              Заморозить
                            </button>
                          )}
                          {u.status !== "blocked" && (
                            <button onClick={() => { setConfirmAction({ userId: u.id, action: "blocked", reason: "" }); setReasonInput(""); }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors font-semibold border border-red-400/20">
                              Заблокировать
                            </button>
                          )}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
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
                    <div className="text-xs text-muted-foreground">
                      {confirmAction.action === "blocked" ? "Заблокировать" : "Заморозить"} пользователя
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-1 block">Причина (необязательно)</label>
                  <Input placeholder="Укажите причину..." value={reasonInput} onChange={(e) => setReasonInput(e.target.value)}
                    className="bg-background border-border text-sm" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-border" onClick={() => setConfirmAction(null)}>Отмена</Button>
                  <Button className={`flex-1 text-white font-bold ${confirmAction.action === "frozen" ? "bg-amber-500 hover:bg-amber-600" : "bg-red-500 hover:bg-red-600"}`}
                    onClick={() => updateStatus(confirmAction.userId, confirmAction.action, reasonInput)}>
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
        <div className="animate-fade-in bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                {["ID", "Товар", "Покупатель", "Продавец", "Сумма", "Комиссия 5%"].map((h) => (
                  <th key={h} className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIVE_DEALS.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-background/30">
                  <td className="p-4 text-xs text-muted-foreground font-mono">{d.id}</td>
                  <td className="p-4 font-display font-semibold text-foreground text-xs">{d.product}</td>
                  <td className="p-4 text-muted-foreground text-xs">{d.buyer}</td>
                  <td className="p-4 text-muted-foreground text-xs">{d.seller}</td>
                  <td className="p-4 font-display font-bold text-gold">₽ {d.amount.toLocaleString("ru-RU")}</td>
                  <td className="p-4 text-emerald-400 font-semibold">₽ {Math.round(d.amount * 0.05).toLocaleString("ru-RU")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-background/50 border-t border-gold/20">
                <td colSpan={4} className="p-4 font-display font-bold text-foreground text-xs">Итого</td>
                <td className="p-4 font-display font-bold text-gold">₽ {totalVolume.toLocaleString("ru-RU")}</td>
                <td className="p-4 font-display font-bold text-emerald-400">₽ {Math.round(totalVolume * 0.05).toLocaleString("ru-RU")}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* REQUISITES */}
      {tab === "requisites" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-base text-foreground">Реквизиты для оплаты</h2>
            <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold"
              onClick={() => setReqForm({ name: "", type: "", details: "", active: true })}>
              <Icon name="Plus" size={14} className="mr-1.5" />Добавить
            </Button>
          </div>

          {reqForm !== null && (
            <div className="bg-surface border border-gold/20 rounded-xl p-5 mb-6">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">
                {reqForm.id ? "Редактировать реквизит" : "Новый реквизит"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Название</label>
                  <Input placeholder="Сбербанк" value={reqForm.name || ""} onChange={(e) => setReqForm((p) => ({ ...p, name: e.target.value }))} className="bg-background border-border text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
                  <Input placeholder="Банковская карта" value={reqForm.type || ""} onChange={(e) => setReqForm((p) => ({ ...p, type: e.target.value }))} className="bg-background border-border text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Реквизиты</label>
                  <Input placeholder="4276 **** **** 1234" value={reqForm.details || ""} onChange={(e) => setReqForm((p) => ({ ...p, details: e.target.value }))} className="bg-background border-border text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!reqForm.active} onChange={(e) => setReqForm((p) => ({ ...p, active: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm text-foreground">Активен (отображается пользователям)</span>
                </label>
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" className="border-border" onClick={() => setReqForm(null)}>Отмена</Button>
                  <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={() => {
                    if (!reqForm.name || !reqForm.type || !reqForm.details) return;
                    if (reqForm.id) {
                      setRequisites((prev) => prev.map((r) => r.id === reqForm.id ? { ...r, ...reqForm } as Requisite : r));
                    } else {
                      setRequisites((prev) => [...prev, { id: genReqId(), name: reqForm.name!, type: reqForm.type!, details: reqForm.details!, active: !!reqForm.active }]);
                    }
                    setReqForm(null);
                  }}>Сохранить</Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {requisites.map((r) => (
              <div key={r.id} className={`bg-surface border rounded-xl p-4 flex items-center gap-4 ${!r.active ? "opacity-50 border-border" : "border-border"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${r.active ? "bg-gold/10 border border-gold/20" : "bg-secondary border border-border"}`}>
                  <Icon name="CreditCard" size={18} className={r.active ? "text-gold" : "text-muted-foreground"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-sm text-foreground">{r.name}</span>
                    <span className="text-xs text-muted-foreground">· {r.type}</span>
                    {!r.active && <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">Неактивна</span>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{r.details}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setRequisites((prev) => prev.map((x) => x.id === r.id ? { ...x, active: !x.active } : x))}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${r.active ? "bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400/20" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20"}`}>
                    {r.active ? "Деактивировать" : "Активировать"}
                  </button>
                  <button onClick={() => setReqForm({ ...r })}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 font-semibold">
                    Изменить
                  </button>
                  <button onClick={() => setRequisites((prev) => prev.filter((x) => x.id !== r.id))}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold">
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WITHDRAWALS */}
      {tab === "withdrawals" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-base text-foreground">Заявки на вывод</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Комиссия вывода:</span>
              <div className="flex items-center gap-2">
                <Input type="number" value={withdrawCommission} onChange={(e) => setWithdrawCommission(Number(e.target.value))}
                  className="bg-background border-border text-sm h-8 w-20 text-center" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {withdrawals.map((w) => {
              const s = WITHDRAW_STATUS_MAP[w.status];
              return (
                <div key={w.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-muted-foreground">{w.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                      </div>
                      <div className="font-display font-bold text-lg text-gold">₽ {w.amount.toLocaleString("ru-RU")}</div>
                      <div className="text-xs text-muted-foreground">{w.username} · {w.requisiteType} · {w.requisiteDetails}</div>
                      <div className="text-xs text-muted-foreground">Дата: {w.date} · К выплате: ₽ {Math.round(w.amount * (1 - w.commission / 100)).toLocaleString("ru-RU")}</div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      {w.status === "pending" && (
                        <button onClick={() => setWithdrawals((prev) => prev.map((x) => x.id === w.id ? { ...x, status: "processing" } : x))}
                          className="text-xs px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 font-semibold">
                          В обработку
                        </button>
                      )}
                      {w.status === "processing" && (
                        <button onClick={() => setWithdrawals((prev) => prev.map((x) => x.id === w.id ? { ...x, status: "done" } : x))}
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 font-semibold">
                          Выплачено ✓
                        </button>
                      )}
                      {(w.status === "pending" || w.status === "processing") && (
                        <button onClick={() => setWithdrawals((prev) => prev.map((x) => x.id === w.id ? { ...x, status: "rejected" } : x))}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold">
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
    </div>
  );
}
