import { useEffect, useRef, useState } from "react";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { LOOP_MS, renderPromoFrame } from "@/components/pages/partner/promoAnimation";
import { renderStaticBanner } from "@/components/pages/partner/promoStaticBanner";
import { PROMO_FORMATS, getPromoFormat } from "@/components/pages/partner/promoFormats";

// ─── АНИМИРОВАННЫЙ ПРОМО-РОЛИК + СТАТИЧНЫЕ БАННЕРЫ ДЛЯ ПАРТНЁРОВ ────────────
// Один и тот же процедурный рендерер сцены (promoAnimation.ts — зацикленный
// ролик про то, как работает эскроу; promoStaticBanner.ts — одиночный кадр со
// щитом и слоганом) адаптируется под 6 форматов: Twitch/YouTube/TikTok/
// VK Play/Kick (анимированный GIF нужного размера) и Яндекс Директ (только
// статичная PNG-картинка — медийные площадки GIF не принимают). Все элементы
// рисуются на canvas кадр за кадром — ничего не наложено готовыми картинками.

const PREVIEW_MAX = 420; // ограничение превью на странице, чтобы вертикальные форматы не вылезали
const GIF_FPS = 16;
const GIF_MAX_SIDE = 480; // кадры GIF ужимаем для разумного размера файла

export function PartnerPromoBanner({ promoCode }: { promoCode?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const [formatId, setFormatId] = useState(PROMO_FORMATS[0].id);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const format = getPromoFormat(formatId);
  const isAnimated = format.supportsGif;

  // Превью на странице — вписываем формат в квадрат PREVIEW_MAX, сохраняя пропорции
  const previewScale = PREVIEW_MAX / Math.max(format.width, format.height);
  const previewW = Math.round(format.width * previewScale);
  const previewH = Math.round(format.height * previewScale);

  // Живое canvas-превью — рисуется в реальном времени, не выгружается как файл
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = previewW;
    canvas.height = previewH;

    if (!isAnimated) {
      renderStaticBanner(ctx, previewW, previewH, { code: promoCode ?? undefined });
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) % LOOP_MS) / LOOP_MS;
      renderPromoFrame(ctx, previewW, previewH, t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [previewW, previewH, isAnimated, promoCode]);

  const handleDownloadGif = async () => {
    setDownloading(true);
    setProgress(0);
    try {
      const scale = Math.min(1, GIF_MAX_SIDE / Math.max(format.width, format.height));
      const gifW = Math.round(format.width * scale);
      const gifH = Math.round(format.height * scale);

      const off = document.createElement("canvas");
      off.width = gifW;
      off.height = gifH;
      const octx = off.getContext("2d");
      if (!octx) return;

      const totalFrames = Math.round((LOOP_MS / 1000) * GIF_FPS);
      const delayMs = Math.round(1000 / GIF_FPS);
      const gif = GIFEncoder();

      for (let i = 0; i < totalFrames; i++) {
        const t = i / totalFrames;
        renderPromoFrame(octx, gifW, gifH, t);
        const { data } = octx.getImageData(0, 0, gifW, gifH);
        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, gifW, gifH, { palette, delay: delayMs, repeat: 0 });
        setProgress(Math.round(((i + 1) / totalFrames) * 100));
        if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      gif.finish();

      const blob = new Blob([gif.bytes().buffer as ArrayBuffer], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `gorant-shop-${format.id}.gif`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      /* ignore */
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  const handleDownloadPng = () => {
    const off = document.createElement("canvas");
    off.width = format.width;
    off.height = format.height;
    const octx = off.getContext("2d");
    if (!octx) return;
    renderStaticBanner(octx, format.width, format.height, { code: promoCode ?? undefined });
    off.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `gorant-shop-${format.id}.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/png");
  };

  return (
    <div className="bg-surface border border-gold/20 rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
          <Icon name="Sparkles" size={14} className="text-gold" />
          Реклама для вашей аудитории
        </h3>

        {/* Выбор формата под конкретную площадку */}
        <div className="flex flex-wrap gap-1.5">
          {PROMO_FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormatId(f.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                formatId === f.id
                  ? "bg-gold text-background border-gold"
                  : "bg-background border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
              }`}
            >
              <Icon name={f.icon} size={12} />
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {format.hint} · {format.width}×{format.height}px {format.supportsGif ? "· доступен анимированный GIF" : "· статичное изображение"}
        </p>
      </div>

      {/* Живое canvas-превью — процедурная анимация или статичный кадр в зависимости от формата */}
      <div className="flex items-center justify-center bg-background/40 py-5">
        <div
          className="relative overflow-hidden rounded-lg border border-border shadow-lg"
          style={{ width: previewW, height: previewH }}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      </div>

      <div className="px-5 pb-4 flex justify-center">
        {isAnimated ? (
          <Button
            size="sm"
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold/10 text-xs"
            onClick={handleDownloadGif}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Icon name="Loader" size={13} className="animate-spin mr-1.5" />
                Рендерю GIF… {progress}%
              </>
            ) : (
              <>
                <Icon name="Download" size={13} className="mr-1.5" />
                Скачать GIF для {format.label}
              </>
            )}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold/10 text-xs"
            onClick={handleDownloadPng}
          >
            <Icon name="Download" size={13} className="mr-1.5" />
            Скачать PNG для {format.label}
          </Button>
        )}
      </div>

      <p className="px-5 py-3 text-[11px] text-muted-foreground border-t border-border">
        {isAnimated
          ? "Ролик показывает, как работает эскроу: деньги покупателя замораживаются на щите Gorant Shop и хранятся в безопасности до 8 дней, а затем автоматически переводятся продавцу. Скачайте зацикленный GIF нужного размера и используйте его в оформлении канала или трансляции."
          : "Статичный баннер с названием сайта и вашим промокодом — готов для загрузки в рекламный кабинет Яндекс Директ."}
      </p>
    </div>
  );
}
