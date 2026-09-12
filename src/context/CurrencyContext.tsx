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
    chats: "Чаты",
    chats_subtitle: "Переписка с продавцами и покупателями по вашим сделкам",
    no_chats: "Пока нет сделок с перепиской",
    select_dialog: "Выберите диалог из списка слева",
    dispute_chat: "Чат по спору",
    deal_chat: "Чат по сделке",
    seller_label: "Продавец",
    buyer_label: "Покупатель",
    no_messages: "Сообщений пока нет",
    write_message: "Написать сообщение...",
    arbiter_label: "Арбитр",
    dispute_label: "Спор",
    login_required_chats: "Войдите в аккаунт",
    login_required_chats_desc: "Чаты доступны только авторизованным пользователям",
    you_label: "Вы",
    chat_with_seller: "продавцом",
    chat_with_buyer: "покупателем",
    chat_with_prefix: "Чат со",
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
    chats: "Chats",
    chats_subtitle: "Correspondence with sellers and buyers on your deals",
    no_chats: "No deals with correspondence yet",
    select_dialog: "Select a dialog from the list on the left",
    dispute_chat: "Dispute chat",
    deal_chat: "Deal chat",
    seller_label: "Seller",
    buyer_label: "Buyer",
    no_messages: "No messages yet",
    write_message: "Write a message...",
    arbiter_label: "Arbiter",
    dispute_label: "Dispute",
    login_required_chats: "Sign in to your account",
    login_required_chats_desc: "Chats are available only to logged-in users",
    you_label: "You",
    chat_with_seller: "the seller",
    chat_with_buyer: "the buyer",
    chat_with_prefix: "Chat with",
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
    chats: "Чаттар",
    chats_subtitle: "Мәмілелер бойынша сатушылар мен сатып алушылармен хат алмасу",
    no_chats: "Әзірге хат алмасумен мәмілелер жоқ",
    select_dialog: "Сол жақтағы тізімнен диалогты таңдаңыз",
    dispute_chat: "Дау чаты",
    deal_chat: "Мәміле чаты",
    seller_label: "Сатушы",
    buyer_label: "Сатып алушы",
    no_messages: "Әзірге хабарлама жоқ",
    write_message: "Хабарлама жазу...",
    arbiter_label: "Төреші",
    dispute_label: "Дау",
    login_required_chats: "Аккаунтқа кіріңіз",
    login_required_chats_desc: "Чаттар тек тіркелген пайдаланушыларға қолжетімді",
    you_label: "Сіз",
    chat_with_seller: "сатушымен",
    chat_with_buyer: "сатып алушымен",
    chat_with_prefix: "Чат",
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
    chats: "Чати",
    chats_subtitle: "Листування з продавцями та покупцями за вашими угодами",
    no_chats: "Поки немає угод із листуванням",
    select_dialog: "Виберіть діалог зі списку зліва",
    dispute_chat: "Чат по спору",
    deal_chat: "Чат по угоді",
    seller_label: "Продавець",
    buyer_label: "Покупець",
    no_messages: "Повідомлень поки немає",
    write_message: "Написати повідомлення...",
    arbiter_label: "Арбітр",
    dispute_label: "Спір",
    login_required_chats: "Увійдіть в акаунт",
    login_required_chats_desc: "Чати доступні лише авторизованим користувачам",
    you_label: "Ви",
    chat_with_seller: "продавцем",
    chat_with_buyer: "покупцем",
    chat_with_prefix: "Чат з",
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
    chats: "Chats",
    chats_subtitle: "Korrespondenz mit Verkäufern und Käufern zu Ihren Deals",
    no_chats: "Noch keine Deals mit Korrespondenz",
    select_dialog: "Wählen Sie einen Dialog aus der Liste links",
    dispute_chat: "Streit-Chat",
    deal_chat: "Deal-Chat",
    seller_label: "Verkäufer",
    buyer_label: "Käufer",
    no_messages: "Noch keine Nachrichten",
    write_message: "Nachricht schreiben...",
    arbiter_label: "Schlichter",
    dispute_label: "Streit",
    login_required_chats: "Melden Sie sich an",
    login_required_chats_desc: "Chats sind nur für angemeldete Benutzer verfügbar",
    you_label: "Sie",
    chat_with_seller: "dem Verkäufer",
    chat_with_buyer: "dem Käufer",
    chat_with_prefix: "Chat mit",
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
    chats: "聊天",
    chats_subtitle: "与买卖双方就您的交易进行的往来消息",
    no_chats: "暂无带聊天记录的交易",
    select_dialog: "从左侧列表中选择一个对话",
    dispute_chat: "争议聊天",
    deal_chat: "交易聊天",
    seller_label: "卖家",
    buyer_label: "买家",
    no_messages: "暂无消息",
    write_message: "输入消息...",
    arbiter_label: "仲裁员",
    dispute_label: "争议",
    login_required_chats: "请登录账户",
    login_required_chats_desc: "聊天功能仅对登录用户开放",
    you_label: "您",
    chat_with_seller: "卖家",
    chat_with_buyer: "买家",
    chat_with_prefix: "与聊天",
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
        // ЦБ РФ — бесплатный, без ключа, CORS-разрешённый, поддерживает RUB/KZT/UAH/BYN
        // (frankfurter.app эти валюты не поддерживает вообще, поэтому был заменён)
        const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        const valute = data?.Valute;
        if (valute) {
          // ЦБ даёт "сколько рублей стоит X единиц валюты" (Value за Nominal единиц) —
          // нам нужно обратное: сколько валюты за 1 рубль.
          const rubPerUnit = (code: string) => {
            const v = valute[code];
            if (!v || !v.Value || !v.Nominal) return null;
            return v.Value / v.Nominal; // рублей за 1 единицу валюты
          };
          const usd = rubPerUnit("USD");
          const eur = rubPerUnit("EUR");
          const kzt = rubPerUnit("KZT");
          const uah = rubPerUnit("UAH");
          const byn = rubPerUnit("BYN");
          setRates({
            RUB: 1,
            USD: usd ? 1 / usd : FALLBACK_RATES.USD,
            USDT: usd ? 1 / usd : FALLBACK_RATES.USDT,
            EUR: eur ? 1 / eur : FALLBACK_RATES.EUR,
            KZT: kzt ? 1 / kzt : FALLBACK_RATES.KZT,
            UAH: uah ? 1 / uah : FALLBACK_RATES.UAH,
            BYN: byn ? 1 / byn : FALLBACK_RATES.BYN,
          });
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