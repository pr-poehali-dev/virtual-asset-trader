// ─── ПРОЦЕДУРНАЯ АНИМАЦИЯ ПРОМО-РОЛИКА ПАРТНЁРА ─────────────────────────────
// Сценарий: покупатель платит → деньги летят в щит Gorant Shop (эскроу) →
// щит замораживает средства (иконка замка, ледяной блик) → быстрый таймер
// отсчитывает 8 дней защиты сделки → замок открывается → деньги улетают
// продавцу → финальный кадр с щитом и названием сайта. Все элементы рисуются
// на canvas кадр за кадром одним рендерером — ничего не наложено статичными
// картинками. Тот же рендер кодируется в реальный анимированный GIF.

export const LOOP_MS = 7000;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function smoothstep(x: number): number {
  const c = clamp01(x);
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

  const glowX = w * (0.5 + 0.24 * Math.sin(2 * Math.PI * t));
  const glowY = h * (0.4 + 0.08 * Math.cos(2 * Math.PI * t));
  const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, w * 0.45);
  glow.addColorStop(0, "rgba(245,197,66,0.10)");
  glow.addColorStop(1, "rgba(245,197,66,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  for (const s of STARS) {
    const alpha = 0.25 + 0.6 * Math.abs(Math.sin(2 * Math.PI * (t * s.speed + s.phase)));
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h * 0.85, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
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
  ctx.beginPath();
  ctx.moveTo(cx - scale * 0.5, cy - scale * 0.05);
  ctx.lineTo(cx, cy - scale * 0.55);
  ctx.lineTo(cx + scale * 0.5, cy - scale * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - scale * 0.38, cy - scale * 0.05, scale * 0.76, scale * 0.55);
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

// Щит — одновременно "иконка эскроу" в центре сцены и финальный логотип
function drawShield(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, glowAlpha: number, glowColor = "rgba(245,197,66,0.9)") {
  if (scale <= 0.01) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (glowAlpha > 0.01) {
    ctx.shadowColor = glowColor;
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
  ctx.restore();
}

// Галочка внутри щита (используется когда щит без замка — на входе/выходе)
function drawShieldCheck(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
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

// Замок поверх щита: closed=1 — полностью заперт, closed=0 — дужка откинута (открыт)
function drawLock(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, closed: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Дужка — поворачивается наружу при разморозке
  const shackleOpen = (1 - closed) * 28;
  ctx.save();
  ctx.translate(6, -6);
  ctx.rotate((-shackleOpen * Math.PI) / 180);
  ctx.translate(-6, 6);
  ctx.strokeStyle = "#0b1020";
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, -6, 9, Math.PI, 0, false);
  ctx.stroke();
  ctx.restore();

  // Корпус замка
  ctx.fillStyle = "#0b1020";
  ctx.beginPath();
  const bw = 22, bh = 17;
  const r = 3;
  ctx.moveTo(-bw / 2 + r, 0);
  ctx.arcTo(bw / 2, 0, bw / 2, bh, r);
  ctx.arcTo(bw / 2, bh, -bw / 2, bh, r);
  ctx.arcTo(-bw / 2, bh, -bw / 2, 0, r);
  ctx.arcTo(-bw / 2, 0, bw / 2, 0, r);
  ctx.closePath();
  ctx.fill();

  // Замочная скважина
  ctx.fillStyle = closed > 0.5 ? "#f5c542" : "#94a3b8";
  ctx.beginPath();
  ctx.arc(0, 6, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-1, 6, 2, 5);

  ctx.restore();
}

// Ледяной иней вокруг щита во время заморозки средств
function drawFrost(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, alpha: number) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#bfe8ff";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x1 = Math.cos(angle) * 42, y1 = Math.sin(angle) * 48;
    const x2 = Math.cos(angle) * 54, y2 = Math.sin(angle) * 60;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPill(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, alpha: number, scale: number, w: number, h: number, tone: "green" | "amber" | "blue" = "green") {
  const palette = {
    green: { fill: "rgba(16,185,129,0.18)", stroke: "rgba(52,211,153,0.55)", text: "#a7f3d0", accent: "#34d399" },
    amber: { fill: "rgba(245,158,11,0.18)", stroke: "rgba(251,191,36,0.55)", text: "#fde68a", accent: "#fbbf24" },
    blue: { fill: "rgba(59,130,246,0.18)", stroke: "rgba(96,165,250,0.55)", text: "#bfdbfe", accent: "#60a5fa" },
  }[tone];

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
  ctx.fillStyle = palette.fill;
  ctx.fill();
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = palette.text;
  ctx.font = "600 12px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 6, 1);
  ctx.restore();
}

// Быстрый круговой таймер обратного отсчёта (8 дней защиты сделки)
function drawCountdownRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, progress: number, alpha: number) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Фоновый трек
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(148,163,184,0.18)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Прогресс — несколько быстрых оборотов создают ощущение "перемотки времени"
  const laps = 3;
  const angle = progress * Math.PI * 2 * laps;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (angle % (Math.PI * 2)));
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();

  const daysLeft = Math.max(0, Math.round(8 * (1 - progress)));
  ctx.fillStyle = "#fde68a";
  ctx.font = `bold ${Math.round(r * 0.62)}px Montserrat, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(daysLeft), cx, cy - r * 0.08);
  ctx.font = `500 ${Math.round(r * 0.22)}px 'IBM Plex Sans', sans-serif`;
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("дней холда", cx, cy + r * 0.42);

  ctx.restore();
}

export function renderPromoFrame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, t);

  const buyerX = w * 0.15, sellerX = w * 0.85, midY = h * 0.40;
  const shieldX = w * 0.5;
  const badgeR = h * 0.095;
  const shieldScale = h / 230;

  // ── Фазы сценария ──────────────────────────────────────────────────────
  const buyerGlow = trapezoid(t, 0.0, 0.04, 0.10, 0.06);
  const coinsToShield = { start: 0.06, dur: 0.16 };
  const freezeStart = 0.24;
  const shieldCatchGlow = trapezoid(t, coinsToShield.start + coinsToShield.dur - 0.02, 0.04, 0.08, 0.05);
  const timerStart = 0.30, timerDur = 0.32;
  const timerProgress = clamp01((t - timerStart) / timerDur);
  const timerAlpha = trapezoid(t, timerStart - 0.02, 0.03, timerDur - 0.02, 0.05);
  const holdEnd = timerStart + timerDur;
  const unlockGlow = trapezoid(t, holdEnd, 0.04, 0.06, 0.05);
  const coinsToSeller = { start: holdEnd + 0.02, dur: 0.16 };
  const sellerGlow = trapezoid(t, coinsToSeller.start + coinsToSeller.dur - 0.03, 0.05, 0.10, 0.06);
  const finalStart = coinsToSeller.start + coinsToSeller.dur + 0.03;

  // Щит на протяжении ролика показывает РОВНО один индикатор состояния:
  // галочка (обычное состояние) → короткий переход → замок (заморозка,
  // freezeStart..holdEnd) → короткий переход обратно → галочка. Крестфейд
  // короткий (0.03) и середины фаз не пересекаются, поэтому замок и галочка
  // никогда не отрисовываются одновременно с заметной альфой.
  const fade = 0.03;
  const lockAlpha = trapezoid(t, freezeStart - fade, fade, (holdEnd - freezeStart), fade);
  const checkAlpha = 1 - lockAlpha;
  const lockClosed = 1; // замок в этой фазе всегда полностью заперт (дужка не анимируется)

  // ── Покупатель / Продавец ──────────────────────────────────────────────
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

  // ── Щит-эскроу в центре (виден всю сцену до финального крупного плана) ──
  const centerShieldScale = shieldScale * 0.72 * (0.85 + 0.15 * clamp01(t / 0.05));
  drawShield(ctx, shieldX, midY, centerShieldScale, Math.max(shieldCatchGlow, unlockGlow) * 0.9, lockAlpha > 0.5 ? "rgba(96,165,250,0.7)" : "rgba(245,197,66,0.9)");

  // Ровно один из двух индикаторов виден одновременно (крестфейд, не наложение)
  if (checkAlpha > 0.01) {
    ctx.globalAlpha = checkAlpha;
    drawShieldCheck(ctx, shieldX, midY, centerShieldScale);
    ctx.globalAlpha = 1;
  }
  if (lockAlpha > 0.01) {
    drawFrost(ctx, shieldX, midY, centerShieldScale, lockAlpha * 0.8);
    ctx.globalAlpha = lockAlpha;
    drawLock(ctx, shieldX, midY + 2, centerShieldScale * 0.9, lockClosed);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "#fde68a";
  ctx.font = "700 12px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Эскроу Gorant Shop", shieldX, midY + badgeR + 20);

  // ── Монеты: покупатель → щит ────────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const start = coinsToShield.start + i * 0.045;
    const dur = coinsToShield.dur;
    const p = (t - start) / dur;
    if (p < 0 || p > 1) continue;
    const eased = smoothstep(p);
    const x = lerp(buyerX + badgeR * 0.8, shieldX - badgeR * 0.55, eased);
    const arc = Math.sin(p * Math.PI) * -h * 0.08;
    const y = midY + arc;
    const fadeIn = Math.min(1, p / 0.15);
    const fadeOut = Math.min(1, (1 - p) / 0.15);
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);
    drawCoin(ctx, x, y, h * 0.028, p * 10);
    ctx.globalAlpha = 1;
  }

  // ── Монеты: щит → продавец ───────────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const start = coinsToSeller.start + i * 0.045;
    const dur = coinsToSeller.dur;
    const p = (t - start) / dur;
    if (p < 0 || p > 1) continue;
    const eased = smoothstep(p);
    const x = lerp(shieldX + badgeR * 0.55, sellerX - badgeR * 0.8, eased);
    const arc = Math.sin(p * Math.PI) * -h * 0.08;
    const y = midY + arc;
    const fadeIn = Math.min(1, p / 0.15);
    const fadeOut = Math.min(1, (1 - p) / 0.15);
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);
    drawCoin(ctx, x, y, h * 0.028, p * 10);
    ctx.globalAlpha = 1;
  }

  // ── Таймер обратного отсчёта (8 дней холда пролетают быстро) — сверху ──
  const ringY = h * 0.15;
  drawCountdownRing(ctx, shieldX, ringY, h * 0.10, timerProgress, timerAlpha);

  // ── Пилюли-статусы — под таймером, чтобы не пересекаться с ним ─────────
  const pillY = h * 0.15 + h * 0.14;
  const freezeLabelA = trapezoid(t, freezeStart, 0.04, 0.10, 0.05) * (1 - timerAlpha);
  if (freezeLabelA > 0.01) {
    drawPill(ctx, shieldX, pillY, "Средства заморожены", freezeLabelA, 1, w * 0.30, h * 0.085, "blue");
  }
  const unlockLabelA = trapezoid(t, timerStart + timerDur, 0.03, 0.09, 0.05);
  if (unlockLabelA > 0.01) {
    drawPill(ctx, shieldX, pillY, "Проверено. Средства переведены", unlockLabelA, 1, w * 0.38, h * 0.085, "green");
  }
  const receivedA = trapezoid(t, coinsToSeller.start + coinsToSeller.dur, 0.04, 0.08, 0.05);
  if (receivedA > 0.01) {
    drawPill(ctx, sellerX, midY - badgeR - 22, "Оплата получена", receivedA, 1, w * 0.24, h * 0.075, "green");
  }

  // ── Финальный кадр: щит крупным планом + название сайта ────────────────
  const finalA = trapezoid(t, finalStart, 0.06, 0.14, 0.08);
  if (finalA > 0.01) {
    const riseP = clamp01((t - finalStart) / 0.06);
    const scale = 0.5 + 0.5 * easeOutBack(riseP);
    ctx.save();
    ctx.globalAlpha = finalA;
    // Полностью перекрываем сцену позади для читаемости финального лого
    ctx.fillStyle = `rgba(10,14,26,${0.96 * finalA})`;
    ctx.fillRect(0, 0, w, h);
    drawShield(ctx, w * 0.5, h * 0.4, scale * (h / 200), finalA, "rgba(245,197,66,0.95)");
    drawShieldCheck(ctx, w * 0.5, h * 0.4, scale * (h / 200));

    ctx.textAlign = "center";
    ctx.fillStyle = "#f5c542";
    ctx.font = `bold ${Math.round(h * 0.09)}px Montserrat, sans-serif`;
    ctx.fillText("Gorant Shop", w * 0.5, h * 0.74);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = `500 ${Math.round(h * 0.036)}px 'IBM Plex Sans', sans-serif`;
    ctx.fillText("Заморозка средств. Гарантия безопасной сделки.", w * 0.5, h * 0.82);
    ctx.fillStyle = "#94a3b8";
    ctx.font = `500 ${Math.round(h * 0.03)}px 'IBM Plex Sans', sans-serif`;
    ctx.fillText("Эскроу · Холд до 8 дней · Защита от мошенничества", w * 0.5, h * 0.88);
    ctx.restore();
  }
}