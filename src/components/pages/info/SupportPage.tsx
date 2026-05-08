import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api, type ApiSupportTicket, type ApiSupportMessage } from "@/api/client";

// ─── ЧАТ ─────────────────────────────────────────────────────────────────────

function SupportChat() {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<ApiSupportTicket | null>(null);
  const [messages, setMessages] = useState<ApiSupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [showNew, setShowNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgCountRef = useRef<number>(0);

  const loadTicket = useCallback(async () => {
    if (!user) return;
    try {
      const { ticket: t } = await api.support.getTicket();
      if (t) {
        if (t.status === "closed" && ticket && ticket.status === "open") {
          setTicket(null);
          setMessages([]);
          setLoading(false);
          return;
        }
        setTicket(t);
        setMessages((prev) => {
          const newMsgs = t.messages;
          // Скроллим только если добавились новые сообщения
          if (newMsgs.length > msgCountRef.current) {
            msgCountRef.current = newMsgs.length;
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          }
          return newMsgs;
        });
      } else {
        setTicket(null);
        setMessages([]);
        msgCountRef.current = 0;
      }
    } catch {/* ignore */}
    setLoading(false);
  }, [user, ticket]);

  useEffect(() => {
    loadTicket();
    pollRef.current = setInterval(loadTicket, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadTicket]);

  const openTicket = async () => {
    if (!input.trim() && !subject.trim()) return;
    setSending(true);
    try {
      const { ticketId } = await api.support.openTicket(
        subject.trim() || "Вопрос в поддержку",
        input.trim()
      );
      setInput(""); setSubject(""); setShowNew(false);
      await loadTicket();
      void ticketId;
    } catch {/* ignore */}
    setSending(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !ticket) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    // Оптимистично добавляем
    const optimistic: ApiSupportMessage = {
      id: Date.now(),
      fromUser: user?.id ?? "",
      role: "user",
      text,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => {
      const updated = [...prev, optimistic];
      msgCountRef.current = updated.length;
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      return updated;
    });
    try {
      await api.support.sendMessage(ticket.id, text);
    } catch {/* ignore */}
    setSending(false);
  };

  if (!user) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <Icon name="Lock" size={28} className="mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Войдите в аккаунт, чтобы написать в поддержку</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-background/50">
        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
          <Icon name="Headphones" size={15} className="text-gold" />
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold text-sm text-foreground">
            {ticket ? `Тикет #${ticket.id}` : "Поддержка Gorant Shop"}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">
              {ticket?.operatorName ? `Оператор: ${ticket.operatorName}` : "Онлайн"}
            </span>
          </div>
        </div>
        {ticket && ticket.status === "open" && (
          <button
            onClick={() => api.support.closeTicket(ticket.id).then(() => { setTicket(null); setMessages([]); setShowNew(false); })}
            className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
            title="Закрыть тикет"
          >
            <Icon name="X" size={14} />
          </button>
        )}
        {ticket && ticket.status === "closed" && (
          <button
            onClick={() => { setTicket(null); setMessages([]); setShowNew(false); }}
            className="text-xs text-gold hover:text-gold/80 transition-colors font-semibold"
            title="Создать новое обращение"
          >
            <Icon name="Plus" size={14} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="h-64 sm:h-80 overflow-y-auto p-3 sm:p-5 space-y-3">
        {loading && (
          <div className="flex justify-center pt-10">
            <Icon name="Loader" size={20} className="text-gold animate-spin" />
          </div>
        )}

        {!loading && !ticket && !showNew && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Icon name="MessageCircle" size={32} className="text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Напишите нам — оператор ответит в течение нескольких минут</p>
            <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold mt-1"
              onClick={() => setShowNew(true)}>
              Начать чат
            </Button>
          </div>
        )}

        {!loading && !ticket && showNew && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">Тема обращения (необязательно)</p>
            <Input placeholder="Например: проблема с выводом" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="bg-background border-border text-sm" />
          </div>
        )}

        {messages.map((m, i) => (
          <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "system" ? (
              <div className="text-[10px] text-muted-foreground bg-background border border-border rounded-full px-3 py-1 mx-auto">
                {m.text}
              </div>
            ) : (
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                m.role === "user"
                  ? "bg-gold text-background rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              }`}>
                {m.role === "operator" && (
                  <p className="text-[10px] font-semibold mb-0.5 opacity-70">Оператор</p>
                )}
                <p className="text-sm leading-relaxed">{m.text}</p>
                <p className={`text-[10px] mt-1 ${m.role === "user" ? "text-background/60 text-right" : "text-muted-foreground"}`}>{m.time}</p>
              </div>
            )}
          </div>
        ))}

        {ticket?.status === "closed" && (
          <div className="flex flex-col items-center gap-3 pt-4 text-center">
            <span className="text-[10px] text-muted-foreground bg-background border border-border rounded-full px-3 py-1">
              Тикет закрыт
            </span>
            <p className="text-xs text-muted-foreground">Хотите создать новое обращение?</p>
            <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold text-xs"
              onClick={() => { setTicket(null); setMessages([]); setShowNew(false); }}>
              Новое обращение
            </Button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {(!ticket || ticket.status === "open") && (
        <div className="p-4 border-t border-border flex gap-3">
          <Input
            placeholder={ticket ? "Написать сообщение..." : "Опишите проблему..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (ticket ? sendMessage() : openTicket())}
            className="bg-background border-border text-sm flex-1"
          />
          <Button
            className="bg-gold text-background hover:bg-gold/90 font-bold px-4 shrink-0"
            onClick={ticket ? sendMessage : openTicket}
            disabled={sending || !input.trim()}
          >
            {sending
              ? <Icon name="Loader" size={16} className="animate-spin" />
              : <Icon name="Send" size={16} />}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── ГЛАВНАЯ СТРАНИЦА ─────────────────────────────────────────────────────────

export function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-2">Служба поддержки</h1>
      <p className="text-muted-foreground text-sm mb-8">Мы на связи 24/7 для решения любых вопросов</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {[
          { icon: "MessageCircle", title: "Онлайн-чат", desc: "Ответ от оператора в рабочее время — в течение нескольких минут" },
          { icon: "Mail", title: "Электронная почта", desc: "gorant.shop-supp0rt@yandex.ru · ответ до 24 часов" },
        ].map((c) => (
          <div key={c.title} className="bg-surface border border-border rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
              <Icon name={c.icon} size={18} className="text-gold" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground mb-1">{c.title}</h3>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Онлайн-чат */}
      <div className="mb-10">
        <SupportChat />
      </div>

      {/* FAQ */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="font-display font-semibold text-base text-foreground mb-5">Часто задаваемые вопросы</h2>
        <div className="space-y-3">
          {[
            { q: "Сколько времени занимает проверка сделки?", a: "Стандартная проверка занимает до 30 минут. Для крупных сделок (от ₽ 50 000) — до 2 рабочих часов." },
            { q: "Что делать, если продавец исчез после оплаты?", a: "Откройте спор в разделе «Сделки» в течение 72 часов. Средства будут возвращены вам после проверки." },
            { q: "Почему холд 8 дней для CS2 скинов?", a: "Это защита от мошенничества: некоторые игроки пытаются вернуть предмет через Steam после получения денег. Холд даёт время на подтверждение." },
            { q: "Какие способы оплаты поддерживаются?", a: "Банковские карты, СБП, USDT (TRC-20). Все реквизиты указаны в разделе пополнения." },
          ].map((faq, i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <span className="font-display font-semibold text-sm text-foreground">{faq.q}</span>
                  <Icon name="ChevronDown" size={16} className="text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">{faq.a}</div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}