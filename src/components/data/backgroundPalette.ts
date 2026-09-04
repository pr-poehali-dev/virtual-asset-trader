// Общая палитра тематических фонов для карточек (категории каталога, игры и т.п.)
// Каждый пункт — цвет свечения + сгенерированная атмосферная картинка.
export const GLOW_PALETTE = [
  { color: "hsl(43 74% 56%)", image: "/backgrounds/bg-gold.webp" },
  { color: "hsl(270 70% 55%)", image: "/backgrounds/bg-purple.webp" },
  { color: "hsl(200 80% 55%)", image: "/backgrounds/bg-blue.webp" },
  { color: "hsl(330 75% 55%)", image: "/backgrounds/bg-pink.webp" },
  { color: "hsl(160 60% 45%)", image: "/backgrounds/bg-green.webp" },
  { color: "hsl(24 90% 55%)", image: "/backgrounds/bg-orange.webp" },
] as const;

// Фиксированное соответствие для базовых категорий — чтобы цвет не "прыгал" между рендерами
const CATEGORY_GLOW: Record<string, (typeof GLOW_PALETTE)[number]> = {
  "CS2 скины": GLOW_PALETTE[1],
  "PUBG Mobile akk": GLOW_PALETTE[5],
  "Игровые аккаунты": GLOW_PALETTE[2],
  "Подарочные карты": GLOW_PALETTE[3],
  "Программное обеспечение": GLOW_PALETTE[4],
  "Прочее": GLOW_PALETTE[0],
};

export function getCategoryGlow(category: string): (typeof GLOW_PALETTE)[number] {
  return CATEGORY_GLOW[category] ?? hashGlow(category);
}

// Для сущностей без фиксированной категории (например, конкретная игра по id) —
// стабильный выбор из палитры на основе хеша строки.
export function hashGlow(id: string): (typeof GLOW_PALETTE)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GLOW_PALETTE[hash % GLOW_PALETTE.length];
}
