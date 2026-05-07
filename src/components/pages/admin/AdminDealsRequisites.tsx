import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LIVE_DEALS,
  PLATFORM_COMMISSION,
  INITIAL_REQUISITES,
  Requisite,
} from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";

let reqCounter = INITIAL_REQUISITES.length + 1;
function genReqId() {
  return `req-${String(reqCounter++).padStart(3, "0")}`;
}

// ─── DISPUTE RESOLVE BUTTONS ─────────────────────────────────────────────────

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

// ─── DEALS TAB ────────────────────────────────────────────────────────────────

export function AdminDealsTab() {
  const { deals: contextDeals, users, assignArbiter, addNotification } = useAuth();
  const [arbiterSelect, setArbiterSelect] = useState<Record<string, string>>({});

  const totalVolume = LIVE_DEALS.reduce((s, d) => s + d.amount, 0);

  const arbiterUsers = users.filter(
    (u) =>
      u.role === "admin" ||
      (u.role === "staff" && u.staffPermissions?.includes("arbiter"))
  );

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

  return (
    <div className="animate-fade-in space-y-4">
      {/* Static live deals table */}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[650px]">
          <thead>
            <tr className="border-b border-border bg-background/50">
              {["ID", "Товар", "Покупатель", "Продавец", "Сумма", `Комиссия ${PLATFORM_COMMISSION}%`].map(
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
                  ₽ {Math.round(d.amount * (PLATFORM_COMMISSION / 100)).toLocaleString("ru-RU")}
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
                ₽ {Math.round(totalVolume * (PLATFORM_COMMISSION / 100)).toLocaleString("ru-RU")}
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
                      {deal.buyerName} → {deal.sellerName} · ₽ {deal.amount.toLocaleString("ru-RU")}
                    </div>
                  </div>

                  {deal.status === "dispute" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={arbiterSelect[deal.id] ?? deal.arbiterId ?? ""}
                        onChange={(e) =>
                          setArbiterSelect((prev) => ({ ...prev, [deal.id]: e.target.value }))
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

                {deal.status === "dispute" && <DisputeResolveButtons dealId={deal.id} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REQUISITES TAB ───────────────────────────────────────────────────────────

export function AdminRequisitesTab() {
  const [requisites, setRequisites] = useState<Requisite[]>(INITIAL_REQUISITES);
  const [reqForm, setReqForm] = useState<Partial<Requisite & { currency: string }> | null>(null);

  return (
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
                r.active ? "bg-gold/10 border border-gold/20" : "bg-secondary border border-border"
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
                <span className="font-display font-semibold text-sm text-foreground">{r.name}</span>
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
  );
}
