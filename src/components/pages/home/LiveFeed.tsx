import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useCurrency } from "@/context/CurrencyContext";
import { api } from "@/api/client";

// ─── LIVE FEED ────────────────────────────────────────────────────────────────

type LiveDeal = { id: string; product: string; amount: number; buyer: string; seller: string; timeAgo: string };

export function LiveFeed() {
  const { format } = useCurrency();
  const [deals, setDeals] = useState<LiveDeal[]>([]);

  useEffect(() => {
    const load = () => {
      api.deals.list().then(({ deals: list }) => {
        const closed = list
          .filter((d: { status: string }) => d.status === "completed" || d.status === "refunded")
          .slice(0, 8)
          .map((d: { id: string; productName?: string; product?: string; amount: number; buyerName?: string; sellerName?: string; date?: string }) => ({
            id: d.id,
            product: d.productName ?? d.product ?? "Товар",
            amount: d.amount,
            buyer: d.buyerName ?? "—",
            seller: d.sellerName ?? "—",
            timeAgo: d.date ?? "",
          }));
        setDeals(closed);
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="font-display font-bold text-xl text-foreground">
            Последние закрытые сделки
          </h2>
          <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium">
            Live
          </span>
        </div>
        {deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
              <Icon name="Clock" size={22} className="text-emerald-400 opacity-60" />
            </div>
            <p className="text-sm text-muted-foreground">Первые сделки появятся здесь в режиме реального времени</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deals.map((d, i) => (
              <div
                key={d.id}
                className={`flex items-center gap-4 p-4 rounded-xl border bg-surface transition-all duration-500 ${
                  i === 0 ? "border-emerald-400/30 bg-emerald-400/5" : "border-border"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="CheckCircle" size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-display font-semibold text-sm text-foreground">
                    {d.product}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {d.buyer} ← {d.seller}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display font-bold text-sm text-gold">{format(d.amount)}</div>
                  {d.timeAgo && <div className="text-[10px] text-muted-foreground">{d.timeAgo}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
