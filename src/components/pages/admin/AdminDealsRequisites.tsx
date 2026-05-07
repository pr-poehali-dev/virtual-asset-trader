import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PLATFORM_COMMISSION,
  INITIAL_REQUISITES,
  Requisite,
} from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import { api, type ApiDeal } from "@/api/client";

let reqCounter = INITIAL_REQUISITES.length + 1;
function genReqId() {
  return `req-${String(reqCounter++).padStart(3, "0")}`;
}

// ─── DEALS TAB ────────────────────────────────────────────────────────────────

export function AdminDealsTab() {
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "closed">("active");

  const TERMINAL = ["completed", "refunded"];

  const load = () => {
    setLoading(true);
    api.deals.list()
      .then(({ deals: list }) => setDeals(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const activeDeal = deals.filter((d) => !TERMINAL.includes(d.status));
  const closedDeals = deals.filter((d) => TERMINAL.includes(d.status));
  const visible = filter === "active" ? activeDeal : closedDeals;

  const totalVolume = visible.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg">
          <button onClick={() => setFilter("active")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${filter === "active" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}>
            Активные ({activeDeal.length})
          </button>
          <button onClick={() => setFilter("closed")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${filter === "closed" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}>
            Закрытые ({closedDeals.length})
          </button>
        </div>
        <Button variant="outline" size="sm" className="border-border text-xs" onClick={load} disabled={loading}>
          <Icon name={loading ? "Loader" : "RefreshCw"} size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />Обновить
        </Button>
      </div>

      {loading && deals.length === 0 ? (
        <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>
      ) : visible.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="Inbox" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">{filter === "active" ? "Нет активных сделок" : "Нет закрытых сделок"}</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-background/50">
                {["ID", "Товар", "Покупатель", "Продавец", "Сумма", `Комиссия ${PLATFORM_COMMISSION}%`, "Статус"].map((h) => (
                  <th key={h} className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-background/30">
                  <td className="p-4 text-xs text-muted-foreground font-mono">{d.id}</td>
                  <td className="p-4 font-display font-semibold text-foreground text-xs max-w-[150px] truncate">{d.product}</td>
                  <td className="p-4 text-muted-foreground text-xs">{d.buyerName}</td>
                  <td className="p-4 text-muted-foreground text-xs">{d.sellerName}</td>
                  <td className="p-4 font-display font-bold text-gold">₽ {d.amount.toLocaleString("ru-RU")}</td>
                  <td className="p-4 text-emerald-400 font-semibold text-xs">
                    ₽ {Math.round(d.amount * (PLATFORM_COMMISSION / 100)).toLocaleString("ru-RU")}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                      d.status === "completed" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" :
                      d.status === "refunded"  ? "text-blue-400 bg-blue-400/10 border-blue-400/30" :
                      d.status === "dispute"   ? "text-red-400 bg-red-400/10 border-red-400/30" :
                      "text-amber-400 bg-amber-400/10 border-amber-400/30"
                    }`}>
                      {d.status === "completed" ? "Завершена" :
                       d.status === "refunded"  ? "Возврат" :
                       d.status === "dispute"   ? "Спор" :
                       d.status === "escrow"    ? "Эскроу" :
                       d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-background/50 border-t border-gold/20">
                <td colSpan={4} className="p-4 font-display font-bold text-foreground text-xs">Итого</td>
                <td className="p-4 font-display font-bold text-gold">₽ {totalVolume.toLocaleString("ru-RU")}</td>
                <td className="p-4 font-display font-bold text-emerald-400">
                  ₽ {Math.round(totalVolume * (PLATFORM_COMMISSION / 100)).toLocaleString("ru-RU")}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── REQUISITES TAB ────────────────────────────────────────────────────────────

export function AdminRequisitesTab() {
  const { requisites, addRequisite, toggleRequisite, deleteRequisite } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<Requisite>>({ type: "Банковская карта", currency: "RUB", active: true });

  const handleAdd = () => {
    if (!form.name || !form.details) return;
    addRequisite({
      id: genReqId(),
      name: form.name!,
      type: form.type!,
      details: form.details!,
      bank: form.bank,
      currency: form.currency!,
      active: true,
    });
    setForm({ type: "Банковская карта", currency: "RUB", active: true });
    setShowAdd(false);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-semibold text-base text-foreground">Реквизиты вывода</h2>
        <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold text-xs" onClick={() => setShowAdd((p) => !p)}>
          <Icon name={showAdd ? "X" : "Plus"} size={13} className="mr-1.5" />
          {showAdd ? "Отмена" : "Добавить"}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-surface border border-gold/20 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Новый реквизит</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <Input placeholder="Сбербанк" value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground">
                <option>Банковская карта</option>
                <option>СБП</option>
                <option>Электронный кошелёк</option>
                <option>Криптовалюта</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Реквизиты *</label>
              <Input placeholder="1234 5678 9012 3456" value={form.details ?? ""} onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Банк</label>
              <Input placeholder="Сбербанк" value={form.bank ?? ""} onChange={(e) => setForm((p) => ({ ...p, bank: e.target.value }))} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Валюта</label>
              <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground">
                <option value="RUB">RUB</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
          </div>
          <Button className="bg-gold text-background hover:bg-gold/90 font-bold text-sm" onClick={handleAdd}>
            Добавить реквизит
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {requisites.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted-foreground">
            <Icon name="CreditCard" size={28} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Нет реквизитов</p>
          </div>
        )}
        {requisites.map((r) => (
          <div key={r.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${r.active ? "bg-gold/10 border border-gold/30" : "bg-background border border-border"}`}>
              <Icon name={r.type === "Криптовалюта" ? "Bitcoin" : r.type === "Электронный кошелёк" ? "Wallet" : "CreditCard"} size={16} className={r.active ? "text-gold" : "text-muted-foreground"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.type} · {r.currency}</div>
              <div className="font-mono text-xs text-foreground mt-0.5">{r.details}</div>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              <button onClick={() => toggleRequisite(r.id)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors ${r.active ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-muted-foreground border-border bg-background"}`}>
                {r.active ? "Активен" : "Откл."}
              </button>
              <button onClick={() => deleteRequisite(r.id)}
                className="text-xs px-2 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20">
                <Icon name="Trash2" size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
