// ─── ФОРМАТЫ ПРОМО-МАТЕРИАЛОВ ДЛЯ РАЗНЫХ ПЛОЩАДОК ──────────────────────────
// Каждая платформа имеет свой стандартный размер баннера/обложки. Один и тот
// же процедурный рендерер (promoAnimation.ts / promoStaticBanner.ts) рисует
// сцену, адаптируясь под ширину/высоту — как для анимированного GIF, так и
// для статичной картинки.

export type PromoFormat = {
  id: string;
  label: string;
  group: "stream" | "ads";
  icon: string;
  width: number;
  height: number;
  hint: string;
  supportsGif: boolean;
};

export const PROMO_FORMATS: PromoFormat[] = [
  {
    id: "twitch",
    label: "Twitch",
    group: "stream",
    icon: "Twitch",
    width: 1920,
    height: 1080,
    hint: "Офлайн-баннер / панель канала",
    supportsGif: true,
  },
  {
    id: "youtube",
    label: "YouTube",
    group: "stream",
    icon: "Youtube",
    width: 1280,
    height: 720,
    hint: "Превью видео / баннер канала",
    supportsGif: true,
  },
  {
    id: "tiktok",
    label: "TikTok",
    group: "stream",
    icon: "Music2",
    width: 1080,
    height: 1920,
    hint: "Вертикальная сторис/обложка",
    supportsGif: true,
  },
  {
    id: "vkplay",
    label: "VK Play",
    group: "stream",
    icon: "Play",
    width: 1920,
    height: 1080,
    hint: "Обложка стрима",
    supportsGif: true,
  },
  {
    id: "kick",
    label: "Kick",
    group: "stream",
    icon: "Radio",
    width: 1920,
    height: 1080,
    hint: "Офлайн-баннер канала",
    supportsGif: true,
  },
  {
    id: "yandex",
    label: "Яндекс Директ",
    group: "ads",
    icon: "Search",
    width: 1080,
    height: 607,
    hint: "Медийный баннер РСЯ",
    supportsGif: false,
  },
];

export function getPromoFormat(id: string): PromoFormat {
  return PROMO_FORMATS.find((f) => f.id === id) ?? PROMO_FORMATS[0];
}
