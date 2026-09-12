import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import shieldBg from "@/assets/partner-promo-shield.jpg";

// ─── АНИМИРОВАННЫЙ ПРОМО-БАННЕР ДЛЯ ПАРТНЁРОВ ──────────────────────────────────
// Короткая зацикленная анимация: покупатель → сделка → деньги продавцу → щит с
// названием сайта в конце. Виден только реальным партнёрам сайта. Можно скачать
// финальный кадр (со щитом) как картинку для использования в своей рекламе.

export function PartnerPromoBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image load failed"));
        img.src = shieldBg;
      });

      canvas.width = 1200;
      canvas.height = 675;
      ctx.drawImage(img, 0, (canvas.width - img.width * (canvas.width / img.width)) / 2, canvas.width, canvas.width);
      // Затемнение снизу для читаемости текста
      const gradient = ctx.createLinearGradient(0, canvas.height - 220, 0, canvas.height);
      gradient.addColorStop(0, "rgba(10,14,26,0)");
      gradient.addColorStop(1, "rgba(10,14,26,0.92)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height - 220, canvas.width, 220);

      ctx.textAlign = "center";
      ctx.fillStyle = "#f5c542";
      ctx.font = "bold 56px Montserrat, sans-serif";
      ctx.fillText("Gorant Shop", canvas.width / 2, canvas.height - 110);

      ctx.fillStyle = "#e8e8e8";
      ctx.font = "500 26px 'IBM Plex Sans', sans-serif";
      ctx.fillText("Безопасные сделки с виртуальными ценностями", canvas.width / 2, canvas.height - 65);

      const link = document.createElement("a");
      link.download = "gorant-shop-promo.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      /* ignore */
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-surface border border-gold/20 rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
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
          {downloading ? <Icon name="Loader" size={13} className="animate-spin mr-1.5" /> : <Icon name="Download" size={13} className="mr-1.5" />}
          Скачать картинку
        </Button>
      </div>

      {/* Анимированная витрина */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16/9", backgroundImage: `url(${shieldBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-background/10" />

        {/* Сцена: покупатель -> монеты -> продавец */}
        <div className="absolute inset-0 flex items-center justify-center gap-10 sm:gap-20">
          <div className="flex flex-col items-center gap-2" style={{ animation: "promoIconPulse 2.4s ease-in-out infinite" }}>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-400/20 border border-blue-400/40 flex items-center justify-center">
              <Icon name="User" size={22} className="text-blue-300" />
            </div>
            <span className="text-[10px] text-blue-200 font-semibold">Покупатель</span>
          </div>

          <div className="relative w-20 sm:w-32 h-8 flex items-center">
            {[0, 1, 2].map((i) => (
              <Icon
                key={i}
                name="Coins"
                size={16}
                className="text-gold absolute left-0"
                style={{
                  animation: `promoCoinFly 2.4s ease-in-out ${i * 0.5}s infinite`,
                  ["--promo-fly-x" as string]: "90px",
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="flex flex-col items-center gap-2" style={{ animation: "promoIconPulse 2.4s ease-in-out 0.3s infinite" }}>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center">
              <Icon name="Store" size={22} className="text-emerald-300" />
            </div>
            <span className="text-[10px] text-emerald-200 font-semibold">Продавец</span>
          </div>
        </div>

        {/* Галочка "сделка подтверждена" */}
        <div
          className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1.5 bg-emerald-400/15 border border-emerald-400/40 rounded-full px-2.5 py-1"
          style={{ animation: "promoCheckPop 2.4s ease-in-out infinite" }}
        >
          <Icon name="ShieldCheck" size={12} className="text-emerald-300" />
          <span className="text-[10px] text-emerald-200 font-semibold">Сделка защищена</span>
        </div>

        {/* Финальный щит с названием */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-4 sm:pb-6">
          <Icon name="Shield" size={26} className="text-gold mb-1.5" style={{ animation: "promoShieldGlow 2.4s ease-in-out infinite" }} />
          <span className="font-display font-bold text-base sm:text-lg text-foreground">
            Gorant<span className="text-gold"> Shop</span>
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Безопасные сделки с виртуальными ценностями</span>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <p className="px-5 py-3 text-[11px] text-muted-foreground border-t border-border">
        Используйте это изображение в своих трансляциях, соцсетях или роликах — оно поможет зрителям узнать бренд и довериться сервису.
      </p>
    </div>
  );
}
