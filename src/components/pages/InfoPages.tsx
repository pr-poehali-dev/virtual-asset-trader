import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
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
          {DEALS.map((d) => {
            const s = STATUS_MAP[d.status];
            return (
              <div
                key={d.id}
                onClick={() => setSelected(d)}
                className={`bg-surface border rounded-xl p-5 cursor-pointer transition-all hover-scale ${
                  selected?.id === d.id ? "border-gold/50 bg-gold/5" : "border-border hover:border-border/80"
                }`}
              >
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
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        i < d.step ? "bg-gold text-background" : i === d.step ? "bg-gold/20 border border-gold/50 text-gold" : "bg-secondary text-muted-foreground"
                      }`}>
                        <Icon name={i < d.step ? "Check" : step.icon} size={11} />
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`h-px flex-1 ${i < d.step - 1 ? "bg-gold" : "bg-border"}`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {STEPS.map((step) => (
                    <span key={step.label} className="text-[9px] text-muted-foreground text-center w-1/4">{step.label}</span>
                  ))}
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
                {[
                  ["ID сделки", selected.id],
                  ["Товар", selected.product],
                  ["Продавец", selected.seller],
                  ["Покупатель", selected.buyer],
                  ["Дата", selected.date],
                  ["Сумма", `₽ ${selected.amount.toLocaleString("ru-RU")}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                {selected.status === "escrow" && (
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-semibold text-sm">
                    Подтвердить получение
                  </Button>
                )}
                {selected.status !== "completed" && (
                  <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground font-semibold text-sm">
                    Открыть спор
                  </Button>
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
        <h1 className="font-display font-bold text-3xl text-foreground mb-3">Гарантийная защита TrustEx</h1>
        <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Система эскроу — это финансовый посредник, который гарантирует честность сделки для обеих сторон
        </p>
      </div>

      <div className="space-y-4 mb-12">
        {[
          {
            icon: "Lock",
            title: "Как работает удержание средств",
            body: "Когда покупатель оплачивает товар, деньги поступают на изолированный счёт эскроу TrustEx, а не напрямую продавцу. Средства остаются там до тех пор, пока обе стороны не подтвердят выполнение сделки.",
          },
          {
            icon: "CheckCircle",
            title: "Условия выплаты продавцу",
            body: "Деньги переводятся продавцу только после: (1) подтверждения получения товара покупателем, или (2) истечения 72 часов после передачи без возражений покупателя.",
          },
          {
            icon: "AlertTriangle",
            title: "Защита покупателя",
            body: "Если товар не соответствует описанию или не был передан, покупатель открывает спор в течение 72 часов. TrustEx изучает доказательства и принимает решение о возврате или выплате.",
          },
          {
            icon: "Scale",
            title: "Разрешение споров",
            body: "Служба медиации TrustEx рассматривает каждый случай индивидуально. Средний срок рассмотрения — 3 рабочих дня. В 94% споров достигается взаимоприемлемое решение без судебных разбирательств.",
          },
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
          <span className="font-display font-black text-5xl text-gold">2%</span>
          <span className="text-muted-foreground">от суммы сделки</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Комиссия взимается только при успешном завершении сделки. Никаких скрытых платежей или абонентской платы.
        </p>
      </div>
    </div>
  );
}

// ─── SUPPORT ──────────────────────────────────────────────────────────────────

export function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <h1 className="font-display font-bold text-3xl text-foreground mb-2">Служба поддержки</h1>
      <p className="text-muted-foreground text-sm mb-10">Мы на связи 24/7 для решения любых вопросов</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {[
          { icon: "MessageCircle", title: "Онлайн-чат", desc: "Ответ за 2 минуты в рабочее время", action: "Открыть чат" },
          { icon: "Mail", title: "Электронная почта", desc: "support@trustex.ru · ответ до 24 часов", action: "Написать" },
          { icon: "Phone", title: "Телефон", desc: "8 (800) 555-00-12 · Пн–Пт 9:00–20:00", action: "Позвонить" },
        ].map((c) => (
          <div key={c.title} className="bg-surface border border-border rounded-xl p-6 flex flex-col hover-scale">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
              <Icon name={c.icon} size={22} className="text-gold" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground mb-1">{c.title}</h3>
            <p className="text-xs text-muted-foreground mb-5 flex-1">{c.desc}</p>
            <Button variant="outline" size="sm" className="border-border hover:border-gold/40 font-semibold text-xs">
              {c.action}
            </Button>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="font-display font-semibold text-base text-foreground mb-5">Часто задаваемые вопросы</h2>
        <div className="space-y-3">
          {[
            { q: "Сколько времени занимает проверка сделки?", a: "Стандартная проверка занимает до 30 минут. Для крупных сделок (от ₽ 50 000) — до 2 рабочих часов." },
            { q: "Что делать, если продавец исчез после оплаты?", a: "Откройте спор в разделе «Сделки» в течение 72 часов. Средства будут возвращены вам после проверки." },
            { q: "Можно ли отменить сделку?", a: "Да, до момента передачи товара обе стороны могут отменить сделку по взаимному согласию. Деньги возвращаются покупателю в течение 1 рабочего дня." },
            { q: "Какие способы оплаты поддерживаются?", a: "Банковские карты Visa/MasterCard/МИР, СБП, ЮMoney, USDT (TRC-20, ERC-20)." },
          ].map((faq, i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <span className="font-display font-semibold text-sm text-foreground">{faq.q}</span>
                  <Icon name="ChevronDown" size={16} className="text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {faq.a}
                </div>
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
        <h1 className="font-display font-bold text-3xl text-foreground mb-3">О платформе TrustEx</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          TrustEx — специализированная платформа для безопасных сделок с виртуальными ценностями.
          Основана в 2021 году командой финтех-экспертов с целью устранить мошенничество в сфере цифровых активов.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          ["2021", "год основания"],
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
              "Комиссия платформы: 2% от суммы (не менее ₽ 50)",
              "Срок удержания средств: до подтверждения обеими сторонами или 72 часа",
              "Лимит одной сделки без верификации: ₽ 100 000",
              "Верифицированные аккаунты: лимит ₽ 5 000 000",
            ],
          },
          {
            title: "Конфиденциальность",
            icon: "Eye",
            items: [
              "Персональные данные хранятся на серверах в РФ (ФЗ-152)",
              "Данные платёжных карт не хранятся — используется токенизация",
              "История сделок хранится 5 лет согласно требованиям ЦБ РФ",
              "Передача данных третьим лицам: только по законному запросу органов",
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
