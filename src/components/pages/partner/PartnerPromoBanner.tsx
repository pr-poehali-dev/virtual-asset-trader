import { useEffect, useRef, useState } from "react";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { LOOP_MS, renderPromoFrame } from "@/components/pages/partner/promoAnimation";

// ─── АНИМИРОВАННЫЙ ПРОМО-РОЛИК ДЛЯ ПАРТНЁРОВ ────────────────────────────────
// Полностью процедурная canvas-анимация (см. promoAnimation.ts) — покупатель,
// продавец, летящие монеты, значок защиты и финальный щит с названием сайта
// рисуются кадр за кадром одним рендерером, а не накладываются CSS-иконками
// поверх статичной картинки. То же самое кодируется в реальный .gif файл,
// который партнёр может скачать и использовать в своей рекламе.

const PREVIEW_W = 960;
const PREVIEW_H = 540;
const GIF_W = 640;
const GIF_H = 360;
const GIF_FPS = 20;

export function PartnerPromoBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Живое превью прямо на странице — рисуется в реальном времени, не GIF
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = PREVIEW_W;
    canvas.height = PREVIEW_H;

    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) % LOOP_MS) / LOOP_MS;
      renderPromoFrame(ctx, PREVIEW_W, PREVIEW_H, t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    try {
      // Рендерим ролик покадрово в отдельный offscreen-canvas и кодируем в GIF
      const off = document.createElement("canvas");
      off.width = GIF_W;
      off.height = GIF_H;
      const octx = off.getContext("2d");
      if (!octx) return;

      const totalFrames = Math.round((LOOP_MS / 1000) * GIF_FPS);
      const delayMs = Math.round(1000 / GIF_FPS);
      const gif = GIFEncoder();

      for (let i = 0; i < totalFrames; i++) {
        const t = i / totalFrames;
        renderPromoFrame(octx, GIF_W, GIF_H, t);
        const { data } = octx.getImageData(0, 0, GIF_W, GIF_H);
        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, GIF_W, GIF_H, { palette, delay: delayMs, repeat: 0 });
        setProgress(Math.round(((i + 1) / totalFrames) * 100));
        // Не блокируем поток UI полностью — даём отрисоваться прогрессу
        if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      gif.finish();

      const blob = new Blob([gif.bytes().buffer as ArrayBuffer], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "gorant-shop-promo.gif";
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

  return (
    <div className="bg-surface border border-gold/20 rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
          <Icon name="Sparkles" size={14} className="text-gold" />
          Реклама для вашей аудитории
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="border-gold/30 text-gold hover:bg-gold/10 text-xs"
          onClick={handleDownload}
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
              Скачать GIF
            </>
          )}
        </Button>
      </div>

      {/* Живое canvas-превью ролика — все элементы анимированы процедурно */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <p className="px-5 py-3 text-[11px] text-muted-foreground border-t border-border">
        Скачайте зацикленный GIF-ролик и используйте его в своих трансляциях, соцсетях или роликах — он поможет зрителям узнать бренд и довериться сервису.
      </p>
    </div>
  );
}