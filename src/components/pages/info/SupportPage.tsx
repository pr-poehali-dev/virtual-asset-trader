import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

// ─── ЧАТ ПОДДЕРЖКИ ────────────────────────────────────────────────────────────
// Живой чат теперь работает через виджет parsesite.ru (подключён в index.html,
// открывается плавающей кнопкой в правом нижнем углу на всех страницах сайта).
// Самописный чат-компонент убран, чтобы не дублировать функциональность.

function OpenWidgetCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4">
        <Icon name="MessageCircle" size={26} className="text-gold" />
      </div>
      <h3 className="font-display font-semibold text-base text-foreground mb-2">
        Онлайн-чат с поддержкой
      </h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
        Нажмите на значок чата в правом нижнем углу экрана — оператор ответит вам в реальном времени.
      </p>
      <Button
        className="bg-gold text-background hover:bg-gold/90 font-bold"
        onClick={() => {
          // Виджет parsesite.ru сам создаёт кнопку в углу экрана — просто подсказываем где искать
          const el = document.querySelector<HTMLElement>("[data-key='pk_0ae32170e969dec33900de7a5b3cfb94']");
          el?.click();
        }}
      >
        <Icon name="Headphones" size={15} className="mr-2" />
        Открыть чат
      </Button>
    </div>
  );
}

// ─── ГЛАВНАЯ СТРАНИЦА ─────────────────────────────────────────────────────────

export function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-2">
        Служба поддержки
      </h1>
      <p className="text-muted-foreground text-sm mb-8">
        Мы на связи 24/7 для решения любых вопросов
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {[
          {
            icon: "MessageCircle",
            title: "Онлайн-чат",
            desc: "Ответ от оператора в рабочее время — в течение нескольких минут",
          },
          {
            icon: "Mail",
            title: "Электронная почта",
            desc: "gorant.shop-supp0rt@yandex.ru · ответ до 24 часов",
          },
        ].map((c) => (
          <div
            key={c.title}
            className="bg-surface border border-border rounded-xl p-6 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
              <Icon name={c.icon} size={18} className="text-gold" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground mb-1">
                {c.title}
              </h3>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Онлайн-чат */}
      <div className="mb-10">
        <OpenWidgetCard />
      </div>

      {/* FAQ */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="font-display font-semibold text-base text-foreground mb-5">
          Часто задаваемые вопросы
        </h2>
        <div className="space-y-3">
          {[
            {
              q: "Сколько времени занимает проверка сделки?",
              a: "Стандартная проверка занимает до 30 минут. Для крупных сделок (от ₽ 50 000) — до 2 рабочих часов.",
            },
            {
              q: "Что делать, если продавец исчез после оплаты?",
              a: "Откройте спор в разделе «Сделки» в течение 72 часов. Средства будут возвращены вам после проверки.",
            },
            {
              q: "Почему холд 8 дней для CS2 скинов?",
              a: "Это защита от мошенничества: некоторые игроки пытаются вернуть предмет через Steam после получения денег. Холд даёт время на подтверждение.",
            },
            {
              q: "Какие способы оплаты поддерживаются?",
              a: "Банковские карты, СБП, USDT (TRC-20). Все реквизиты указаны в разделе пополнения.",
            },
          ].map((faq, i) => (
            <div
              key={i}
              className="border border-border rounded-lg overflow-hidden"
            >
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <span className="font-display font-semibold text-sm text-foreground">
                    {faq.q}
                  </span>
                  <Icon
                    name="ChevronDown"
                    size={16}
                    className="text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                  />
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