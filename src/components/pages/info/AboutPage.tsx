import Icon from "@/components/ui/icon";
import { PLATFORM_COMMISSION, WITHDRAW_FEE_FIXED } from "@/components/data/constants";

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-12">
        <h1 className="font-display font-bold text-3xl text-foreground mb-3">
          О платформе Gorant Shop
        </h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Gorant Shop — специализированная платформа для безопасных сделок с
          виртуальными ценностями. Основана в 2024 году командой
          финтех-экспертов с целью устранить мошенничество в сфере цифровых
          активов.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          ["2024", "год основания"],
          ["0", "сделок закрыто"],
          ["90+ стран", "пользователей"],
          ["24/7", "поддержка"],
        ].map(([v, l]) => (
          <div
            key={l}
            className="bg-surface border border-border rounded-xl p-5 text-center"
          >
            <div className="font-display font-bold text-2xl text-gold mb-1">
              {v}
            </div>
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
              "Минимальная сумма сделки: ₽ 100",
              `Комиссия платформы: ${PLATFORM_COMMISSION}% от суммы сделки`,
              `Комиссия за вывод средств: фиксированная ₽${WITHDRAW_FEE_FIXED}`,
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
          <div
            key={section.title}
            className="bg-surface border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Icon name={section.icon} size={18} className="text-gold" />
              <h2 className="font-display font-semibold text-base text-foreground">
                {section.title}
              </h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <Icon
                    name="ChevronRight"
                    size={14}
                    className="text-gold flex-shrink-0 mt-0.5"
                  />
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