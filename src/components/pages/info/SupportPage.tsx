import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMsg = { from: "user" | "support"; text: string; time: string };

const BOT_REPLIES: Record<string, string> = {
  default: "Здравствуйте! Я соединяю вас с оператором поддержки. Опишите вашу проблему подробнее, мы ответим в течение нескольких минут.",
  спор: "Для открытия спора перейдите в раздел «Сделки» и нажмите «Открыть спор» на нужной сделке. Если у вас возникли сложности — опишите ситуацию здесь.",
  вывод: "Заявки на вывод обрабатываются в течение 1–3 рабочих дней. Создайте заявку в личном кабинете → «Заявки на вывод».",
  заморожен: "Если ваш аккаунт заморожен, сообщите нам ваш ID аккаунта (из личного кабинета) и мы разберём ситуацию.",
  комиссия: "Комиссия платформы составляет 5% от суммы сделки. При выводе средств также взимается комиссия, установленная администрацией.",
  cs2: "Скины CS2 после подтверждения передачи проходят холд 8 дней — это защита от мошенничества.",
};

function getBotReply(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, reply] of Object.entries(BOT_REPLIES)) {
    if (key !== "default" && lower.includes(key)) return reply;
  }
  return BOT_REPLIES.default;
}

export function SupportPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { from: "support", text: "Добро пожаловать в поддержку Gorant Shop! Напишите ваш вопрос — оператор ответит вам.", time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = { from: "user", text: input.trim(), time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) };
    setMessages((prev) => [...prev, userMsg]);
    const captured = input.trim();
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply = getBotReply(captured);
      setMessages((prev) => [...prev, { from: "support", text: reply, time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) }]);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <h1 className="font-display font-bold text-3xl text-foreground mb-2">Служба поддержки</h1>
      <p className="text-muted-foreground text-sm mb-8">Мы на связи 24/7 для решения любых вопросов</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {[
          { icon: "MessageCircle", title: "Онлайн-чат", desc: "Ответ за 2 минуты в рабочее время", action: "Написать ниже" },
          { icon: "Mail", title: "Электронная почта", desc: "gorant.shop-support@yandex.ru · ответ до 24 часов", action: "Написать" },
        ].map((c) => (
          <div key={c.title} className="bg-surface border border-border rounded-xl p-6 flex flex-col hover-scale">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
              <Icon name={c.icon} size={22} className="text-gold" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground mb-1">{c.title}</h3>
            <p className="text-xs text-muted-foreground mb-5 flex-1">{c.desc}</p>
            <Button variant="outline" size="sm" className="border-border hover:border-gold/40 font-semibold text-xs">{c.action}</Button>
          </div>
        ))}
      </div>

      {/* Онлайн-чат */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-10">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-background/50">
          <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
            <Icon name="Headphones" size={15} className="text-gold" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm text-foreground">Поддержка Gorant Shop</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Онлайн</span>
            </div>
          </div>
        </div>

        <div className="h-80 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.from === "user" ? "bg-gold text-background rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
                <p className={`text-[10px] mt-1 ${m.from === "user" ? "text-background/60 text-right" : "text-muted-foreground"}`}>{m.time}</p>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                {[0,1,2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-border flex gap-3">
          <Input
            placeholder="Написать сообщение..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="bg-background border-border text-sm flex-1"
          />
          <Button className="bg-gold text-background hover:bg-gold/90 font-bold px-4" onClick={sendMessage}>
            <Icon name="Send" size={16} />
          </Button>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="font-display font-semibold text-base text-foreground mb-5">Часто задаваемые вопросы</h2>
        <div className="space-y-3">
          {[
            { q: "Сколько времени занимает проверка сделки?", a: "Стандартная проверка занимает до 30 минут. Для крупных сделок (от ₽ 50 000) — до 2 рабочих часов." },
            { q: "Что делать, если продавец исчез после оплаты?", a: "Откройте спор в разделе «Сделки» в течение 72 часов. Средства будут возвращены вам после проверки." },
            { q: "Почему холд 8 дней для CS2 скинов?", a: "Это защита от мошенничества: некоторые игроки пытаются вернуть предмет через Steam после получения денег. Холд даёт время на подтверждение." },
            { q: "Какие способы оплаты поддерживаются?", a: "Банковские карты Visa/MasterCard/МИР, СБП, USDT (TRC-20, ERC-20). Все реквизиты указаны в разделе оплаты." },
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
