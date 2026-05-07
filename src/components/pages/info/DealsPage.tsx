import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STEPS, STATUS_MAP } from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";

export function DealsPage() {
  const { deals, user, openDispute, sendDisputeMessage, refreshDeals } = useAuth();
  const userDeals = user ? deals.filter((d) => d.buyerId === user.id || d.sellerId === user.id) : deals;
  const [selected, setSelected] = useState<typeof deals[0] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [disputeInput, setDisputeInput] = useState("");
  const [showDisputeChat, setShowDisputeChat] = useState(false);

  const selectedFresh = selected ? (deals.find((d) => d.id === selected.id) ?? selected) : null;

  const handleConfirm = async (dealId: string) => {
    setActionLoading(true);
    try {
      await fetch(
        `https://functions.poehali.dev/60ecf7a0-0dce-4f8b-8f6a-6ad16f76e69d/deals/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Token": localStorage.getItem("gs_session_token") ?? "" },
          body: JSON.stringify({ deal_id: dealId }),
        }
      );
      await refreshDeals();
      setActionDone("Получение подтверждено! Средства переведены.");
    } catch {
      setActionDone("Ошибка подтверждения. Попробуйте позже.");
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionDone(null), 4000);
    }
  };

  const handleDispute = async (dealId: string) => {
    setActionLoading(true);
    try {
      await openDispute(dealId);
      setShowDisputeChat(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (dealId: string) => {
    if (!disputeInput.trim()) return;
    await sendDisputeMessage(dealId, disputeInput.trim());
    setDisputeInput("");
    await refreshDeals();
  };

  const TERMINAL = ["completed", "refunded"];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display font-bold text-3xl text-foreground">История сделок</h1>
        <Button variant="outline" size="sm" className="border-border text-xs" onClick={refreshDeals}>
          <Icon name="RefreshCw" size={13} className="mr-1.5" />Обновить
        </Button>
      </div>
      <p className="text-muted-foreground text-sm mb-8">Текущий статус и история всех транзакций</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {userDeals.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
              <Icon name="Inbox" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Сделок пока нет</p>
            </div>
          ) : userDeals.map((d) => {
            const s = STATUS_MAP[d.status] ?? { label: d.status, color: "text-muted-foreground bg-secondary border-border" };
            const isBuyer = user?.id === d.buyerId;
            return (
              <div key={d.id} onClick={() => { setSelected(d); setShowDisputeChat(d.status === "dispute"); }}
                className={`bg-surface border rounded-xl p-5 cursor-pointer transition-all hover-scale ${selectedFresh?.id === d.id ? "border-gold/50 bg-gold/5" : "border-border hover:border-border/80"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-display font-semibold text-sm text-foreground mb-0.5">{d.product}</div>
                    <div className="text-xs text-muted-foreground">ID: {d.id} · {d.date}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border flex-shrink-0 ml-4 ${s.color}`}>{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {STEPS.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-2 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${i < d.step ? "bg-gold text-background" : i === d.step ? "bg-gold/20 border border-gold/50 text-gold" : "bg-secondary text-muted-foreground"}`}>
                        <Icon name={i < d.step ? "Check" : step.icon} size={11} />
                      </div>
                      {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < d.step - 1 ? "bg-gold" : "bg-border"}`} />}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {STEPS.map((step) => <span key={step.label} className="text-[9px] text-muted-foreground text-center w-1/4">{step.label}</span>)}
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {isBuyer ? "Продавец" : "Покупатель"}:{" "}
                    <span className="text-foreground">{isBuyer ? d.sellerName : d.buyerName}</span>
                  </span>
                  <span className="font-display font-bold text-base text-gold">₽ {d.amount.toLocaleString("ru-RU")}</span>
                </div>
                {d.holdUntil && !TERMINAL.includes(d.status) && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                    <Icon name="Clock" size={11} />
                    Холд до {d.holdUntil}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Панель деталей */}
        <div>
          {selectedFresh ? (
            <div className="bg-surface border border-gold/20 rounded-xl p-6 sticky top-24 space-y-4">
              <h3 className="font-display font-semibold text-base text-foreground">Детали сделки</h3>

              <div className="space-y-2.5 text-sm">
                {[
                  ["ID", selectedFresh.id],
                  ["Товар", selectedFresh.product],
                  ["Продавец", selectedFresh.sellerName],
                  ["Покупатель", selectedFresh.buyerName],
                  ["Дата", selectedFresh.date],
                  ["Сумма", `₽ ${selectedFresh.amount.toLocaleString("ru-RU")}`],
                  ...(selectedFresh.holdUntil ? [["Холд до", selectedFresh.holdUntil]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground font-medium text-right">{v}</span>
                  </div>
                ))}
              </div>

              {/* Уведомление об успехе/ошибке */}
              {actionDone && (
                <div className={`text-xs rounded-lg px-3 py-2 flex items-center gap-2 ${actionDone.includes("Ошибка") ? "bg-red-400/10 text-red-400" : "bg-emerald-400/10 text-emerald-400"}`}>
                  <Icon name={actionDone.includes("Ошибка") ? "AlertCircle" : "CheckCircle"} size={13} />
                  {actionDone}
                </div>
              )}

              {/* Действия покупателя */}
              {user?.id === selectedFresh.buyerId && selectedFresh.status === "escrow" && (
                <Button
                  className="w-full bg-gold text-background hover:bg-gold/90 font-semibold text-sm"
                  disabled={actionLoading}
                  onClick={() => handleConfirm(selectedFresh.id)}
                >
                  {actionLoading ? <Icon name="Loader" size={15} className="animate-spin mr-2" /> : <Icon name="CheckCircle" size={15} className="mr-2" />}
                  Подтвердить получение
                </Button>
              )}

              {/* Холд-статусы — только информация */}
              {["hold_cs2", "hold_pubg"].includes(selectedFresh.status) && (
                <div className="bg-purple-400/10 border border-purple-400/20 rounded-lg p-3 text-xs text-purple-400 flex items-start gap-2">
                  <Icon name="Lock" size={13} className="mt-0.5 flex-shrink-0" />
                  <span>Средства в холде до {selectedFresh.holdUntil}. После истечения холда они поступят продавцу.</span>
                </div>
              )}

              {/* Спор */}
              {!TERMINAL.includes(selectedFresh.status) && selectedFresh.status !== "dispute" && (
                <Button
                  variant="outline"
                  className="w-full border-border text-muted-foreground hover:text-foreground font-semibold text-sm"
                  disabled={actionLoading}
                  onClick={() => handleDispute(selectedFresh.id)}
                >
                  <Icon name="AlertTriangle" size={14} className="mr-2 text-amber-400" />
                  Открыть спор
                </Button>
              )}

              {/* Чат спора */}
              {selectedFresh.status === "dispute" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                    <Icon name="MessageSquare" size={13} />
                    Чат арбитража
                    <button onClick={() => setShowDisputeChat((p) => !p)} className="ml-auto text-muted-foreground hover:text-foreground">
                      <Icon name={showDisputeChat ? "ChevronUp" : "ChevronDown"} size={13} />
                    </button>
                  </div>
                  {showDisputeChat && (
                    <>
                      <div className="bg-background border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {(selectedFresh.disputeMessages ?? []).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">Сообщений пока нет</p>
                        )}
                        {(selectedFresh.disputeMessages ?? []).map((msg, i) => (
                          <div key={i} className={`text-xs rounded-lg px-3 py-2 max-w-[90%] ${
                            msg.isSystem ? "bg-secondary text-muted-foreground mx-auto text-center" :
                            msg.role === "arbiter" ? "bg-blue-400/10 text-blue-400 border border-blue-400/20" :
                            msg.from === user?.username ? "bg-gold/10 text-foreground ml-auto" :
                            "bg-secondary text-foreground"
                          }`}>
                            {!msg.isSystem && <span className="font-semibold block mb-0.5">{msg.from} <span className="text-[10px] opacity-60">({msg.role})</span></span>}
                            {msg.text}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Написать в спор..."
                          value={disputeInput}
                          onChange={(e) => setDisputeInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendMessage(selectedFresh.id)}
                          className="bg-background border-border text-xs h-8 flex-1"
                        />
                        <Button size="sm" className="bg-gold text-background hover:bg-gold/90 h-8 px-3" onClick={() => handleSendMessage(selectedFresh.id)}>
                          <Icon name="Send" size={13} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {TERMINAL.includes(selectedFresh.status) && (
                <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-lg p-3 text-xs text-emerald-400 flex items-center gap-2">
                  <Icon name="CheckCircle" size={13} />
                  {selectedFresh.status === "refunded" ? "Средства возвращены покупателю." : "Сделка успешно завершена."}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-6 text-center">
              <Icon name="MousePointerClick" size={32} className="text-border mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Выберите сделку для просмотра деталей</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
