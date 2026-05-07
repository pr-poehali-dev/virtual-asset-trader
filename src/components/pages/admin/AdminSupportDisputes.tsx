import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  api, apiErrorMessage,
  type ApiDispute, type ApiDisputeMessage,
  type ApiSupportTicketItem, type ApiSupportTicketDetail,
} from "@/api/client";

// ─── ОБЩИЙ ЧАТ-КОМПОНЕНТ ──────────────────────────────────────────────────────

function ChatWindow({
  messages,
  onSend,
  loading,
  currentUserId,
  closed,
  title,
}: {
  messages: { id: number | string; role: string; text: string; time: string; fromUsername?: string; isSystem?: boolean }[];
  onSend: (text: string) => Promise<void>;
  loading: boolean;
  currentUserId?: string;
  closed?: boolean;
  title?: string;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    await onSend(text);
    setSending(false);
  };

  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: 420 }}>
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface">
          <Icon name="MessageCircle" size={14} className="text-gold" />
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && <div className="flex justify-center pt-6"><Icon name="Loader" size={18} className="text-gold animate-spin" /></div>}
        {messages.map((m, i) => (
          <div key={m.id ?? i}>
            {m.isSystem || m.role === "system" ? (
              <div className="flex justify-center">
                <span className="text-[10px] text-muted-foreground bg-surface border border-border rounded-full px-3 py-0.5">{m.text}</span>
              </div>
            ) : (
              <div className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[72%] rounded-2xl px-3 py-2 ${
                  m.role === "user" ? "bg-secondary text-foreground rounded-bl-sm" : "bg-gold text-background rounded-br-sm"
                }`}>
                  {m.fromUsername && m.role === "user" && (
                    <p className="text-[10px] font-semibold mb-0.5 opacity-70">{m.fromUsername}</p>
                  )}
                  {m.role === "arbiter" && (
                    <p className="text-[10px] font-semibold mb-0.5 opacity-70">Арбитр</p>
                  )}
                  {m.role === "operator" && (
                    <p className="text-[10px] font-semibold mb-0.5 opacity-80">Оператор</p>
                  )}
                  <p className="text-sm">{m.text}</p>
                  <p className={`text-[10px] mt-0.5 ${m.role === "user" ? "text-muted-foreground" : "text-background/60 text-right"}`}>{m.time}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {!closed && (
        <div className="p-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Написать сообщение..."
            className="flex-1 bg-surface border-border text-sm h-9"
          />
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 px-3 shrink-0" onClick={send} disabled={sending || !input.trim()}>
            {sending ? <Icon name="Loader" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── СПОРЫ ────────────────────────────────────────────────────────────────────

export function AdminDisputesTab() {
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApiDispute | null>(null);
  const [msgs, setMsgs] = useState<ApiDisputeMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [operators, setOperators] = useState<{ id: string; username: string }[]>([]);
  const [assignId, setAssignId] = useState("");
  const [actionError, setActionError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => {
    setLoading(true);
    api.support.getDisputes()
      .then(({ disputes: list }) => setDisputes(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadOps = () => {
    api.support.getOperators().then(({ operators: ops }) => setOperators(ops)).catch(() => {});
  };

  useEffect(() => { load(); loadOps(); }, []);

  const loadMsgs = useCallback(async (dealId: string) => {
    setMsgsLoading(true);
    try {
      const { messages } = await api.support.getDisputeMessages(dealId);
      setMsgs(messages);
    } catch {/* ignore */}
    setMsgsLoading(false);
  }, []);

  const openDispute = (d: ApiDispute) => {
    setSelected(d);
    setActionError("");
    loadMsgs(d.id);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMsgs(d.id), 5000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const sendMsg = async (text: string) => {
    if (!selected) return;
    await api.support.disputeMessage(selected.id, text);
    await loadMsgs(selected.id);
  };

  const resolve = async (refundBuyer: boolean) => {
    if (!selected) return;
    setActionError("");
    try {
      await api.support.resolveDispute(selected.id, refundBuyer);
      setDisputes((prev) => prev.filter((d) => d.id !== selected.id));
      setSelected(null);
    } catch (e) { setActionError(apiErrorMessage(e)); }
  };

  const assign = async () => {
    if (!selected) return;
    setActionError("");
    try {
      await api.support.assignDispute(selected.id, assignId || undefined);
      await loadMsgs(selected.id);
      setAssignId("");
    } catch (e) { setActionError(apiErrorMessage(e)); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-semibold text-base text-foreground">
          Споры {disputes.length > 0 && <span className="ml-2 text-xs bg-red-400/20 text-red-400 border border-red-400/30 px-2 py-0.5 rounded-full">{disputes.length}</span>}
        </h2>
        <Button variant="outline" size="sm" className="border-border text-xs" onClick={load} disabled={loading}>
          <Icon name={loading ? "Loader" : "RefreshCw"} size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />Обновить
        </Button>
      </div>

      {actionError && (
        <div className="mb-4 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 text-xs text-red-400 flex items-center gap-2">
          <Icon name="AlertCircle" size={13} />{actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Список споров */}
        <div className="space-y-2">
          {loading && <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>}
          {!loading && disputes.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
              <Icon name="CheckCircle" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Активных споров нет</p>
            </div>
          )}
          {disputes.map((d) => (
            <button
              key={d.id}
              onClick={() => openDispute(d)}
              className={`w-full text-left bg-surface border rounded-xl p-4 transition-colors hover:border-red-400/40 ${
                selected?.id === d.id ? "border-red-400/60 bg-red-400/5" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                  <div className="font-display font-semibold text-sm text-foreground mt-0.5 truncate max-w-[200px]">{d.product}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-sm text-gold">₽ {d.amount.toLocaleString("ru-RU")}</div>
                  <div className="text-[10px] text-muted-foreground">{d.updatedAt}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Icon name="ShoppingCart" size={11} />Покупатель: <span className="text-foreground font-semibold">{d.buyerName}</span></span>
                <span className="flex items-center gap-1"><Icon name="Package" size={11} />Продавец: <span className="text-foreground font-semibold">{d.sellerName}</span></span>
              </div>
              {d.arbiterName && (
                <div className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
                  <Icon name="UserCheck" size={10} />Арбитр: {d.arbiterName}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Чат и кнопки */}
        {selected ? (
          <div className="space-y-4">
            <div className="bg-surface border border-red-400/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="AlertTriangle" size={14} className="text-red-400" />
                <span className="font-display font-semibold text-sm text-foreground">Спор {selected.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-background border border-border rounded-lg p-2.5">
                  <div className="text-muted-foreground mb-0.5">Покупатель</div>
                  <div className="font-semibold text-foreground">{selected.buyerName}</div>
                </div>
                <div className="bg-background border border-border rounded-lg p-2.5">
                  <div className="text-muted-foreground mb-0.5">Продавец</div>
                  <div className="font-semibold text-foreground">{selected.sellerName}</div>
                </div>
                <div className="bg-background border border-border rounded-lg p-2.5">
                  <div className="text-muted-foreground mb-0.5">Товар</div>
                  <div className="font-semibold text-foreground truncate">{selected.product}</div>
                </div>
                <div className="bg-background border border-border rounded-lg p-2.5">
                  <div className="text-muted-foreground mb-0.5">Сумма</div>
                  <div className="font-bold text-gold">₽ {selected.amount.toLocaleString("ru-RU")}</div>
                </div>
              </div>

              {/* Кнопки резолюции */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => resolve(true)}
                    className="flex-1 py-2 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Icon name="RotateCcw" size={13} />
                    Возврат покупателю
                  </button>
                  <button
                    onClick={() => resolve(false)}
                    className="flex-1 py-2 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Icon name="CheckCircle" size={13} />
                    Деньги продавцу
                  </button>
                </div>

                {/* Назначить арбитра */}
                <div className="flex gap-2">
                  <select
                    value={assignId}
                    onChange={(e) => setAssignId(e.target.value)}
                    className="flex-1 h-8 px-2 rounded-lg bg-background border border-border text-xs text-foreground"
                  >
                    <option value="">Назначить арбитра...</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>{op.username}</option>
                    ))}
                  </select>
                  <button
                    onClick={assign}
                    className="px-3 h-8 rounded-lg bg-purple-400/10 text-purple-400 border border-purple-400/20 hover:bg-purple-400/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Icon name="UserPlus" size={12} />
                    {assignId ? "Назначить" : "Себе"}
                  </button>
                </div>
              </div>
            </div>

            {/* Чат спора */}
            <ChatWindow
              messages={msgs.map((m) => ({ ...m, id: m.id }))}
              onSend={sendMsg}
              loading={msgsLoading}
              title="Чат спора (покупатель · продавец · арбитр)"
            />
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl flex items-center justify-center text-muted-foreground" style={{ minHeight: 300 }}>
            <div className="text-center">
              <Icon name="MousePointerClick" size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Выберите спор из списка</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ЧАТ ПОДДЕРЖКИ ───────────────────────────────────────────────────────────

export function AdminSupportTab() {
  const [statusFilter, setStatusFilter] = useState<"open" | "closed">("open");
  const [tickets, setTickets] = useState<ApiSupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApiSupportTicketDetail | null>(null);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTickets = () => {
    setLoading(true);
    api.support.getTickets(statusFilter)
      .then(({ tickets: list }) => setTickets(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTickets(); }, [statusFilter]);

  const openTicket = useCallback(async (id: string) => {
    setMsgsLoading(true);
    try {
      const { ticket } = await api.support.getTicketDetail(id);
      setSelected(ticket);
    } catch {/* ignore */}
    setMsgsLoading(false);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { ticket } = await api.support.getTicketDetail(id);
        setSelected(ticket);
      } catch {/* ignore */}
    }, 5000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const sendReply = async (text: string) => {
    if (!selected) return;
    await api.support.reply(selected.id, text);
    await openTicket(selected.id);
  };

  const closeTicket = async () => {
    if (!selected) return;
    await api.support.closeTicket(selected.id);
    setSelected(null);
    loadTickets();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-display font-semibold text-base text-foreground">Чат поддержки</h2>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg">
            {(["open", "closed"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${statusFilter === s ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "open" ? `Открытые (${tickets.filter(t => t.status === "open").length})` : "Закрытые"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="border-border text-xs" onClick={loadTickets} disabled={loading}>
            <Icon name={loading ? "Loader" : "RefreshCw"} size={13} className={`${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Список тикетов */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {loading && <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>}
          {!loading && tickets.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted-foreground">
              <Icon name="Inbox" size={28} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Тикетов нет</p>
            </div>
          )}
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => openTicket(t.id)}
              className={`w-full text-left bg-surface border rounded-xl p-4 transition-colors hover:border-gold/40 ${
                selected?.id === t.id ? "border-gold/60 bg-gold/5" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-sm text-foreground">{t.username}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                      t.status === "open" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-muted-foreground border-border"
                    }`}>{t.status === "open" ? "Открыт" : "Закрыт"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{t.subject}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-[10px] text-muted-foreground">{t.updatedAt}</div>
                  {t.msgCount > 0 && <div className="text-[10px] text-gold">{t.msgCount} сообщ.</div>}
                </div>
              </div>
              {t.operatorName && (
                <div className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5">
                  <Icon name="Headphones" size={10} />{t.operatorName}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Активный чат */}
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-display font-semibold text-sm text-foreground">{selected.username}</span>
                <span className="text-xs text-muted-foreground ml-2">#{selected.id}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {selected.status === "open" && (
                  <button onClick={closeTicket} className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold">
                    Закрыть тикет
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!confirm(`Заблокировать чат навсегда для ${selected.username}?`)) return;
                    await api.support.chatBan(selected.userId);
                    setSelected(null); loadTickets();
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 font-bold flex items-center gap-1"
                  title="Заблокировать чат навсегда"
                >
                  <Icon name="MessageSquareX" size={12} />Бан чата
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`⚠️ ПЕРМА-БАН для ${selected.username}? Это действие необратимо!`)) return;
                    await api.support.permaBan(selected.userId);
                    setSelected(null); loadTickets();
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-red-600/20 text-red-600 border border-red-600/30 hover:bg-red-600/30 font-bold flex items-center gap-1"
                  title="Перманентная блокировка аккаунта"
                >
                  <Icon name="Ban" size={12} />Перма-бан
                </button>
              </div>
            </div>
            <ChatWindow
              messages={(selected.messages || []).map((m) => ({
                ...m,
                id: m.id,
              }))}
              onSend={sendReply}
              loading={msgsLoading}
              closed={selected.status === "closed"}
              title={`Тема: ${selected.subject}`}
            />
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl flex items-center justify-center text-muted-foreground" style={{ minHeight: 300 }}>
            <div className="text-center">
              <Icon name="MousePointerClick" size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Выберите тикет из списка</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}