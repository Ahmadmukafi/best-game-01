// EMBER & ANVIL — render.js
// Every pixel the player sees. The forge scene, the HUD, the order ticket,
// the three stage gauges, the shop and the title/win/lose screens — all
// drawn on one canvas with one warm palette (see config.js).

import { CANVAS_W, CANVAS_H, PALETTE as P, RECIPES, DAY_TIME } from './config.js';
import { ANVIL, heatBandFor, quenchBandFor } from './craft.js';
import { shopItems } from './shop.js';

export const BUTTONS = {
  start: { x: 490, y: 560, w: 300, h: 64 },
  lockHeat: { x: 1010, y: 660, w: 180, h: 56 },
  nextDay: { x: 490, y: 690, w: 300, h: 60 },
  restart: { x: 490, y: 620, w: 300, h: 60 },
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align, weight) {
  ctx.fillStyle = color || P.cream;
  ctx.font = `${weight || 'bold'} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function panel(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill || 'rgba(20, 14, 10, 0.88)';
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#4a3823';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawButton(ctx, b, label, enabled, hover) {
  ctx.fillStyle = enabled ? (hover ? '#ff8c2e' : '#d96a12') : '#4a3a28';
  rr(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 1, 24, enabled ? '#fff3d6' : '#8a7a5e', 'center');
}

function drawHeart(ctx, x, y, filled, s) {
  ctx.fillStyle = filled ? '#e5484d' : '#3a2c22';
  ctx.strokeStyle = '#7a2a2e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.45, y - s, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.45, y - s, x + s, y - s * 0.4, x, y + s * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Cached gradients: creating them every frame is the slowest part of the
// software renderer, so the static ones are built once and reused.
let wallGradient = null;
let furnaceGlow = null;
let fireGradient = null;

function getWallGradient(ctx) {
  if (!wallGradient) {
    wallGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    wallGradient.addColorStop(0, P.stone);
    wallGradient.addColorStop(0.7, P.stoneDark);
    wallGradient.addColorStop(1, P.floor);
  }
  return wallGradient;
}

// ---- the forge room ----
function drawRoom(ctx, state) {
  const t = state.time;
  // Stone wall.
  ctx.fillStyle = getWallGradient(ctx);
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Brick lines.
  ctx.strokeStyle = P.wallLine;
  ctx.lineWidth = 2;
  for (let y = 90; y < 640; y += 56) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }
  for (let y = 90; y < 640; y += 56) {
    const off = (y / 56) % 2 ? 70 : 0;
    for (let x = off; x < CANVAS_W; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 56);
      ctx.stroke();
    }
  }
  // Floor.
  ctx.fillStyle = '#0d0a08';
  ctx.fillRect(0, 640, CANVAS_W, 160);
  ctx.strokeStyle = '#241a12';
  for (let x = 0; x < CANVAS_W; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 640);
    ctx.lineTo(x - 30, 800);
    ctx.stroke();
  }
  drawFurnace(ctx, t);
  drawBellows(ctx, state);
  drawBarrel(ctx, t);
  drawAnvil(ctx, state);
  drawOrderBoard(ctx, state);
}

function drawFurnace(ctx, t) {
  // Stone arch with a living fire inside. The glow gradient is cached and
  // the flicker rides on globalAlpha instead of rebuilding it each frame.
  const flick = 0.75 + 0.25 * Math.sin(t * 7) * Math.sin(t * 3.1);
  if (!furnaceGlow) {
    furnaceGlow = ctx.createRadialGradient(150, 330, 10, 150, 330, 190);
    furnaceGlow.addColorStop(0, 'rgba(255, 140, 30, 0.55)');
    furnaceGlow.addColorStop(0.5, 'rgba(255, 90, 10, 0.22)');
    furnaceGlow.addColorStop(1, 'rgba(255, 90, 10, 0)');
  }
  ctx.save();
  ctx.globalAlpha = flick;
  ctx.fillStyle = furnaceGlow;
  ctx.fillRect(0, 130, 330, 420);
  ctx.restore();
  ctx.fillStyle = P.stoneLight;
  rr(ctx, 60, 170, 180, 260, 90);
  ctx.fill();
  ctx.strokeStyle = '#0d0906';
  ctx.lineWidth = 4;
  ctx.stroke();
  if (!fireGradient) {
    fireGradient = ctx.createLinearGradient(0, 430, 0, 220);
    fireGradient.addColorStop(0, '#ff5a00');
    fireGradient.addColorStop(0.6, '#ff8c1a');
    fireGradient.addColorStop(1, '#ffd166');
  }
  ctx.fillStyle = fireGradient;
  ctx.beginPath();
  ctx.moveTo(95, 425);
  ctx.quadraticCurveTo(110, 300 + 14 * Math.sin(t * 5), 150, 235 + 10 * Math.sin(t * 6.3));
  ctx.quadraticCurveTo(190, 300 + 14 * Math.sin(t * 4.2), 205, 425);
  ctx.closePath();
  ctx.fill();
  text(ctx, 'THE FURNACE', 150, 470, 15, P.creamDim, 'center');
}

function drawBellows(ctx, state) {
  const pumping = state.screen === 'playing'
    && state.order && state.order.stage === 'heat'
    && (state.inputHeld || false);
  const squeeze = pumping ? 0.85 : 1;
  ctx.save();
  ctx.translate(150, 640);
  ctx.scale(1, squeeze);
  ctx.fillStyle = '#6b4a2a';
  rr(ctx, -70, -70, 140, 110, 14);
  ctx.fill();
  ctx.strokeStyle = '#3a2a16';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#8a5f36';
  ctx.fillRect(-70, -40, 140, 10);
  ctx.fillRect(-70, -10, 140, 10);
  ctx.restore();
  text(ctx, 'BELLOWS — hold SPACE', 150, 700, 14, P.creamDim, 'center');
}

function drawBarrel(ctx, t) {
  const steam = 0.5 + 0.5 * Math.sin(t * 2.2);
  ctx.fillStyle = '#2c3e4a';
  rr(ctx, 1050, 480, 120, 130, 10);
  ctx.fill();
  ctx.strokeStyle = '#16242e';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#1d7fa8';
  ctx.fillRect(1054, 486, 112, 18);
  ctx.fillStyle = `rgba(180, 220, 240, ${0.25 + 0.2 * steam})`;
  for (let i = 0; i < 3; i++) {
    const x = 1080 + i * 30 + 6 * Math.sin(t * 1.5 + i * 2);
    ctx.beginPath();
    ctx.arc(x, 460 - i * 8 - 6 * steam, 10 + i * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, 'QUENCH BARREL', 1110, 640, 14, P.creamDim, 'center');
}

function drawAnvil(ctx, state) {
  const a = ANVIL;
  ctx.fillStyle = '#101418';
  rr(ctx, a.x - 20, a.y + a.h - 6, a.w + 40, 22, 6);
  ctx.fill();
  const steel = ctx.createLinearGradient(0, a.y, 0, a.y + a.h);
  steel.addColorStop(0, '#aebfc9');
  steel.addColorStop(0.5, '#7d929e');
  steel.addColorStop(1, '#4a5a64');
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(a.x + a.w, a.y);
  ctx.lineTo(a.x + a.w - 30, a.y + 34);
  ctx.lineTo(a.x + 70, a.y + 34);
  ctx.lineTo(a.x + 70, a.y + a.h);
  ctx.lineTo(a.x + 30, a.y + a.h);
  ctx.lineTo(a.x + 30, a.y + 34);
  ctx.lineTo(a.x, a.y + 34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a343c';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (state.order) drawWorkpiece(ctx, state.order, state);
}

function drawWorkpiece(ctx, order, state) {
  const a = ANVIL;
  const cx = a.x + a.w / 2;
  const top = a.y - 26;
  const heat = order.heatTemp / 100;
  const glow = order.stage === 'heat' ? heat : (order.heatLocked ? 0.75 : 0.3);
  const col = glow > 0.66 ? '#ffe9a8' : glow > 0.33 ? '#ff9a3c' : '#7d929e';
  // Hot glow: small translucent discs behind the piece (cheap) instead of
  // a shadowBlur, which is the slowest call in a software renderer.
  if (glow > 0.05) {
    ctx.save();
    ctx.globalAlpha = 0.22 * glow;
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.arc(cx, top + 16, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.32 * glow;
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(cx, top + 16, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = col;
  ctx.strokeStyle = '#2a343c';
  ctx.lineWidth = 2;
  const w = 150;
  const h = 34;
  const x0 = cx - w / 2;
  const y0 = top;
  ctx.beginPath();
  if (order.recipeId === 'horseshoe') {
    ctx.arc(cx, y0 + 8, 42, Math.PI * 0.15, Math.PI * 0.85);
    ctx.arc(cx, y0 + 8, 26, Math.PI * 0.85, Math.PI * 0.15, true);
    ctx.closePath();
  } else if (order.recipeId === 'dagger') {
    ctx.moveTo(cx - 60, y0 + h / 2);
    ctx.lineTo(cx + 30, y0 + 4);
    ctx.lineTo(cx + 75, y0 + h / 2);
    ctx.lineTo(cx + 30, y0 + h - 4);
    ctx.closePath();
  } else if (order.recipeId === 'sword') {
    ctx.moveTo(cx - 78, y0 + h / 2);
    ctx.lineTo(cx + 45, y0 + 2);
    ctx.lineTo(cx + 80, y0 + h / 2);
    ctx.lineTo(cx + 45, y0 + h - 2);
    ctx.closePath();
  } else if (order.recipeId === 'shield') {
    ctx.moveTo(cx, y0 - 6);
    ctx.quadraticCurveTo(cx + 55, y0 + 2, cx + 48, y0 + 30);
    ctx.quadraticCurveTo(cx + 20, y0 + 48, cx, y0 + 52);
    ctx.quadraticCurveTo(cx - 20, y0 + 48, cx - 48, y0 + 30);
    ctx.quadraticCurveTo(cx - 55, y0 + 2, cx, y0 - 6);
    ctx.closePath();
  } else if (order.recipeId === 'armor') {
    rr(ctx, x0, y0 - 6, w, 52, 16);
  } else {
    // Crown of Embers: three points, fit for a queen.
    ctx.moveTo(cx - 70, y0 + 34);
    ctx.lineTo(cx - 70, y0 + 6);
    ctx.lineTo(cx - 35, y0 + 26);
    ctx.lineTo(cx, y0 - 14);
    ctx.lineTo(cx + 35, y0 + 26);
    ctx.lineTo(cx + 70, y0 + 6);
    ctx.lineTo(cx + 70, y0 + 34);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Hammer spots: glowing rings on the workpiece.
  if (order.stage === 'hammer') {
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 8);
    ctx.strokeStyle = `rgba(255, 209, 102, ${pulse})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(order.spotX, a.y - 8, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 209, 102, ${0.25 * pulse})`;
    ctx.fill();
    // The sweeping hammer.
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.arc(order.hammerX, a.y - 52, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(order.hammerX - 3, a.y - 52, 6, 34);
    text(ctx, '▼', order.hammerX, a.y - 72, 16, P.gold, 'center');
  }
}

function drawOrderBoard(ctx, state) {
  panel(ctx, 900, 84, 340, 150, 'rgba(28, 20, 13, 0.92)');
  text(ctx, '— ORDER BOARD —', 1070, 108, 16, P.gold, 'center');
  const order = state.order;
  if (!order) {
    text(ctx, 'No order on the anvil.', 1070, 160, 18, P.creamDim, 'center');
    return;
  }
  text(ctx, order.customer, 920, 140, 20, P.cream, 'left');
  text(ctx, `“${order.line}”`, 920, 166, 14, P.creamDim, 'left');
  text(ctx, `${order.recipe.name}  ·  ${order.recipe.price}g`, 920, 196, 18, P.gold, 'left');
  // Patience bar.
  const frac = Math.max(0, order.patience / order.patienceMax);
  ctx.fillStyle = '#3a2c1e';
  rr(ctx, 920, 210, 300, 14, 7);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? P.green : frac > 0.25 ? P.gold : P.red;
  rr(ctx, 920, 210, 300 * frac, 14, 7);
  ctx.fill();
  text(ctx, frac > 0.25 ? 'patience' : 'LOSING PATIENCE!', 920, 232, 12, frac > 0.25 ? P.creamDim : P.red, 'left');
}

// ---- HUD ----
function drawHUD(ctx, state) {
  ctx.fillStyle = 'rgba(16, 11, 8, 0.92)';
  ctx.fillRect(0, 0, CANVAS_W, 64);
  ctx.strokeStyle = '#4a3823';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(CANVAS_W, 64);
  ctx.stroke();
  text(ctx, `DAY ${state.day} / 5`, 24, 33, 26, P.gold, 'left');
  text(ctx, `🪙 ${state.gold}g`, 190, 33, 26, P.cream, 'left');
  for (let i = 0; i < 5; i++) drawHeart(ctx, 350 + i * 30, 32, i < state.hearts, 11);
  if (state.combo >= 2) {
    text(ctx, `🔥 COMBO ×${state.combo}`, 540, 33, 24, P.ember, 'left');
  }
  // Quota pips.
  for (let i = 0; i < state.quota; i++) {
    ctx.fillStyle = i < state.servedToday ? P.green : '#3a2c1e';
    ctx.beginPath();
    ctx.arc(830 + i * 26, 32, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b5636';
    ctx.stroke();
  }
  text(ctx, `orders ${state.servedToday}/${state.quota}`, 830, 56, 12, P.creamDim, 'left');
  // Day timer.
  const dayLen = DAY_TIME[state.day - 1];
  const tw = 220;
  ctx.fillStyle = '#3a2c1e';
  rr(ctx, 1030, 24, tw, 16, 8);
  ctx.fill();
  ctx.fillStyle = state.dayTimeLeft < 30 ? P.red : P.quench;
  rr(ctx, 1030, 24, tw * Math.min(1, state.dayTimeLeft / dayLen), 16, 8);
  ctx.fill();
  text(ctx, `${Math.ceil(state.dayTimeLeft)}s left in the day`, 1030, 52, 12, P.creamDim, 'left');
}

// ---- stage panels ----
function drawStagePanel(ctx, state, input) {
  const order = state.order;
  if (!order) return;
  panel(ctx, 340, 620, 600, 150, 'rgba(20, 14, 10, 0.9)');
  if (order.stage === 'heat') drawHeatPanel(ctx, state, order, input);
  else if (order.stage === 'hammer') drawHammerPanel(ctx, state, order);
  else if (order.stage === 'quench') drawQuenchPanel(ctx, state, order);
  else if (order.stage === 'deliver') drawDeliverPanel(ctx, state, order);
}

function drawHeatPanel(ctx, state, order, input) {
  text(ctx, '1 · HEAT — hold SPACE (or mouse) to pump the bellows', 360, 644, 17, P.cream, 'left');
  const [lo, hi] = heatBandFor(order, state.upgrades);
  // Vertical thermometer.
  const x = 380, y0 = 660, h = 96;
  ctx.fillStyle = '#241a12';
  rr(ctx, x, y0, 34, h, 8);
  ctx.fill();
  const bandY = y0 + h - (hi / 100) * h;
  const bandH = ((hi - lo) / 100) * h;
  ctx.fillStyle = P.green;
  ctx.fillRect(x, bandY, 34, bandH);
  ctx.fillStyle = '#ff5a00';
  const tempH = (order.heatTemp / 100) * h;
  ctx.fillRect(x, y0 + h - tempH, 34, tempH);
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 2;
  rr(ctx, x, y0, 34, h, 8);
  ctx.stroke();
  text(ctx, `${Math.round(order.heatTemp)}°`, x + 48, y0 + h / 2, 22, P.cream, 'left');
  text(ctx, `Aim for the green band (${Math.round(lo)}–${Math.round(hi)}°)`, 460, 700, 16, P.creamDim, 'left');
  text(ctx, 'then press ENTER to lock the heat.', 460, 724, 16, P.creamDim, 'left');
  const b = BUTTONS.lockHeat;
  const hover = input.mouseX >= b.x && input.mouseX <= b.x + b.w
    && input.mouseY >= b.y && input.mouseY <= b.y + b.h;
  drawButton(ctx, b, 'LOCK HEAT ⏎', order.heatTemp > 0, hover);
}

function drawHammerPanel(ctx, state, order) {
  text(ctx, `2 · HAMMER — strike (SPACE or click) when the hammer is over the glowing spot`, 360, 644, 17, P.cream, 'left');
  text(ctx, `Spots left: ${order.spotsLeft}   ·   Hits: ${order.spotsHit}   ·   Quality so far: ${Math.round(order.quality)}`, 360, 690, 20, P.gold, 'left');
  text(ctx, 'A hit rings true. A miss dulls the edge.', 360, 726, 16, P.creamDim, 'left');
  const frac = 1 - order.spotTimer / 1.6;
  ctx.fillStyle = '#3a2c1e';
  rr(ctx, 360, 744, 560, 10, 5);
  ctx.fill();
  ctx.fillStyle = P.ember;
  rr(ctx, 360, 744, 560 * Math.min(1, frac), 10, 5);
  ctx.fill();
}

function drawQuenchPanel(ctx, state, order) {
  text(ctx, '3 · QUENCH — stop the needle (SPACE or click) inside the blue band', 360, 644, 17, P.cream, 'left');
  const [lo, hi] = quenchBandFor(state.upgrades);
  const x = 380, y = 690, w = 480, h = 26;
  ctx.fillStyle = '#241a12';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = P.quenchDeep;
  ctx.fillRect(x + (lo / 100) * w, y, ((hi - lo) / 100) * w, h);
  ctx.fillStyle = P.gold;
  ctx.fillRect(x + 0.46 * w, y, 0.08 * w, h);
  const nx = x + (order.quenchPos / 100) * w;
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath();
  ctx.moveTo(nx, y - 12);
  ctx.lineTo(nx - 8, y - 26);
  ctx.lineTo(nx + 8, y - 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(nx - 2, y, 4, h);
  text(ctx, 'Center gold = perfect temper.', 360, 748, 16, P.creamDim, 'left');
}

function drawDeliverPanel(ctx, state, order) {
  const r = order.coinsPreview;
  text(ctx, '✓ DELIVERED', 640, 680, 30, P.green, 'center');
  if (r) {
    text(ctx, `${order.recipe.name}  ·  quality ${r.quality}  ·  +${r.coins}g${r.tip ? ` (tip +${r.tip}g)` : ''}${r.perfect ? '  ·  FLAWLESS!' : ''}`, 640, 724, 20, P.gold, 'center');
  } else {
    text(ctx, `${order.recipe.name}  ·  quality ${Math.round(order.quality)}`, 640, 724, 20, P.gold, 'center');
  }
}

// ---- particles, floaters, banner ----
function drawEffects(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    text(ctx, f.text, f.x, f.y, 22, f.color, 'center');
  }
  ctx.globalAlpha = 1;
  if (state.banner) {
    ctx.globalAlpha = Math.min(1, state.banner.life);
    text(ctx, state.banner.text, CANVAS_W / 2, 300, 44, state.banner.color, 'center');
    if (state.banner.sub) text(ctx, state.banner.sub, CANVAS_W / 2, 340, 22, P.cream, 'center');
    ctx.globalAlpha = 1;
  }
}

// ---- screens ----
function drawTitle(ctx, state, input) {
  ctx.fillStyle = 'rgba(10, 7, 5, 0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const flick = 0.8 + 0.2 * Math.sin(state.time * 3);
  // Layered text for the title glow: two offset draws instead of a
  // shadowBlur (the slowest call in a software renderer).
  ctx.save();
  ctx.globalAlpha = 0.5 * flick;
  text(ctx, 'EMBER & ANVIL', CANVAS_W / 2 + 3, 203, 84, '#ff7a1a', 'center');
  ctx.restore();
  text(ctx, 'EMBER & ANVIL', CANVAS_W / 2, 200, 84, P.gold, 'center');
  text(ctx, 'A forge-master game — heat it, hammer it, quench it, sell it.', CANVAS_W / 2, 268, 26, P.cream, 'center');
  panel(ctx, 340, 310, 600, 210, 'rgba(20, 14, 10, 0.92)');
  text(ctx, 'HOW TO PLAY', 640, 340, 20, P.gold, 'center');
  text(ctx, '①  HEAT  — hold SPACE to pump the bellows into the green band, then ENTER.', 360, 378, 18, P.cream, 'left');
  text(ctx, '②  HAMMER  — strike with SPACE or click when the hammer crosses the glowing spot.', 360, 410, 18, P.cream, 'left');
  text(ctx, '③  QUENCH  — stop the needle in the blue band. Center gold is a perfect temper.', 360, 442, 18, P.cream, 'left');
  text(ctx, 'Serve every order before its patience runs out. Five days — then the Crown.', 360, 486, 18, P.creamDim, 'left');
  const b = BUTTONS.start;
  const hover = input.mouseX >= b.x && input.mouseX <= b.x + b.w
    && input.mouseY >= b.y && input.mouseY <= b.y + b.h;
  drawButton(ctx, b, 'LIGHT THE FORGE ⏎', true, hover);
  text(ctx, 'Mouse + keyboard  ·  M mutes  ·  R restarts after the end', CANVAS_W / 2, 664, 15, P.creamDim, 'center');
}

function drawShop(ctx, state, input) {
  ctx.fillStyle = 'rgba(10, 7, 5, 0.78)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  text(ctx, `DAY ${state.day} COMPLETE`, CANVAS_W / 2, 110, 44, P.gold, 'center');
  text(ctx, `Quota met — bonus +100g  ·  Your purse: ${state.gold}g  ·  Hearts: ${state.hearts}`, CANVAS_W / 2, 156, 20, P.cream, 'center');
  text(ctx, 'Spend wisely. Tomorrow the iron is harder and the customers less patient.', CANVAS_W / 2, 186, 17, P.creamDim, 'center');
  const items = shopItems(state);
  items.forEach((it, i) => {
    const x = 90 + i * 290;
    const y = 230;
    const hover = input.mouseX >= x && input.mouseX <= x + 260
      && input.mouseY >= y && input.mouseY <= y + 300;
    panel(ctx, x, y, 260, 300, hover ? 'rgba(52, 36, 20, 0.95)' : 'rgba(28, 20, 13, 0.95)');
    text(ctx, it.icon, x + 130, y + 60, 44, P.cream, 'center');
    text(ctx, it.name, x + 130, y + 116, 22, P.gold, 'center');
    text(ctx, it.desc, x + 130, y + 152, 15, P.creamDim, 'center');
    for (let l = 0; l < it.max; l++) {
      ctx.fillStyle = l < it.level ? P.gold : '#3a2c1e';
      ctx.beginPath();
      ctx.arc(x + 100 + l * 30, y + 190, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (it.maxed) {
      text(ctx, 'MAXED', x + 130, y + 240, 20, P.green, 'center');
    } else {
      text(ctx, `${it.cost}g  —  press ${i + 1} or click`, x + 130, y + 240, 18, it.afford ? P.cream : P.red, 'center');
    }
  });
  const b = BUTTONS.nextDay;
  const hover = input.mouseX >= b.x && input.mouseX <= b.x + b.w
    && input.mouseY >= b.y && input.mouseY <= b.y + b.h;
  drawButton(ctx, b, `START DAY ${state.day + 1} ⏎`, true, hover);
}

function drawStats(ctx, state) {
  const s = state.stats;
  if (!s) return;
  const rows = [
    ['Gold earned', `${s.coins}g`],
    ['Orders served', `${s.served}`],
    ['Flawless crafts', `${s.perfects}`],
    ['Best combo', `×${s.bestCombo}`],
    ['Days completed', `${s.days} / 5`],
  ];
  panel(ctx, 440, 300, 400, 260, 'rgba(20, 14, 10, 0.92)');
  rows.forEach((r, i) => {
    text(ctx, r[0], 470, 336 + i * 44, 20, P.creamDim, 'left');
    text(ctx, r[1], 810, 336 + i * 44, 20, P.gold, 'right');
  });
}

function drawEnd(ctx, state, input, won) {
  ctx.fillStyle = won ? 'rgba(20, 16, 4, 0.8)' : 'rgba(16, 6, 6, 0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  if (won) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    text(ctx, 'THE CROWN IS FORGED!', CANVAS_W / 2 + 3, 193, 64, '#ff7a1a', 'center');
    ctx.restore();
    text(ctx, 'THE CROWN IS FORGED!', CANVAS_W / 2, 190, 64, P.gold, 'center');
    text(ctx, 'Five days of smoke and spark — the Queen wears your work.', CANVAS_W / 2, 250, 24, P.cream, 'center');
  } else {
    text(ctx, 'THE FORGE GOES COLD', CANVAS_W / 2, 190, 64, P.red, 'center');
    text(ctx, 'Too many customers walked out. The village finds another smith.', CANVAS_W / 2, 250, 24, P.cream, 'center');
  }
  drawStats(ctx, state);
  const b = BUTTONS.restart;
  const hover = input.mouseX >= b.x && input.mouseX <= b.x + b.w
    && input.mouseY >= b.y && input.mouseY <= b.y + b.h;
  drawButton(ctx, b, 'FORGE AGAIN  (R)', true, hover);
}

// ---- main entry ----
export function drawScene(ctx, state, input) {
  drawRoom(ctx, state);
  if (state.screen === 'playing') {
    drawHUD(ctx, state);
    drawStagePanel(ctx, state, input);
  }
  drawEffects(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state, input);
  else if (state.screen === 'shop') drawShop(ctx, state, input);
  else if (state.screen === 'win') drawEnd(ctx, state, input, true);
  else if (state.screen === 'lose') drawEnd(ctx, state, input, false);
}

// Keep the bellows honest: render.js needs to know if the player is
// holding the pump. main.js sets state.inputHeld every frame.
export function describeGame() {
  return 'Ember & Anvil: heat, hammer and quench orders for a mountain forge.';
}
