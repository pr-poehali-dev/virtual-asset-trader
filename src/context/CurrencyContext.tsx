import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CURRENCIES, FALLBACK_RATES, LANGUAGES, type CurrencyInfo, type LangInfo } from "@/components/data/constants";

// ─── ПЕРЕВОДЫ UI ──────────────────────────────────────────────────────────────

export const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  ru: {
    home: "Главная", catalog: "Каталог", deals: "Сделки", about: "О платформе",
    support: "Поддержка", login: "Войти", logout: "Выйти", register: "Регистрация",
    start_deal: "Начать сделку", search: "Поиск", buy: "Купить", sell: "Продать",
    balance: "Баланс", notifications: "Уведомления", withdrawals: "Выводы", deposit: "Пополнение",
    verified: "Верифицирован", not_verified: "Не верифицирован",
    profile: "Профиль", my_deals: "Мои сделки", overview: "Обзор",
    place_ad: "Разместить объявление", boost: "Поднять в топ",
    commission: "Комиссия", seller_receives: "Продавец получит",
    hold_cs2: "Холд 8 дней (CS2)", hold_pubg: "Холд 14 дней (PUBG)",
    add_review: "Оставить отзыв", reviews: "Отзывы",
    no_products: "Товаров пока нет", no_deals: "Сделок пока нет",
    submit: "Подтвердить", cancel: "Отмена", save: "Сохранить",
    amount: "Сумма", to_receive: "К получению",
    protected: "Защищённое соединение",
    admin: "Админ",
    games: "Ставки",
  },
  en: {
    home: "Home", catalog: "Catalog", deals: "Deals", about: "About",
    support: "Support", login: "Sign In", logout: "Sign Out", register: "Register",
    start_deal: "Start Deal", search: "Search", buy: "Buy", sell: "Sell",
    balance: "Balance", notifications: "Notifications", withdrawals: "Withdrawals", deposit: "Deposit",
    verified: "Verified", not_verified: "Not Verified",
    profile: "Profile", my_deals: "My Deals", overview: "Overview",
    place_ad: "Post Listing", boost: "Boost to Top",
    commission: "Commission", seller_receives: "Seller Receives",
    hold_cs2: "8-day Hold (CS2)", hold_pubg: "14-day Hold (PUBG)",
    add_review: "Leave Review", reviews: "Reviews",
    no_products: "No listings yet", no_deals: "No deals yet",
    submit: "Confirm", cancel: "Cancel", save: "Save",
    amount: "Amount", to_receive: "You Receive",
    protected: "Secure Connection",
    admin: "Admin",
    games: "Bets",
  },
  kz: {
    home: "Басты бет", catalog: "Каталог", deals: "Мәмілелер", about: "Платформа туралы",
    support: "Қолдау", login: "Кіру", logout: "Шығу", register: "Тіркелу",
    start_deal: "Мәміле бастау", search: "Іздеу", buy: "Сатып алу", sell: "Сату",
    balance: "Баланс", notifications: "Хабарламалар", withdrawals: "Шығару", deposit: "Толтыру",
    verified: "Расталған", not_verified: "Расталмаған",
    profile: "Профиль", my_deals: "Менің мәмілелерім", overview: "Шолу",
    place_ad: "Хабарландыру орналастыру", boost: "Жоғары шығару",
    commission: "Комиссия", seller_receives: "Сатушы алады",
    hold_cs2: "8 күн ұстау (CS2)", hold_pubg: "14 күн ұстау (PUBG)",
    add_review: "Пікір қалдыру", reviews: "Пікірлер",
    no_products: "Тауарлар жоқ", no_deals: "Мәмілелер жоқ",
    submit: "Растау", cancel: "Болдырмау", save: "Сақтау",
    amount: "Сома", to_receive: "Алынатын сома",
    protected: "Қорғалған байланыс",
    admin: "Әкімші",
  },
  uk: {
    home: "Головна", catalog: "Каталог", deals: "Угоди", about: "Про платформу",
    support: "Підтримка", login: "Увійти", logout: "Вийти", register: "Реєстрація",
    start_deal: "Почати угоду", search: "Пошук", buy: "Купити", sell: "Продати",
    balance: "Баланс", notifications: "Сповіщення", withdrawals: "Виведення", deposit: "Поповнення",
    verified: "Верифікований", not_verified: "Не верифікований",
    profile: "Профіль", my_deals: "Мої угоди", overview: "Огляд",
    place_ad: "Розмістити оголошення", boost: "Підняти в топ",
    commission: "Комісія", seller_receives: "Продавець отримає",
    hold_cs2: "Холд 8 днів (CS2)", hold_pubg: "Холд 14 днів (PUBG)",
    add_review: "Залишити відгук", reviews: "Відгуки",
    no_products: "Товарів поки немає", no_deals: "Угод поки немає",
    submit: "Підтвердити", cancel: "Скасувати", save: "Зберегти",
    amount: "Сума", to_receive: "До отримання",
    protected: "Захищене з'єднання",
    admin: "Адмін",
  },
  de: {
    home: "Startseite", catalog: "Katalog", deals: "Deals", about: "Über uns",
    support: "Support", login: "Einloggen", logout: "Ausloggen", register: "Registrieren",
    start_deal: "Deal starten", search: "Suche", buy: "Kaufen", sell: "Verkaufen",
    balance: "Guthaben", notifications: "Benachrichtigungen", withdrawals: "Auszahlungen", deposit: "Einzahlung",
    verified: "Verifiziert", not_verified: "Nicht verifiziert",
    profile: "Profil", my_deals: "Meine Deals", overview: "Übersicht",
    place_ad: "Anzeige schalten", boost: "Nach oben heben",
    commission: "Provision", seller_receives: "Verkäufer erhält",
    hold_cs2: "8-Tage-Halt (CS2)", hold_pubg: "14-Tage-Halt (PUBG)",
    add_review: "Bewertung abgeben", reviews: "Bewertungen",
    no_products: "Noch keine Produkte", no_deals: "Noch keine Deals",
    submit: "Bestätigen", cancel: "Abbrechen", save: "Speichern",
    amount: "Betrag", to_receive: "Zu erhalten",
    protected: "Sichere Verbindung",
    admin: "Admin",
  },
  zh: {
    home: "首页", catalog: "目录", deals: "交易", about: "关于平台",
    support: "客服", login: "登录", logout: "退出", register: "注册",
    start_deal: "开始交易", search: "搜索", buy: "购买", sell: "出售",
    balance: "余额", notifications: "通知", withdrawals: "提现", deposit: "充值",
    verified: "已认证", not_verified: "未认证",
    profile: "个人资料", my_deals: "我的交易", overview: "概览",
    place_ad: "发布商品", boost: "置顶推广",
    commission: "手续费", seller_receives: "卖家收到",
    hold_cs2: "冻结8天 (CS2)", hold_pubg: "冻结14天 (PUBG)",
    add_review: "留下评价", reviews: "评价",
    no_products: "暂无商品", no_deals: "暂无交易",
    submit: "确认", cancel: "取消", save: "保存",
    amount: "金额", to_receive: "到账金额",
    protected: "安全连接",
    admin: "管理员",
  },
};

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

type CurrencyContextType = {
  currency: CurrencyInfo;
  setCurrency: (c: CurrencyInfo) => void;
  rates: Record<string, number>;
  convert: (amountRUB: number) => number;
  format: (amountRUB: number) => string;
  lang: LangInfo;
  setLang: (l: LangInfo) => void;
  t: (key: string) => string;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyInfo>(CURRENCIES[0]);
  const [lang, setLang] = useState<LangInfo>(LANGUAGES[0]);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Используем frankfurter.app — бесплатный, без ключа, CORS-разрешённый
        // base=RUB, конвертируем в нужные валюты
        const res = await fetch("https://api.frankfurter.app/latest?from=RUB&to=USD,EUR,KZT,UAH,BYN");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (data.rates) {
          // frankfurter возвращает сколько целевой валюты за 1 RUB
          setRates({ RUB: 1, USDT: data.rates.USD ?? FALLBACK_RATES.USDT, ...data.rates });
        }
      } catch {
        // Используем резервные курсы
      }
    };
    fetchRates();
    const interval = setInterval(fetchRates, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const convert = (amountRUB: number): number => {
    if (currency.code === "RUB") return amountRUB;
    const rate = rates[currency.code] ?? FALLBACK_RATES[currency.code] ?? 1;
    // rate = сколько единиц целевой валюты за 1 RUB
    return Math.round(amountRUB * rate * 100) / 100;
  };

  const format = (amountRUB: number): string => {
    const val = convert(amountRUB);
    if (currency.code === "RUB") {
      return `${currency.symbol}\u00A0${val.toLocaleString("ru-RU")}`;
    }
    if (currency.code === "USDT") {
      return `${val.toFixed(2)}\u00A0${currency.symbol}`;
    }
    if (currency.code === "KZT") {
      return `${val.toLocaleString("ru-RU")}\u00A0${currency.symbol}`;
    }
    return `${currency.symbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const t = (key: string): string => {
    const dict = UI_TRANSLATIONS[lang.code] ?? UI_TRANSLATIONS["ru"];
    return dict[key] ?? UI_TRANSLATIONS["ru"][key] ?? key;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format, lang, setLang, t }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be inside CurrencyProvider");
  return ctx;
}