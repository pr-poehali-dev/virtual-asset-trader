import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api, type ApiDealChatMessage } from "@/api/client";
import { TranslateMessage } from "@/components/ui/translate-message";

// ─── ВКЛАДКА «ЧАТЫ» ─────────────────────────────────────────────────────────────
// Единое место со всеми перепиcками пользователя по его сделкам — и как покупателя,
// и как продавца. Отдельно от истории сделок, чтобы быстро находить нужный диалог.

export function ChatsPage() {
  const { deals, user, sendDisputeMessage, refreshDeals } = useAuth();
  const { t } = useCurrency();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dealChat, setDealChat] = useState<ApiDealChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [disputeInput, setDisputeInput] = useState("");

  // Все сделки пользователя, отсортированные по последней активности
  const myDeals = user
    ? deals.filter((d) => d.buyerId === user.id || d.sellerId === user.id)
    : [];

  const selected = myDeals.find((d) => d.id === selectedId) ?? null;
  const isDispute = selected?.status === "dispute";

  const loadChat = useCallback(async (dealId: string) => {
    try {
      const { messages } = await api.deals.chatList(dealId);
      setDealChat(messages);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    if (!isDispute) loadChat(selectedId);
    const interval = setInterval(() => {
      refreshDeals();
      if (!isDispute) loadChat(selectedId);
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isDispute]);

  const handleSend = async () => {
    if (!chatInput.trim() || !selected) return;
    const text = chatInput.trim();
    setChatInput("");
    setChatLoading(true);
    try {
      if (isDispute) {
        await sendDisputeMessage(selected.id, text);
        await refreshDeals();
      } else {
        await api.deals.chatSend(selected.id, text);
        await loadChat(selected.id);
      }
    } catch { /* ignore */ }
    setChatLoading(false);
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center animate-fade-in">
        <Icon name="Lock" size={40} className="mx-auto mb-4 text-muted-foreground opacity-30" />
        <h2 className="font-display font-bold text-xl text-foreground mb-2">{t("login_required_chats")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("login_required_chats_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-1">{t("chats")}</h1>
      <p className="text-muted-foreground text-sm mb-8">{t("chats_subtitle")}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список диалогов */}
        <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {myDeals.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted-foreground">
              <Icon name="MessageCircle" size={28} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t("no_chats")}</p>
            </div>
          ) : myDeals.map((d) => {
            const isBuyer = user.id === d.buyerId;
            const other = isBuyer ? d.sellerName : d.buyerName;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full text-left bg-surface border rounded-xl p-3.5 transition-colors ${
                  selectedId === d.id ? "border-gold/50 bg-gold/5" : "border-border hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-display font-semibold text-sm text-foreground truncate">{other}</span>
                  {d.status === "dispute" && (
                    <span className="text-[9px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full shrink-0">{t("dispute_label")}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{d.product}</p>
                <p className="text-[10px] text-muted-foreground mt-1">ID: {d.id} · {d.date}</p>
              </button>
            );
          })}
        </div>

        {/* Окно чата */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-surface border border-border rounded-xl flex items-center justify-center text-muted-foreground" style={{ minHeight: 400 }}>
              <div className="text-center">
                <Icon name="MousePointerClick" size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("select_dialog")}</p>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: 500 }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/50">
                <Icon name={isDispute ? "AlertTriangle" : "MessageCircle"} size={14} className={isDispute ? "text-red-400" : "text-gold"} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {isDispute ? t("dispute_chat") : t("deal_chat")} — {selected.product}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {user.id === selected.buyerId ? t("seller_label") : t("buyer_label")}: {user.id === selected.buyerId ? selected.sellerName : selected.buyerName}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {isDispute ? (
                  (selected.disputeMessages ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">{t("no_messages")}</p>
                  ) : (
                    (selected.disputeMessages ?? []).map((m, i) => (
                      <div key={i}>
                        {m.isSystem || m.role === "system" ? (
                          <div className="flex justify-center">
                            <span className="text-[10px] text-muted-foreground bg-background border border-border rounded-full px-3 py-0.5">{m.text}</span>
                          </div>
                        ) : (
                          <div className={`flex ${m.from === user.username ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                              m.from === user.username ? "bg-gold text-background rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
                            }`}>
                              {m.role === "arbiter" && (
                                <p className="text-[10px] font-semibold mb-0.5 opacity-80">{t("arbiter_label")}</p>
                              )}
                              <p className="text-sm">{m.text}</p>
                              {m.time && <p className={`text-[10px] mt-0.5 ${m.from === user.username ? "text-background/60 text-right" : "text-muted-foreground"}`}>{m.time}</p>}
                              {m.from !== user.username && <TranslateMessage text={m.text} />}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )
                ) : (
                  dealChat.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">{t("no_messages")}</p>
                  ) : (
                    dealChat.map((m) => (
                      <div key={m.id} className={`flex ${m.fromUserId === user.id ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                          m.fromUserId === user.id ? "bg-gold text-background rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
                        }`}>
                          <p className="text-sm">{m.text}</p>
                          <p className={`text-[10px] mt-0.5 ${m.fromUserId === user.id ? "text-background/60 text-right" : "text-muted-foreground"}`}>{m.time}</p>
                          {m.fromUserId !== user.id && <TranslateMessage text={m.text} />}
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>

              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  value={isDispute ? disputeInput : chatInput}
                  onChange={(e) => (isDispute ? setDisputeInput(e.target.value) : setChatInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (isDispute) {
                      if (!disputeInput.trim()) return;
                      sendDisputeMessage(selected.id, disputeInput.trim()).then(() => { setDisputeInput(""); refreshDeals(); });
                    } else {
                      handleSend();
                    }
                  }}
                  placeholder={t("write_message")}
                  className="flex-1 bg-background border-border text-sm h-9"
                />
                <Button
                  size="sm"
                  className="bg-gold text-background hover:bg-gold/90 px-3 shrink-0"
                  disabled={chatLoading}
                  onClick={() => {
                    if (isDispute) {
                      if (!disputeInput.trim()) return;
                      sendDisputeMessage(selected.id, disputeInput.trim()).then(() => { setDisputeInput(""); refreshDeals(); });
                    } else {
                      handleSend();
                    }
                  }}
                >
                  {chatLoading ? <Icon name="Loader" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}