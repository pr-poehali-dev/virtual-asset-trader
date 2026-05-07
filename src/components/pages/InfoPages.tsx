import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEALS, STEPS, STATUS_MAP } from "@/components/data/constants";

// ─── DEALS ────────────────────────────────────────────────────────────────────

export function DealsPage() {
  const [selected, setSelected] = useState<typeof DEALS[0] | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <h1 className="font-display font-bold text-3xl text-foreground mb-2">История сделок</h1>
      <p className="text-muted-foreground text-sm mb-8">Текущий статус и история всех транзакций</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {DEALS.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
              <Icon name="Inbox" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Сделок пока нет</p>
            </div>
          ) : DEALS.map((d) => {
            const s = STATUS_MAP[d.status];
            return (
              <div key={d.id} onClick={() => setSelected(d)}
                className={`bg-surface border rounded-xl p-5 cursor-pointer transition-all hover-scale ${selected?.id === d.id ? "border-gold/50 bg-gold/5" : "border-border hover:border-border/80"}`}>
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
                  <span className="text-xs text-muted-foreground">Продавец: <span className="text-foreground">{d.seller}</span></span>
                  <span className="font-display font-bold text-base text-gold">₽ {d.amount.toLocaleString("ru-RU")}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div>
          {selected ? (
            <div className="bg-surface border border-gold/20 rounded-xl p-6 sticky top-24">
              <h3 className="font-display font-semibold text-base text-foreground mb-4">Детали сделки</h3>
              <div className="space-y-3 text-sm">
                {[["ID сделки", selected.id], ["Товар", selected.product], ["Продавец", selected.seller], ["Покупатель", selected.buyer], ["Дата", selected.date], ["Сумма", `₽ ${selected.amount.toLocaleString("ru-RU")}`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                {selected.status === "escrow" && (
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-semibold text-sm">Подтвердить получение</Button>
                )}
                {selected.status !== "completed" && (
                  <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground font-semibold text-sm">Открыть спор</Button>
                )}
              </div>
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

// ─── ESCROW ───────────────────────────────────────────────────────────────────

export function EscrowPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-5">
          <Icon name="ShieldCheck" size={32} className="text-gold" />
        </div>
        <h1 className="font-display font-bold text-3xl text-foreground mb-3">Гарантийная защита Gorant Shop</h1>
        <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Система эскроу — это финансовый посредник, который гарантирует честность сделки для обеих сторон
        </p>
      </div>

      <div className="space-y-4 mb-12">
        {[
          { icon: "Lock", title: "Как работает удержание средств", body: "Когда покупатель оплачивает товар, деньги поступают на изолированный счёт эскроу Gorant Shop, а не напрямую продавцу. Средства остаются там до тех пор, пока обе стороны не подтвердят выполнение сделки." },
          { icon: "CheckCircle", title: "Условия выплаты продавцу", body: "Деньги переводятся продавцу только после: (1) подтверждения получения товара покупателем, или (2) истечения 72 часов после передачи без возражений покупателя." },
          { icon: "Sword", title: "CS2 скины — особые условия", body: "При продаже скинов CS2 после подтверждения передачи обеими сторонами средства удерживаются дополнительно 8 дней (холд). Это защищает от мошенничества с возвратом предмета через Steam." },
          { icon: "AlertTriangle", title: "Защита покупателя", body: "Если товар не соответствует описанию или не был передан, покупатель открывает спор в течение 72 часов. Gorant Shop изучает доказательства и принимает решение о возврате или выплате." },
          { icon: "Scale", title: "Разрешение споров", body: "Служба медиации рассматривает каждый случай индивидуально. Средний срок рассмотрения — 3 рабочих дня. В 94% споров достигается взаимоприемлемое решение." },
        ].map((item) => (
          <div key={item.title} className="bg-surface border border-border rounded-xl p-6 flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <Icon name={item.icon} size={22} className="text-gold" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gold/10 border border-gold/25 rounded-2xl p-8 text-center">
        <h3 className="font-display font-bold text-xl text-foreground mb-2">Комиссия платформы</h3>
        <div className="flex items-baseline justify-center gap-1 my-4">
          <span className="font-display font-black text-5xl text-gold">5%</span>
          <span className="text-muted-foreground">от суммы сделки</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Комиссия взимается только при успешном завершении сделки. Никаких скрытых платежей или абонентской платы.
        </p>
      </div>
    </div>
  );
}

// ─── SUPPORT CHAT ─────────────────────────────────────────────────────────────

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

// ─── ABOUT ────────────────────────────────────────────────────────────────────

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-12">
        <h1 className="font-display font-bold text-3xl text-foreground mb-3">О платформе Gorant Shop</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Gorant Shop — специализированная платформа для безопасных сделок с виртуальными ценностями.
          Основана в 2024 году командой финтех-экспертов с целью устранить мошенничество в сфере цифровых активов.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          ["2024", "год основания"],
          ["12 400+", "сделок закрыто"],
          ["98 стран", "пользователей"],
          ["24/7", "поддержка"],
        ].map(([v, l]) => (
          <div key={l} className="bg-surface border border-border rounded-xl p-5 text-center">
            <div className="font-display font-bold text-2xl text-gold mb-1">{v}</div>
            <div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6 mb-12">
        {[
          {
            title: "Условия использования",
            icon: "FileText",
            items: [
              "Минимальная сумма сделки: ₽ 500",
              "Комиссия платформы: 5% от суммы (не менее ₽ 50)",
              "Срок удержания средств: до подтверждения обеими сторонами или 72 часа",
              "CS2 скины: дополнительный холд 8 дней после подтверждения",
              "Лимит одной сделки без верификации: ₽ 100 000",
              "Верифицированные аккаунты: лимит ₽ 5 000 000",
            ],
          },
          {
            title: "Конфиденциальность",
            icon: "Eye",
            items: [
              "Персональные данные хранятся в защищённом виде",
              "Данные платёжных карт не хранятся — используется токенизация",
              "Личные данные пользователя видны только ему самому и администраторам",
              "История сделок хранится 5 лет",
            ],
          },
        ].map((section) => (
          <div key={section.title} className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Icon name={section.icon} size={18} className="text-gold" />
              <h2 className="font-display font-semibold text-base text-foreground">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Icon name="ChevronRight" size={14} className="text-gold flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}