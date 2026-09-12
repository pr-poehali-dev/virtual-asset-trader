import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/api/client";
import { useCurrency } from "@/context/CurrencyContext";

// ─── АВТОПЕРЕВОД СООБЩЕНИЙ ЧАТА ──────────────────────────────────────────────
// Если продавец и покупатель говорят на разных языках (например, продавец
// пишет по-английски, а покупатель русскоязычный), чужое сообщение переводится
// на язык интерфейса пользователя автоматически, без клика — определяется по
// алфавиту текста. Ниже перевода всегда есть возможность посмотреть оригинал.

type Script = "cyrillic" | "latin" | "cjk" | "other";

function detectScript(text: string): Script {
  const cyr = (text.match(/[а-яёА-ЯЁ]/g) || []).length;
  const lat = (text.match(/[a-zA-Z]/g) || []).length;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const max = Math.max(cyr, lat, cjk);
  if (max === 0) return "other";
  if (max === cjk) return "cjk";
  if (max === cyr) return "cyrillic";
  return "latin";
}

const LANG_SCRIPT: Record<string, Script> = {
  ru: "cyrillic", kz: "cyrillic", uk: "cyrillic",
  en: "latin", de: "latin",
  zh: "cjk",
};

const cache = new Map<string, string>();

export function TranslateMessage({ text, className = "" }: { text: string; className?: string }) {
  const { lang } = useCurrency();
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const expectedScript = LANG_SCRIPT[lang.code] ?? "cyrillic";
  const actualScript = detectScript(text);
  const differentLanguage = text.trim().length > 1 && actualScript !== "other" && actualScript !== expectedScript;

  // Автоматический перевод, если язык сообщения явно отличается от языка интерфейса
  useEffect(() => {
    setTranslated(null);
    setShowOriginal(false);
    setError(false);
    if (!differentLanguage) return;
    const key = `${lang.code}|${text}`;
    const cached = cache.get(key);
    if (cached) { setTranslated(cached); return; }
    let cancelled = false;
    setLoading(true);
    api.translate.text(text, lang.code)
      .then(({ translated: result }) => {
        if (cancelled) return;
        cache.set(key, result);
        setTranslated(result);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, lang.code, differentLanguage]);

  if (!text.trim()) return null;

  const manualTranslate = async () => {
    if (translated !== null) { setShowOriginal((v) => !v); return; }
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
      {translated !== null && !showOriginal && (
        <p className="text-xs italic opacity-90 mt-1 pt-1 border-t border-current/10 flex items-start gap-1">
          <Icon name="Languages" size={11} className="shrink-0 mt-0.5 opacity-60" />
          <span>{translated}</span>
        </p>
      )}
      {(differentLanguage || translated !== null) && (
        <button
          type="button"
          onClick={manualTranslate}
          disabled={loading}
          className="text-[10px] opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1 mt-0.5"
        >
          {loading ? (
            <Icon name="Loader" size={10} className="animate-spin" />
          ) : (
            <Icon name="Languages" size={10} />
          )}
          {error ? "Ошибка перевода" : translated !== null ? (showOriginal ? "Показать перевод" : "Показать оригинал") : "Перевести"}
        </button>
      )}
    </div>
  );
}
