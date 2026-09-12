import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/api/client";
import { useCurrency } from "@/context/CurrencyContext";

// ─── КНОПКА-ПЕРЕВОДЧИК ДЛЯ СООБЩЕНИЙ ЧАТА ────────────────────────────────────
// Переводит текст чужого сообщения на язык интерфейса текущего пользователя.
// Используется в чатах сделок, спорах и поддержке — переписка может идти
// на разных языках (например, товар описан по-английски, а покупатель русский).

export function TranslateMessage({ text, className = "" }: { text: string; className?: string }) {
  const { lang } = useCurrency();
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (!text.trim()) return null;

  const handleTranslate = async () => {
    if (translated !== null) {
      setTranslated(null);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const { translated: result } = await api.translate.text(text, lang.code);
      setTranslated(result);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div className={className}>
      {translated !== null && (
        <p className="text-xs italic opacity-90 mt-1 pt-1 border-t border-current/10 flex items-start gap-1">
          <Icon name="Languages" size={11} className="shrink-0 mt-0.5 opacity-60" />
          <span>{translated}</span>
        </p>
      )}
      <button
        type="button"
        onClick={handleTranslate}
        disabled={loading}
        className="text-[10px] opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1 mt-0.5"
      >
        {loading ? (
          <Icon name="Loader" size={10} className="animate-spin" />
        ) : (
          <Icon name="Languages" size={10} />
        )}
        {error ? "Ошибка перевода" : translated !== null ? "Скрыть перевод" : "Перевести"}
      </button>
    </div>
  );
}
