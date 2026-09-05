import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── МОДАЛКА ВВОДА КОНТАКТА ДЛЯ ПЕРЕДАЧИ ТОВАРА ────────────────────────────────
// Показывается перед покупкой: покупатель указывает игровой ID / трейд-ссылку /
// другой способ связи, чтобы продавец знал, куда передать товар.

export function BuyContactModal({
  productTitle,
  quantity,
  unitLabel,
  totalPrice,
  onConfirm,
  onClose,
  loading,
  error,
}: {
  productTitle: string;
  quantity: number;
  unitLabel: string;
  totalPrice: string;
  onConfirm: (contact: string) => void;
  onClose: () => void;
  loading?: boolean;
  error?: string;
}) {
  const [contact, setContact] = useState("");
  const [localError, setLocalError] = useState("");

  const handleConfirm = () => {
    if (!contact.trim()) {
      setLocalError("Укажите игровой ID, трейд-ссылку или другой способ связи");
      return;
    }
    setLocalError("");
    onConfirm(contact.trim());
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-sm bg-surface border border-gold/20 rounded-2xl p-6">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-3">
            <Icon name="Send" size={22} className="text-gold" />
          </div>
          <h3 className="font-display font-semibold text-base text-foreground mb-1">
            Куда передать товар?
          </h3>
          <p className="text-xs text-muted-foreground">
            «{productTitle}» · {quantity} {unitLabel} · {totalPrice}
          </p>
        </div>

        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
          Игровой ID, трейд-ссылка или контакт *
        </label>
        <Input
          placeholder="Например: Steam trade-ссылка или ID в игре"
          value={contact}
          onChange={(e) => { setContact(e.target.value); setLocalError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className="bg-background border-border text-sm mb-1"
          autoFocus
        />
        <p className="text-[11px] text-muted-foreground mb-3">
          Продавец увидит эти данные сразу после оплаты и сможет передать товар.
        </p>

        {(localError || error) && (
          <p className="text-xs text-red-400 flex items-center gap-1 mb-3">
            <Icon name="AlertCircle" size={12} />{localError || error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="flex-1 border-border" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-gold text-background hover:bg-gold/90 font-bold"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Icon name="Loader" size={13} className="animate-spin mr-1.5" />}
            Оплатить
          </Button>
        </div>
      </div>
    </div>
  );
}
