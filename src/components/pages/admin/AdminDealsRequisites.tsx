import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { PLATFORM_COMMISSION } from "@/components/data/constants";
import { api, type ApiDeal } from "@/api/client";

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
