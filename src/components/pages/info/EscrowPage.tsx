import Icon from "@/components/ui/icon";

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
