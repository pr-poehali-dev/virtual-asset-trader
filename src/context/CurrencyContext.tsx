import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CURRENCIES, FALLBACK_RATES, LANGUAGES, type CurrencyInfo, type LangInfo } from "@/components/data/constants";

type CurrencyContextType = {
  currency: CurrencyInfo;
  setCurrency: (c: CurrencyInfo) => void;
  rates: Record<string, number>;
  convert: (amountRUB: number) => number;
  format: (amountRUB: number) => string;
  lang: LangInfo;
  setLang: (l: LangInfo) => void;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyInfo>(CURRENCIES[0]);
  const [lang, setLang] = useState<LangInfo>(LANGUAGES[0]);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    // Загружаем курсы с публичного API ЦБ РФ / exchangerate.host
    const fetchRates = async () => {
      try {
        const res = await fetch("https://api.exchangerate.host/latest?base=RUB&symbols=USD,EUR,KZT,UAH,BYN,USDT");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (data.rates) {
          setRates({ RUB: 1, ...data.rates });
        }
      } catch {
        // Используем резервные курсы
      }
    };
    fetchRates();
    const interval = setInterval(fetchRates, 5 * 60 * 1000); // обновляем каждые 5 мин
    return () => clearInterval(interval);
  }, []);

  const convert = (amountRUB: number): number => {
    const rate = rates[currency.code] ?? FALLBACK_RATES[currency.code] ?? 1;
    if (currency.code === "RUB") return amountRUB;
    return Math.round(amountRUB * rate * 100) / 100;
  };

  const format = (amountRUB: number): string => {
    const val = convert(amountRUB);
    if (currency.code === "RUB") return `${currency.symbol} ${val.toLocaleString("ru-RU")}`;
    if (currency.code === "USDT") return `${val.toFixed(2)} ${currency.symbol}`;
    return `${currency.symbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format, lang, setLang }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be inside CurrencyProvider");
  return ctx;
}
