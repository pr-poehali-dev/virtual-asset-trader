import { useState, useEffect, type CSSProperties } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PLATFORM_COMMISSION,
  BOOST_PRICE,
  SUSPICIOUS_URL_PATTERN,
} from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import type { AppProduct } from "@/context/AuthContext";
import { api } from "@/api/client";
import { BigSpendVerifyModal } from "@/components/ui/big-spend-modal";
import { BuyContactModal } from "@/components/ui/buy-contact-modal";
import { getCategoryGlow } from "@/components/data/backgroundPalette";
import { AutoTranslateText } from "@/components/ui/auto-translate-text";

// ─── CATALOG PAGE ─────────────────────────────────────────────────────────────

type BuyResult = "ok" | "no_balance" | "self" | "verify_required" | "not_enough_stock" | "contact_required" | null;

export function CatalogPage({ setActive }: { setActive: (s: string) => void }) {
  const { user: me, buyProduct, boostProduct } = useAuth();
  const { format } = useCurrency();

  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [allProducts, setAllProducts] = useState<AppProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<{ name: string; unitLabel: string; holdDays: number }[]>([]);

  // AI bot state
  const [botWarning, setBotWarning] = useState(false);
  const [botExpanded, setBotExpanded] = useState(true);

  // Buy feedback per product id
  const [buyResult, setBuyResult] = useState<Record<number, BuyResult>>({});
  const [boostResult, setBoostResult] = useState<Record<number, string>>({});
  const [pendingBuy, setPendingBuy] = useState<AppProduct | null>(null);
  const [buyQuantity, setBuyQuantity] = useState<Record<number, number>>({});
  const [contactModalProduct, setContactModalProduct] = useState<AppProduct | null>(null);
  const [contactModalLoading, setContactModalLoading] = useState(false);
  const [contactModalError, setContactModalError] = useState("");
  const [pendingBuyContact, setPendingBuyContact] = useState("");

  // Загружаем товары и категории из API
  useEffect(() => {
    setLoadingProducts(true);
    api.products.list()
      .then(({ products }) => setAllProducts(products as AppProduct[]))
      .catch(() => setAllProducts([]))
      .finally(() => setLoadingProducts(false));
    api.products.categories().then(({ categories: list }) => setCategories(list)).catch(() => {});
  }, []);

  const filtered = allProducts
    .filter((p) => category === "Все" || p.category === category)
    .filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !priceMax || p.price <= parseFloat(priceMax));

  // Top categories by product count
  const categoryCounts = categories.map((c) => ({
    cat: c.name,
    count: allProducts.filter((p) => p.category === c.name).length,
  }));
  const topCategories = [...categoryCounts].sort((a, b) => b.count - a.count).slice(0, 4);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    SUSPICIOUS_URL_PATTERN.lastIndex = 0;
    setBotWarning(SUSPICIOUS_URL_PATTERN.test(val));
  };

  const handleBuy = (product: AppProduct) => {
    if (!me) {
      setActive("login");
      return;
    }
    setContactModalError("");
    setContactModalProduct(product);
  };

  const handleConfirmBuy = async (contact: string) => {
    const product = contactModalProduct;
    if (!product) return;
    setContactModalLoading(true);
    setContactModalError("");
    const quantity = Math.max(1, buyQuantity[product.id] ?? 1);
    const fakeSellerUser = { id: product.sellerId } as import("@/context/AuthContext").AppUser;
    const result = await buyProduct(product, fakeSellerUser, quantity, contact);
    setContactModalLoading(false);
    if (result === "verify_required") {
      setContactModalProduct(null);
      setPendingBuyContact(contact);
      setPendingBuy(product);
      return;
    }
    if (result === "contact_required") {
      setContactModalError("Укажите контакт для передачи товара");
      return;
    }
    setContactModalProduct(null);
    setBuyResult((prev) => ({ ...prev, [product.id]: result }));
    setTimeout(() => {
      setBuyResult((prev) => ({ ...prev, [product.id]: null }));
    }, 4000);
    if (result === "ok") {
      // Обновляем список товаров
      api.products.list().then(({ products }) => setAllProducts(products as AppProduct[])).catch(() => {});
    }
  };

  const handleBoost = async (productId: number) => {
    const result = await boostProduct(productId);
    setBoostResult((prev) => ({ ...prev, [productId]: result }));
    setTimeout(() => {
      setBoostResult((prev) => ({ ...prev, [productId]: "" }));
    }, 3000);
    if (result === "ok") {
      api.products.list().then(({ products }) => setAllProducts(products as AppProduct[])).catch(() => {});
    }
  };

  const getCategoryIcon = (cat: string) => {
    const map: Record<string, string> = {
      "Игровые аккаунты": "Gamepad2",
      "Программное обеспечение": "Monitor",
      "Подарочные карты": "Gift",
      "CS2 скины": "Sword",
      "PUBG Mobile akk": "Crosshair",
      "Прочее": "Star",
    };
    return map[cat] ?? "Package";
  };

  const getBuyLabel = (result: BuyResult): { text: string; color: string } | null => {
    if (!result) return null;
    if (result === "ok") return { text: "Куплено! Сделка создана.", color: "text-emerald-400" };
    if (result === "no_balance") return { text: "Недостаточно средств", color: "text-red-400" };
    if (result === "self") return { text: "Нельзя купить свой товар", color: "text-amber-400" };
    if (result === "not_enough_stock") return { text: "Недостаточно товара в наличии", color: "text-red-400" };
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-1">Каталог</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {allProducts.length === 0
              ? "Пока нет объявлений — станьте первым продавцом!"
              : `${allProducts.length} объявлений`}
          </p>
        </div>
        <Button
          className="bg-gold text-background hover:bg-gold/90 font-bold"
          onClick={() => setActive("add-product")}
        >
          <Icon name="Plus" size={15} className="mr-1.5" />
          Разместить
        </Button>
      </div>

      {/* AI Bot */}
      <div className="mb-6 bg-surface border border-gold/20 rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gold/5 transition-colors"
          onClick={() => setBotExpanded((v) => !v)}
        >
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
            <Icon name="ShieldCheck" size={18} className="text-gold" />
          </div>
          <div className="flex-1 text-left">
            <span className="font-display font-bold text-sm text-foreground">Gorant AI</span>
            <span className="text-xs text-muted-foreground ml-2">Умный помощник каталога</span>
          </div>
          <Icon
            name={botExpanded ? "ChevronUp" : "ChevronDown"}
            size={16}
            className="text-muted-foreground"
          />
        </button>

        {botExpanded && (
          <div className="px-5 pb-5 space-y-4">
            {/* Bot greeting */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="Bot" size={13} className="text-gold" />
              </div>
              <div className="bg-background border border-border rounded-xl rounded-tl-sm px-4 py-3 text-sm text-foreground max-w-lg">
                Привет! Я Gorant AI. Помогу найти нужный товар. Вот самые популярные категории
                прямо сейчас:
                <div className="flex flex-wrap gap-2 mt-3">
                  {topCategories.map(({ cat, count }) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold/10 border border-gold/20 text-xs text-gold font-semibold hover:bg-gold/20 transition-colors"
                    >
                      <Icon name={getCategoryIcon(cat)} size={11} />
                      {cat}
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {botWarning && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-red-400/10 border border-red-400/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="ShieldAlert" size={13} className="text-red-400" />
                </div>
                <div className="bg-red-400/10 border border-red-400/20 rounded-xl rounded-tl-sm px-4 py-3 text-sm text-red-400 max-w-lg">
                  <span className="font-semibold">Внимание!</span> Обнаружена внешняя ссылка в
                  поисковом запросе. Gorant Shop не несёт ответственности за переход по сторонним
                  сайтам. Не переходите по подозрительным ссылкам.
                </div>
              </div>
            )}

            {!botWarning && search && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="Bot" size={13} className="text-gold" />
                </div>
                <div className="bg-background border border-border rounded-xl rounded-tl-sm px-4 py-3 text-sm text-foreground max-w-lg">
                  Ищу «<span className="text-gold font-semibold">{search}</span>»... Найдено{" "}
                  <span className="font-semibold">{filtered.length}</span> товаров.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface border border-border rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Icon
            name="Search"
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-background border-border text-sm h-9"
          />
        </div>
        <Input
          placeholder="Цена до ₽"
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          type="number"
          className="w-36 bg-background border-border text-sm h-9"
        />
      </div>

      {/* Category buttons */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1 mb-6 sm:mb-8">
        <div className="flex gap-2 w-max sm:flex-wrap sm:w-auto">
        {["Все", ...categories.map((c) => c.name)].map((c) => (
          <button
            key={c}
            onClick={(e) => { e.preventDefault(); setCategory(c); }}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap ${
              category === c
                ? "bg-gold text-background border-gold"
                : "bg-surface border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
        </div>
      </div>

      {/* Products grid */}
      {loadingProducts ? (
        <div className="text-center py-24 text-muted-foreground">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Icon name="Package" size={18} className="text-gold" />
          </div>
          <p className="text-sm">Загрузка товаров...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Icon name="PackageOpen" size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-display font-semibold text-foreground mb-2">Товаров пока нет</p>
          <p className="text-sm mb-6">Здесь появятся объявления после их добавления продавцами</p>
          <Button
            className="bg-gold text-background hover:bg-gold/90 font-semibold"
            onClick={() => setActive("add-product")}
          >
            Разместить объявление
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((p) => {
            const isMyProduct = me?.id === p.sellerId;
            const pHoldDays = categories.find((c) => c.name === p.category)?.holdDays ?? 0;
            const sellerReceives = Math.round(p.price * (1 - PLATFORM_COMMISSION / 100));
            const result = buyResult[p.id];
            const buyFeedback = getBuyLabel(result);
            const bResult = boostResult[p.id];
            const stock = p.stock ?? 1;
            const unitLabel = p.unitLabel ?? "шт";
            const qty = Math.min(Math.max(1, buyQuantity[p.id] ?? 1), stock);

            return (
              <div
                key={p.id}
                className={`bg-surface border rounded-xl overflow-hidden flex flex-col relative transition-all ${
                  p.boosted
                    ? "border-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                    : "border-border hover:border-gold/20"
                }`}
              >
                {/* TOP badge */}
                {p.boosted && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gold text-background border border-gold/60">
                      ТОП
                    </span>
                  </div>
                )}

                {/* Thumbnail */}
                <div
                  className="category-glow h-36 flex items-center justify-center relative"
                  style={{
                    "--glow-color": getCategoryGlow(p.category).color,
                    "--glow-image": `url(${getCategoryGlow(p.category).image})`,
                  } as CSSProperties}
                >
                  <Icon
                    name={
                      p.category === "CS2 скины"
                        ? "Sword"
                        : p.category === "PUBG Mobile akk"
                        ? "Crosshair"
                        : p.category === "Игровые аккаунты"
                        ? "Gamepad2"
                        : p.category === "Подарочные карты"
                        ? "Gift"
                        : p.category === "Программное обеспечение"
                        ? "Monitor"
                        : "Package"
                    }
                    size={40}
                    className="text-border"
                  />
                  {p.badge && (
                    <span className="absolute top-3 right-3 text-xs font-display font-bold px-2 py-0.5 rounded bg-gold text-background">
                      {p.badge}
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1 gap-2">
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                  <AutoTranslateText
                    as="h3"
                    text={p.title}
                    className="font-display font-semibold text-sm text-foreground leading-tight line-clamp-2"
                  />

                  {/* Seller link */}
                  {p.sellerId && (
                    <button
                      onClick={() => setActive(`seller-${p.sellerId}`)}
                      className="text-xs text-muted-foreground hover:text-gold transition-colors text-left"
                    >
                      @{p.sellerName}
                    </button>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display font-bold text-lg text-foreground">
                      {format(p.price)}
                    </span>
                  </div>

                  {/* Seller receives info (for own product) */}
                  {isMyProduct && (
                    <p className="text-[10px] text-muted-foreground">
                      Продавец получит:{" "}
                      <span className="text-gold font-semibold">
                        ₽ {sellerReceives.toLocaleString("ru-RU")}
                      </span>
                    </p>
                  )}

                  {/* Hold + stock tags */}
                  <div className="flex flex-wrap gap-1">
                    {pHoldDays > 0 && (
                      <span className="text-[10px] text-purple-400 flex items-center gap-1 bg-purple-400/10 border border-purple-400/20 rounded-md px-2 py-0.5 w-fit">
                        <Icon name="Clock" size={9} />
                        Холд {pHoldDays} дн.
                      </span>
                    )}
                    {!isMyProduct && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-background border border-border rounded-md px-2 py-0.5 w-fit">
                        <Icon name="Package" size={9} />
                        В наличии: {stock} {unitLabel}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-2 space-y-2">
                    {/* Buy feedback */}
                    {buyFeedback && (
                      <p className={`text-xs flex items-center gap-1 ${buyFeedback.color}`}>
                        <Icon
                          name={result === "ok" ? "CheckCircle" : "AlertCircle"}
                          size={11}
                        />
                        {buyFeedback.text}
                      </p>
                    )}

                    {/* Buy / boost buttons */}
                    {isMyProduct ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground text-center">Ваш товар</p>
                        {!p.boosted && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-gold/30 text-gold hover:bg-gold/10 text-xs h-7"
                              onClick={() => handleBoost(p.id)}
                            >
                              <Icon name="TrendingUp" size={11} className="mr-1" />
                              Поднять в топ за ₽{BOOST_PRICE}
                            </Button>
                            {bResult === "no_balance" && (
                              <p className="text-[10px] text-red-400 flex items-center gap-1">
                                <Icon name="AlertCircle" size={10} />
                                Недостаточно средств
                              </p>
                            )}
                            {bResult === "ok" && (
                              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <Icon name="CheckCircle" size={10} />
                                Товар поднят в ТОП!
                              </p>
                            )}
                          </>
                        )}
                        {p.boosted && (
                          <p className="text-[10px] text-gold flex items-center gap-1 justify-center">
                            <Icon name="Star" size={10} />В топе
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {stock > 1 && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setBuyQuantity((prev) => ({ ...prev, [p.id]: Math.max(1, qty - 1) }))}
                              className="w-6 h-6 rounded border border-border text-muted-foreground hover:text-foreground hover:border-gold/40 flex items-center justify-center text-xs shrink-0"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={stock}
                              value={qty}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                setBuyQuantity((prev) => ({ ...prev, [p.id]: isNaN(v) ? 1 : Math.min(Math.max(1, v), stock) }));
                              }}
                              className="w-12 h-6 text-center text-xs bg-background border border-border rounded text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => setBuyQuantity((prev) => ({ ...prev, [p.id]: Math.min(stock, qty + 1) }))}
                              className="w-6 h-6 rounded border border-border text-muted-foreground hover:text-foreground hover:border-gold/40 flex items-center justify-center text-xs shrink-0"
                            >
                              +
                            </button>
                            <span className="text-[10px] text-muted-foreground">{unitLabel}</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          className="w-full bg-gold text-background hover:bg-gold/90 font-bold text-xs h-8"
                          onClick={() => handleBuy(p)}
                        >
                          <Icon name="ShoppingCart" size={12} className="mr-1" />
                          Купить{stock > 1 ? ` ${qty} ${unitLabel}` : ""}
                          {pHoldDays > 0 ? ` (холд ${pHoldDays}д)` : ""}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {contactModalProduct && (
        <BuyContactModal
          productTitle={contactModalProduct.title}
          quantity={Math.max(1, buyQuantity[contactModalProduct.id] ?? 1)}
          unitLabel={contactModalProduct.unitLabel ?? "шт"}
          totalPrice={format(contactModalProduct.price * Math.max(1, buyQuantity[contactModalProduct.id] ?? 1))}
          loading={contactModalLoading}
          error={contactModalError}
          onClose={() => setContactModalProduct(null)}
          onConfirm={handleConfirmBuy}
        />
      )}

      {pendingBuy && (
        <BigSpendVerifyModal
          onClose={() => setPendingBuy(null)}
          onConfirmed={async () => {
            const product = pendingBuy;
            setPendingBuy(null);
            const quantity = Math.max(1, buyQuantity[product.id] ?? 1);
            const fakeSellerUser = { id: product.sellerId } as import("@/context/AuthContext").AppUser;
            const result = await buyProduct(product, fakeSellerUser, quantity, pendingBuyContact);
            setBuyResult((prev) => ({ ...prev, [product.id]: result }));
            setTimeout(() => {
              setBuyResult((prev) => ({ ...prev, [product.id]: null }));
            }, 4000);
            if (result === "ok") {
              api.products.list().then(({ products }) => setAllProducts(products as AppProduct[])).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
