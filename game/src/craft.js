// EMBER & ANVIL — craft.js
// The three crafting stages. Each stage owns one piece of the quality
// meter (heat 40, hammer 40, quench 20) and moves the order forward when
// it is done. All numbers come from config.js and the player's upgrades.

import {
  STAGE_POINTS, HEAT_PUMP_RATE, HEAT_COOL_RATE, HAMMER_MISS_PENALTY,
  HAMMER_SWEEP_BASE, HAMMER_SWEEP_PER_DAY, HAMMER_SPOT_RADIUS,
  HAMMER_SPOT_LIFETIME, QUENCH_BAND, QUENCH_PERFECT_HALF,
} from './config.js';
import { burstSparks, addFloater, computePayout } from './state.js';

export const ANVIL = { x: 470, y: 470, w: 340, h: 90 }; // where the work sits

function heatBand(order, upgrades) {
  const [lo, hi] = order.recipe.heat;
  const widen = upgrades.bellows * 3;
  return [lo - widen, hi + widen];
}

function quenchBand(upgrades) {
  const widen = upgrades.tongs * 8;
  return [QUENCH_BAND[0] - widen, QUENCH_BAND[1] + widen];
}

// ---- HEAT: hold the action to pump the bellows, lock with ENTER or the
// LOCK button. Temperature climbs while held and cools when released. ----
export function updateHeat(state, order, input, dt, sound) {
  const pumping = input.held('Space') || input.mouseDown;
  if (pumping) {
    const rate = HEAT_PUMP_RATE * (1 + 0.25 * state.upgrades.bellows);
    order.heatTemp = Math.min(100, order.heatTemp + rate * dt);
    if (Math.random() < dt * 2) sound.whoosh();
  } else {
    order.heatTemp = Math.max(0, order.heatTemp - HEAT_COOL_RATE * dt);
  }
  const lockPressed = input.wasPressed('Enter');
  if (lockPressed) lockHeat(state, order, sound);
}

// Score the locked temperature against the band and move to hammering.
export function lockHeat(state, order, sound) {
  if (order.stage !== 'heat') return; // ENTER and the LOCK button can land together
  const [lo, hi] = heatBand(order, state.upgrades);
  const center = (lo + hi) / 2;
  const half = (hi - lo) / 2;
  const t = order.heatTemp;
  let points;
  if (t >= lo && t <= hi) {
    const off = Math.abs(t - center) / half; // 0 at center, 1 at the edge
    points = STAGE_POINTS.heat * (1 - 0.3 * off);
  } else {
    const dist = t < lo ? lo - t : t - hi;
    points = Math.max(2, STAGE_POINTS.heat * 0.55 - dist * 1.2);
  }
  order.quality += points;
  order.heatLocked = true;
  order.stage = 'hammer';
  order.spotsLeft = order.recipe.spots;
  order.spotsHit = 0;
  order.hammerX = ANVIL.x + 20;
  order.hammerDir = 1;
  spawnSpot(order);
  if (points >= STAGE_POINTS.heat * 0.95) {
    addFloater(state, ANVIL.x + ANVIL.w / 2, ANVIL.y - 70, 'PERFECT HEAT!', '#ffd166');
    sound.fanfare();
  } else if (points >= STAGE_POINTS.heat * 0.7) {
    sound.clang(true);
  } else {
    addFloater(state, ANVIL.x + ANVIL.w / 2, ANVIL.y - 70, 'Weak heat…', '#cbb894');
    sound.thud();
  }
}

function spawnSpot(order) {
  order.spotX = ANVIL.x + 30 + Math.random() * (ANVIL.w - 60);
  order.spotTimer = HAMMER_SPOT_LIFETIME;
}

// ---- HAMMER: a hammer sweeps across the anvil; strike (SPACE or click)
// when it is over the glowing weak spot. ----
export function updateHammer(state, order, input, dt, sound) {
  const speed = HAMMER_SWEEP_BASE + HAMMER_SWEEP_PER_DAY * (state.day - 1);
  order.hammerX += order.hammerDir * speed * dt;
  if (order.hammerX > ANVIL.x + ANVIL.w - 10) { order.hammerX = ANVIL.x + ANVIL.w - 10; order.hammerDir = -1; }
  if (order.hammerX < ANVIL.x + 10) { order.hammerX = ANVIL.x + 10; order.hammerDir = 1; }
  order.spotTimer -= dt;
  if (order.spotTimer <= 0) {
    // The spot cooled: a miss, and a fresh spot appears.
    order.quality = Math.max(0, order.quality - HAMMER_MISS_PENALTY / 2);
    order.spotsLeft -= 1;
    sound.thud();
    if (order.spotsLeft <= 0) { finishHammer(state, order, sound); return; }
    spawnSpot(order);
  }
  if (input.actionPressed()) strikeHammer(state, order, sound);
}

function strikeHammer(state, order, sound) {
  const perHit = STAGE_POINTS.hammer / order.recipe.spots + state.upgrades.hammer * 5;
  const dx = Math.abs(order.hammerX - order.spotX);
  if (dx <= HAMMER_SPOT_RADIUS + 8) {
    order.quality += perHit;
    order.spotsHit += 1;
    burstSparks(state, order.spotX, ANVIL.y - 10, 14, '#ffb347');
    addFloater(state, order.spotX, ANVIL.y - 60, 'CLANG!', '#ffd166');
    sound.clang(true);
  } else {
    order.quality = Math.max(0, order.quality - HAMMER_MISS_PENALTY);
    addFloater(state, order.hammerX, ANVIL.y - 60, 'Miss…', '#cbb894');
    sound.thud();
  }
  order.spotsLeft -= 1;
  if (order.spotsLeft <= 0) { finishHammer(state, order, sound); return; }
  spawnSpot(order);
}

function finishHammer(state, order, sound) {
  order.stage = 'quench';
  order.quenchPos = 0;
  order.quenchDir = 1;
  order.quenchStopped = false;
  void sound;
}

// ---- QUENCH: a needle sweeps the gauge; stop it (SPACE or click) inside
// the blue band, dead center for a perfect temper. ----
export function updateQuench(state, order, input, dt, sound) {
  const speed = order.recipe.quenchSpeed;
  order.quenchPos += order.quenchDir * speed * dt;
  if (order.quenchPos >= 100) { order.quenchPos = 100; order.quenchDir = -1; }
  if (order.quenchPos <= 0) { order.quenchPos = 0; order.quenchDir = 1; }
  if (input.actionPressed()) stopQuench(state, order, sound);
}

function stopQuench(state, order, sound) {
  const [lo, hi] = quenchBand(state.upgrades);
  const pos = order.quenchPos;
  let points;
  if (Math.abs(pos - 50) <= QUENCH_PERFECT_HALF) {
    points = STAGE_POINTS.quench;
    addFloater(state, ANVIL.x + ANVIL.w / 2, ANVIL.y - 70, 'PERFECT TEMPER!', '#4cc9f0');
  } else if (pos >= lo && pos <= hi) {
    const off = Math.abs(pos - 50) / ((hi - lo) / 2);
    points = STAGE_POINTS.quench * (1 - 0.4 * off);
  } else {
    points = 4;
    addFloater(state, ANVIL.x + ANVIL.w / 2, ANVIL.y - 70, 'Warped quench…', '#cbb894');
  }
  order.quality = Math.min(100, order.quality + points);
  order.quenchStopped = true;
  order.stage = 'deliver';
  order.deliverTimer = 1.1;
  order.coinsPreview = computePayout(state, order);
  sound.hiss();
  burstSparks(state, ANVIL.x + ANVIL.w / 2, ANVIL.y - 20, 20, '#4cc9f0');
}

// Heat band for the thermometer drawing.
export function heatBandFor(order, upgrades) { return heatBand(order, upgrades); }
export function quenchBandFor(upgrades) { return quenchBand(upgrades); }
