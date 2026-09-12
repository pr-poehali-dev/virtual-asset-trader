// ─── ПРОЦЕДУРНАЯ АНИМАЦИЯ ПРОМО-РОЛИКА ПАРТНЁРА ─────────────────────────────
// Всё рисуется на canvas кадр за кадром (t от 0 до 1 — прогресс зацикленного
// ролика). Никаких статичных фоновых картинок с наложенными CSS-иконками —
// каждый элемент (звёзды, монеты, значки, щит, текст) — часть одного и того
// же кадра, который также кодируется в реальный анимированный GIF-файл.

export const LOOP_MS = 4200;

function smoothstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

function trapezoid(t: number, start: number, rise: number, hold: number, fall: number): number {
  const end = start + rise + hold + fall;
  if (t < start || t > end) return 0;
  if (t < start + rise) return smoothstep((t - start) / rise);
  if (t < start + rise + hold) return 1;
  return 1 - smoothstep((t - (start + rise + hold)) / fall);
}

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

// Детерминированный псевдослучайный генератор (звёзды не "прыгают" между рендерами)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9973.1) * 43758.5453;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: seededRandom(i * 1.1),
  y: seededRandom(i * 2.7 + 5),
  r: 0.6 + seededRandom(i * 3.3 + 1) * 1.6,
  phase: seededRandom(i * 4.4 + 2) * Math.PI * 2,
  speed: 0.6 + seededRandom(i * 5.5 + 3) * 1.2,
}));

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#0b1020");
  grad.addColorStop(0.55, "#0e1530");
  grad.addColorStop(1, "#141c38");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Плавающее золотое свечение — позиция задаётся синусом от t, поэтому цикл идеально замкнут
  const glowX = w * (0.5 + 0.28 * Math.sin(2 * Math.PI * t));
  const glowY = h * (0.42 + 0.10 * Math.cos(2 * Math.PI * t));
  const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, w * 0.45);
  glow.addColorStop(0, "rgba(245,197,66,0.10)");
  glow.addColorStop(1, "rgba(245,197,66,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Звёзды — мерцают, но не двигаются (позиции фиксированы seed'ом)
  for (const s of STARS) {
    const alpha = 0.25 + 0.6 * Math.abs(Math.sin(2 * Math.PI * (t * s.speed + s.phase)));
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h * 0.85, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Вращающееся декоративное кольцо (полный оборот за цикл — бесшовно)
  const ringAngle = 2 * Math.PI * t;
  ctx.save();
  ctx.translate(w * 0.5, h * 0.46);
  ctx.rotate(ringAngle);
  ctx.strokeStyle = "rgba(245,197,66,0.10)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, h * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);
}

function drawBadgeCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colorA: string, colorB: string, glow: number) {
  if (glow > 0.01) {
    ctx.save();
    ctx.shadowColor = colorB;
    ctx.shadowBlur = 24 * glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = colorA;
    ctx.fill();
    ctx.restore();
  }
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  grad.addColorStop(0, colorB);
  grad.addColorStop(1, colorA);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.stroke();
}

function drawPersonGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(cx, cy - scale * 0.32, scale * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + scale * 0.55, scale * 0.5, Math.PI, 0);
  ctx.fill();
}

function drawStoreGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  // Крыша
  ctx.beginPath();
  ctx.moveTo(cx - scale * 0.5, cy - scale * 0.05);
  ctx.lineTo(cx, cy - scale * 0.55);
  ctx.lineTo(cx + scale * 0.5, cy - scale * 0.05);
  ctx.closePath();
  ctx.fill();
  // Корпус
  ctx.fillRect(cx - scale * 0.38, cy - scale * 0.05, scale * 0.76, scale * 0.55);
  // Дверь (вырез)
  ctx.fillStyle = "rgba(16,20,40,0.9)";
  ctx.fillRect(cx - scale * 0.12, cy + scale * 0.12, scale * 0.24, scale * 0.38);
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, flip: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.15, Math.abs(Math.cos(flip))), 1);
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, "#fff3c4");
  grad.addColorStop(0.5, "#f5c542");
  grad.addColorStop(1, "#c9982a");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#8a6a1a";
  ctx.stroke();
  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, glowAlpha: number) {
  if (scale <= 0.01) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (glowAlpha > 0.01) {
    ctx.shadowColor = "rgba(245,197,66,0.9)";
    ctx.shadowBlur = 30 * glowAlpha;
  }

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

function drawPill(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, alpha: number, scale: number, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
  ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
  ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
  ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
  ctx.closePath();
  ctx.fillStyle = "rgba(16,185,129,0.18)";
  ctx.fill();
  ctx.strokeStyle = "rgba(52,211,153,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 14, 0);
  ctx.lineTo(-w / 2 + 19, 5);
  ctx.lineTo(-w / 2 + 27, -6);
  ctx.stroke();

  ctx.fillStyle = "#a7f3d0";
  ctx.font = "600 12px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, -w / 2 + 34, 1);
  ctx.restore();
}

export function renderPromoFrame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, t);

  const buyerX = w * 0.24, sellerX = w * 0.76, midY = h * 0.46;
  const badgeR = h * 0.10;

  // Луч связи между сторонами — пульсирует, не "едет" (бесшовный цикл)
  ctx.save();
  ctx.strokeStyle = "rgba(245,197,66,0.22)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = Math.sin(2 * Math.PI * t) * 14;
  ctx.beginPath();
  ctx.moveTo(buyerX + badgeR, midY);
  ctx.lineTo(sellerX - badgeR, midY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const buyerGlow = trapezoid(t, 0.0, 0.05, 0.12, 0.08);
  const sellerGlow = trapezoid(t, 0.30, 0.05, 0.15, 0.08);

  drawBadgeCircle(ctx, buyerX, midY, badgeR, "#1d3a6e", "#3b82f6", buyerGlow);
  drawPersonGlyph(ctx, buyerX, midY, badgeR * 0.7);
  drawBadgeCircle(ctx, sellerX, midY, badgeR, "#0f4a3a", "#34d399", sellerGlow);
  drawStoreGlyph(ctx, sellerX, midY, badgeR * 0.7);

  ctx.fillStyle = "#bfdbfe";
  ctx.font = "600 12px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Покупатель", buyerX, midY + badgeR + 20);
  ctx.fillStyle = "#a7f3d0";
  ctx.fillText("Продавец", sellerX, midY + badgeR + 20);

  // Монеты, летящие покупатель -> продавец (3 штуки со сдвигом по фазе)
  for (let i = 0; i < 3; i++) {
    const start = 0.10 + i * 0.085;
    const dur = 0.24;
    const p = (t - start) / dur;
    if (p < 0 || p > 1) continue;
    const eased = smoothstep(p);
    const x = lerp(buyerX + badgeR * 0.8, sellerX - badgeR * 0.8, eased);
    const arc = Math.sin(p * Math.PI) * -h * 0.09;
    const y = midY + arc;
    const fadeIn = Math.min(1, p / 0.12);
    const fadeOut = Math.min(1, (1 - p) / 0.12);
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);
    drawCoin(ctx, x, y, h * 0.032, p * 10);
    ctx.globalAlpha = 1;
  }

  // Значок "Сделка защищена"
  const checkA = trapezoid(t, 0.42, 0.04, 0.18, 0.08);
  if (checkA > 0.01) {
    const riseP = Math.min(1, (t - 0.42) / 0.04);
    const scale = 0.7 + 0.3 * easeOutBack(riseP);
    drawPill(ctx, w * 0.5, h * 0.16, "Сделка защищена", checkA, Math.max(0.01, scale), w * 0.34, h * 0.09);
  }

  // Финал: щит + название сайта
  const shieldA = trapezoid(t, 0.60, 0.08, 0.22, 0.10);
  if (shieldA > 0.01) {
    const riseP = Math.min(1, (t - 0.60) / 0.08);
    const scale = 0.5 + 0.5 * easeOutBack(riseP);
    ctx.save();
    ctx.globalAlpha = shieldA;
    drawShield(ctx, w * 0.5, h * 0.44, scale * (h / 220), shieldA);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = shieldA;
    ctx.textAlign = "center";
    ctx.fillStyle = "#f5c542";
    ctx.font = `bold ${Math.round(h * 0.085)}px Montserrat, sans-serif`;
    ctx.fillText("Gorant Shop", w * 0.5, h * 0.78);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = `500 ${Math.round(h * 0.038)}px 'IBM Plex Sans', sans-serif`;
    ctx.fillText("Безопасные сделки с виртуальными ценностями", w * 0.5, h * 0.86);
    ctx.restore();
  }
}
