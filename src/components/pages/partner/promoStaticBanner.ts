// ─── СТАТИЧНЫЙ ПРОМО-БАННЕР ──────────────────────────────────────────────────
// В отличие от promoAnimation.ts (зацикленный ролик про сценарий эскроу), этот
// рендерер рисует ОДИН аккуратный кадр-картинку: щит, название сайта, короткий
// слоган и бейджи преимуществ. Используется под разные пропорции — от
// горизонтальной обложки Twitch/YouTube/Kick/VK Play до вертикальной сторис
// TikTok и медийного баннера Яндекс Директ. Все размеры считаются от
// min(width, height), поэтому пропорции текста не "разъезжаются" на вытянутых
// холстах.

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9973.1) * 43758.5453;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: seededRandom(i * 1.1),
  y: seededRandom(i * 2.7 + 5),
  r: 0.6 + seededRandom(i * 3.3 + 1) * 1.6,
  a: 0.25 + seededRandom(i * 4.4 + 2) * 0.55,
}));

function drawShield(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.shadowColor = "rgba(245,197,66,0.85)";
  ctx.shadowBlur = 34;

  const w = 60, h = 70;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.bezierCurveTo(w / 2, -h / 2, w / 2, -h / 4, w / 2, 0);
  ctx.bezierCurveTo(w / 2, h / 3, w / 4, h / 2, 0, h / 2 + 6);
  ctx.bezierCurveTo(-w / 4, h / 2, -w / 2, h / 3, -w / 2, 0);
  ctx.bezierCurveTo(-w / 2, -h / 4, -w / 2, -h / 2, 0, -h / 2);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  grad.addColorStop(0, "#fbe08a");
  grad.addColorStop(1, "#d9a520");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff6da";
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#0b1020";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.lineTo(-3, 14);
  ctx.lineTo(16, -12);
  ctx.stroke();
  ctx.restore();
}

function drawBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, unit: number) {
  ctx.save();
  ctx.font = `600 ${Math.round(unit * 0.032)}px 'IBM Plex Sans', sans-serif`;
  const paddingX = unit * 0.028;
  const textW = ctx.measureText(text).width;
  const w = textW + paddingX * 2;
  const h = unit * 0.06;
  const r = h / 2;
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
  ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
  ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
  ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
  ctx.closePath();
  ctx.fillStyle = "rgba(245,197,66,0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(245,197,66,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fde68a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 1);
  ctx.restore();
  return w;
}

export type StaticBannerOptions = {
  /** Промокод/реф-код партнёра — если задан, печатается крупно как призыв к действию */
  code?: string;
  /** Короткий слоган под названием сайта */
  subtitle?: string;
};

export function renderStaticBanner(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  options: StaticBannerOptions = {},
) {
  const unit = Math.min(w, h);
  const isPortrait = h > w * 1.2;

  ctx.clearRect(0, 0, w, h);

  // Фон
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#0b1020");
  grad.addColorStop(0.55, "#0e1530");
  grad.addColorStop(1, "#141c38");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.38, 0, w * 0.5, h * 0.38, unit * 0.7);
  glow.addColorStop(0, "rgba(245,197,66,0.14)");
  glow.addColorStop(1, "rgba(245,197,66,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  for (const s of STARS) {
    ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r * (unit / 540), 0, Math.PI * 2);
    ctx.fill();
  }

  // Щит
  const shieldY = isPortrait ? h * 0.33 : h * 0.36;
  drawShield(ctx, w * 0.5, shieldY, unit / 220);

  // Название
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5c542";
  ctx.font = `bold ${Math.round(unit * 0.11)}px Montserrat, sans-serif`;
  ctx.fillText("Gorant Shop", w * 0.5, shieldY + unit * 0.24);

  // Слоган
  ctx.fillStyle = "#e5e7eb";
  ctx.font = `500 ${Math.round(unit * 0.04)}px 'IBM Plex Sans', sans-serif`;
  ctx.fillText(options.subtitle ?? "Безопасные сделки. Деньги под защитой эскроу.", w * 0.5, shieldY + unit * 0.34);

  // Бейджи преимуществ — центрированный ряд (переносится на пор. формате не нужен, помещается)
  const badges = ["Эскроу", "Холд до 8 дней", "Защита от обмана"];
  ctx.font = `600 ${Math.round(unit * 0.032)}px 'IBM Plex Sans', sans-serif`;
  const gap = unit * 0.02;
  const widths = badges.map((b) => ctx.measureText(b).width + unit * 0.056);
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (badges.length - 1);
  let x = w * 0.5 - totalW / 2;
  const badgeY = shieldY + unit * 0.44;
  badges.forEach((b, i) => {
    const bw = drawBadge(ctx, x + widths[i] / 2, badgeY, b, unit);
    x += bw + gap;
  });

  // Промокод/CTA — если передан код партнёра, показываем его крупно внизу
  if (options.code) {
    const codeY = isPortrait ? h * 0.82 : h * 0.86;
    ctx.font = `600 ${Math.round(unit * 0.03)}px 'IBM Plex Sans', sans-serif`;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Промокод при регистрации", w * 0.5, codeY - unit * 0.055);
    ctx.font = `bold ${Math.round(unit * 0.06)}px Montserrat, sans-serif`;
    ctx.fillStyle = "#fde68a";
    ctx.fillText(options.code, w * 0.5, codeY);
  }
}
