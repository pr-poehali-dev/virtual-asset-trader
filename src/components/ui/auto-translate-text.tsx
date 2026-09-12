import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/api/client";
import { useCurrency } from "@/context/CurrencyContext";

// ─── АВТОПЕРЕВОД ТЕКСТА (названия/описания товаров, реплики в чате) ─────────
// В отличие от TranslateMessage (перевод по клику), этот компонент сам решает,
// нужен ли перевод: сравнивает алфавит текста с ожидаемым алфавитом языка
// интерфейса пользователя, и если они не совпадают — переводит автоматически,
// без участия пользователя. Результат кэшируется, чтобы не дёргать API повторно
// для одного и того же текста на одной и той же странице.

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
  ru: "cyrillic",
  kz: "cyrillic",
  uk: "cyrillic",
  en: "latin",
  de: "latin",
  zh: "cjk",
};

// Кэш переводов на время жизни вкладки: text|target -> translated
const cache = new Map<string, string>();

export function AutoTranslateText({
  text,
  as: Tag = "span",
  className = "",
}: {
  text: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}) {
  const { lang } = useCurrency();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const expectedScript = LANG_SCRIPT[lang.code] ?? "cyrillic";
  const actualScript = detectScript(text);
  const needsTranslation = text.trim().length > 1 && actualScript !== "other" && actualScript !== expectedScript;

  useEffect(() => {
    setTranslated(null);
    setShowOriginal(false);
    if (!needsTranslation) return;
    const key = `${lang.code}|${text}`;
    const cached = cache.get(key);
    if (cached) {
      setTranslated(cached);
      return;
    }
    let cancelled = false;
    api.translate.text(text, lang.code)
      .then(({ translated: result }) => {
        if (cancelled) return;
        cache.set(key, result);
        setTranslated(result);
      })
      .catch(() => { /* тихо оставляем оригинал при ошибке перевода */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, lang.code, needsTranslation]);

  if (!needsTranslation || !translated) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className}>
      {showOriginal ? text : translated}{" "}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowOriginal((v) => !v); }}
        className="inline-flex items-center gap-0.5 text-[9px] opacity-50 hover:opacity-90 align-middle ml-0.5"
        title={showOriginal ? "Показать перевод" : "Показать оригинал"}
      >
        <Icon name="Languages" size={9} />
      </button>
    </Tag>
  );
}
