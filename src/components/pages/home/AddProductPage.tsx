import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLATFORM_COMMISSION } from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";
import type { AppProduct } from "@/context/AuthContext";
import { api } from "@/api/client";

// ─── ADD PRODUCT PAGE ─────────────────────────────────────────────────────────

export function AddProductPage({ setActive }: { setActive: (s: string) => void }) {
  const { user, addProduct } = useAuth();
  const [categories, setCategories] = useState<{ name: string; unitLabel: string; holdDays: number }[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [desc, setDesc] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.products.categories().then(({ categories: list }) => {
      setCategories(list);
      if (list.length > 0) setCategory((prev) => prev || list[0].name);
    }).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center animate-fade-in">
        <Icon name="LogIn" size={40} className="mx-auto mb-4 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground mb-4">Войдите, чтобы разместить объявление</p>
        <Button
          className="bg-gold text-background hover:bg-gold/90 font-semibold"
          onClick={() => setActive("login")}
        >
          Войти
        </Button>
      </div>
    );
  }

  const currentCat = categories.find((c) => c.name === category);
  const holdDays = currentCat?.holdDays ?? 0;
  const unitLabel = currentCat?.unitLabel ?? "шт";

  const handleSubmit = () => {
    setError("");
    if (!title.trim()) {
      setError("Введите название товара");
      return;
    }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setError("Введите корректную цену");
      return;
    }
    const stockNum = parseInt(stock, 10);
    if (!stock || isNaN(stockNum) || stockNum <= 0) {
      setError("Введите корректное количество в наличии");
      return;
    }
    const p: AppProduct & { stock: number } = {
      id: Date.now(),
      title: title.trim(),
      category,
      price: Math.round(priceNum),
      stock: stockNum,
      rating: 0,
      reviews: 0,
      sellerId: user.id,
      sellerName: user.username,
      badge: null,
      boosted: false,
      verified: user.verified,
    };
    addProduct(p);
    setSuccess(true);
    setTitle("");
    setPrice("");
    setStock("1");
    setDesc("");
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      <button
        onClick={() => setActive("catalog")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <Icon name="ArrowLeft" size={14} />
        Назад
      </button>
      <h1 className="font-display font-bold text-2xl text-foreground mb-8">
        Разместить объявление
      </h1>

      {success && (
        <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Icon name="CheckCircle" size={18} className="text-emerald-400" />
          <div>
            <span className="text-sm text-emerald-400 font-semibold block">
              Объявление успешно опубликовано!
            </span>
            <span className="text-xs text-emerald-400/70">
              Товар появился на странице продавца и в каталоге.
            </span>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
            Название товара *
          </label>
          <Input
            placeholder="Например: Steam аккаунт — 200 игр"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSuccess(false);
              setError("");
            }}
            className="bg-background border-border text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Категория
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSuccess(false);
              }}
              className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
            >
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Цена за {unitLabel} (₽) *
            </label>
            <Input
              placeholder="5000"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setSuccess(false);
                setError("");
              }}
              type="number"
              min="1"
              className="bg-background border-border text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
            Количество в наличии ({unitLabel}) *
          </label>
          <Input
            placeholder="Например: 100"
            value={stock}
            onChange={(e) => {
              setStock(e.target.value);
              setSuccess(false);
              setError("");
            }}
            type="number"
            min="1"
            className="bg-background border-border text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Покупатель сможет указать, сколько {unitLabel} он хочет купить — не больше, чем есть в наличии.
          </p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
            Описание
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Подробное описание товара..."
            className="w-full h-24 px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-gold/50"
          />
        </div>

        {/* Hold warning */}
        {holdDays > 0 && (
          <div className="bg-purple-400/10 border border-purple-400/20 rounded-xl p-4 flex items-start gap-3">
            <Icon name="Clock" size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-400">
              <span className="font-bold">Холд {holdDays} дней: </span>
              Сразу после покупки этой категории средства будут удержаны на {holdDays} дней
              перед выплатой продавцу — независимо от подтверждения получения.
            </p>
          </div>
        )}

        {/* Commission info */}
        {price && parseFloat(price) > 0 && (
          <div className="bg-background border border-border rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Цена товара</span>
              <span>₽ {parseFloat(price).toLocaleString("ru-RU")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Комиссия платформы ({PLATFORM_COMMISSION}%)</span>
              <span className="text-red-400">
                - ₽{" "}
                {Math.round(parseFloat(price) * (PLATFORM_COMMISSION / 100)).toLocaleString("ru-RU")}
              </span>
            </div>
            {holdDays && (
              <div className="flex justify-between text-muted-foreground">
                <span>Холд после продажи</span>
                <span className="text-amber-400">{holdDays} дней</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
              <span>Вы получите</span>
              <span className="text-gold">
                ₽{" "}
                {Math.round(
                  parseFloat(price) * (1 - PLATFORM_COMMISSION / 100)
                ).toLocaleString("ru-RU")}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <Icon name="AlertCircle" size={12} />
            {error}
          </p>
        )}

        <Button
          className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
          onClick={handleSubmit}
        >
          <Icon name="Upload" size={15} className="mr-2" />
          Опубликовать объявление
        </Button>
      </div>
    </div>
  );
}
