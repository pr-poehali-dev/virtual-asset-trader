import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiErrorMessage } from "@/api/client";

// ─── МОДАЛКА ПОДТВЕРЖДЕНИЯ КРУПНОЙ ПОКУПКИ ────────────────────────────────────
// Показывается когда backend возвращает big_spend_verification_required (траты > 3000 ₽,
// не подтверждённые кодом в текущем календарном месяце). После успешного подтверждения
// код действует до конца месяца — повторно запрашивать не нужно.

export function BigSpendVerifyModal({
  onConfirmed,
  onClose,
}: {
  onConfirmed: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"intro" | "code">("intro");
  const [ticketId, setTicketId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const requestCode = async () => {
    setSending(true);
    setError("");
    try {
      const res = await api.security.spendRequest();
      setTicketId(res.ticketId);
      setMaskedEmail(res.maskedEmail);
      setStep("code");
    } catch (e) {
      setError(apiErrorMessage(e));
    }
    setSending(false);
  };

  const confirm = async () => {
    if (!code.trim()) { setError("Введите код из письма"); return; }
    setSending(true);
    setError("");
    try {
      await api.security.spendConfirm(ticketId, code.trim());
      onConfirmed();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-sm bg-surface border border-gold/20 rounded-2xl p-6">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-3">
            <Icon name={step === "intro" ? "ShieldAlert" : "Mail"} size={22} className="text-gold" />
          </div>
          <h3 className="font-display font-semibold text-base text-foreground mb-1">
            Подтверждение крупной покупки
          </h3>
          <p className="text-xs text-muted-foreground">
            {step === "intro"
              ? "Сумма свыше ₽3 000 требует подтверждения кодом с почты (один раз в месяц)"
              : `Код отправлен на ${maskedEmail}`}
          </p>
        </div>

        {step === "code" && (
          <Input
            placeholder="123456"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
            className="bg-background border-border text-sm text-center font-mono text-lg tracking-widest mb-3"
            maxLength={6}
          />
        )}

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1 justify-center mb-3">
            <Icon name="AlertCircle" size={12} />{error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="flex-1 border-border" onClick={onClose}>
            Отмена
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-gold text-background hover:bg-gold/90 font-bold"
            onClick={step === "intro" ? requestCode : confirm}
            disabled={sending}
          >
            {sending && <Icon name="Loader" size={13} className="animate-spin mr-1.5" />}
            {step === "intro" ? "Получить код" : "Подтвердить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
