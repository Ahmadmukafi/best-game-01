// EMBER & ANVIL — main.js
// The bootstrapper: owns the canvas, the frame loop and the screen state
// machine. The rules live in state.js, the stages in craft.js, the drawing
// in render.js — this file only wires them together and handles input.

import { CANVAS_W, CANVAS_H, DAY_TIME, DAY_QUOTA, DAYS } from './config.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import {
  newGameState, startDay, nextOrder, deliverOrder, loseCustomer,
  dayTimeout, endDay, finishGame, addFloater, burstSparks,
} from './state.js';
import { updateHeat, updateHammer, updateQuench, lockHeat, ANVIL } from './craft.js';
import { buyUpgrade, leaveShop } from './shop.js';
import { drawScene, BUTTONS } from './render.js';
import { RECIPES } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sound = new SoundEngine();
const input = new Input(canvas);
const state = newGameState();

let lastNow = performance.now();

function startGame() {
  Object.assign(state, newGameState());
  state.screen = 'playing';
  startDay(state);
  sound.unlock();
  sound.fanfare();
}

// ---- per-screen input ----
function onTitle() {
  if (input.wasPressed('Enter') || input.clickedIn(BUTTONS.start.x, BUTTONS.start.y, BUTTONS.start.w, BUTTONS.start.h)) {
    sound.unlock();
    sound.pop();
    startGame();
  }
}

function onPlaying(dt) {
  const order = state.order;
  // Day clock.
  state.dayTimeLeft -= dt;
  if (state.dayTimeLeft <= 30 && state.dayTimeLeft > 0 && Math.floor(state.dayTimeLeft) !== Math.floor(state.dayTimeLeft + dt)) {
    sound.tick();
  }
  if (state.dayTimeLeft <= 0) {
    dayTimeout(state);
    if (state.hearts <= 0 || state.day === DAYS) {
      // Day 5 has no shop after it: the Crown was the last chance.
      finishGame(state, false);
      sound.loseCue();
      return;
    }
    state.banner = { text: `Day ${state.day} over!`, sub: '-1 heart — the quota was not met', color: '#e5484d', life: 2.2 };
    endDay(state);
    return;
  }
  if (!order) return;
  // Patience drains while the order is on the anvil.
  order.patience -= dt;
  if (order.patience <= 0) {
    loseCustomer(state);
    sound.angry();
    if (state.hearts <= 0) { finishGame(state, false); sound.loseCue(); return; }
    nextOrder(state);
    return;
  }
  // Bellows squeeze animation reads this in render.js.
  state.inputHeld = input.held('Space') || input.mouseDown;
  if (order.stage === 'heat') {
    updateHeat(state, order, input, dt, sound);
    if (input.clickedIn(BUTTONS.lockHeat.x, BUTTONS.lockHeat.y, BUTTONS.lockHeat.w, BUTTONS.lockHeat.h)) {
      lockHeat(state, order, sound);
    }
  } else if (order.stage === 'hammer') {
    updateHammer(state, order, input, dt, sound);
  } else if (order.stage === 'quench') {
    updateQuench(state, order, input, dt, sound);
  } else if (order.stage === 'deliver') {
    order.deliverTimer -= dt;
    if (order.deliverTimer <= 0) {
      const r = deliverOrder(state);
      burstSparks(state, ANVIL.x + ANVIL.w / 2, ANVIL.y - 30, 18, '#ffd166');
      addFloater(state, ANVIL.x + ANVIL.w / 2, ANVIL.y - 90, `+${r.coins}g`, '#ffd166');
      sound.coin();
      if (state.servedToday >= state.quota) {
        if (order.recipeId === 'crown') {
          // The Crown was the last order of day 5: delivering it wins.
          finishGame(state, true);
          sound.winJingle();
        } else {
          state.banner = { text: `Day ${state.day} complete!`, sub: '+100g quota bonus', color: '#57cc7a', life: 2.2 };
          sound.fanfare();
          endDay(state);
        }
      } else {
        nextOrder(state);
      }
    }
  }
}

function onShop() {
  for (let i = 0; i < 4; i++) {
    const x = 90 + i * 290;
    const y = 230;
    if (input.wasPressed(`Digit${i + 1}`) || input.clickedIn(x, y, 260, 300)) {
      const ids = ['hammer', 'bellows', 'tongs', 'heart'];
      const res = buyUpgrade(state, ids[i], sound);
      if (res === 'bought') sound.coin();
    }
  }
  if (input.wasPressed('Enter') || input.clickedIn(BUTTONS.nextDay.x, BUTTONS.nextDay.y, BUTTONS.nextDay.w, BUTTONS.nextDay.h)) {
    sound.pop();
    leaveShop(state);
    startDay(state);
  }
}

function onEnd() {
  if (input.wasPressed('KeyR') || input.clickedIn(BUTTONS.restart.x, BUTTONS.restart.y, BUTTONS.restart.w, BUTTONS.restart.h)) {
    sound.pop();
    startGame();
  }
}

// ---- frame ----
function frame(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  state.time += dt;
  // Decay effects.
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 500 * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floaters) {
    f.y -= 40 * dt;
    f.life -= dt;
  }
  state.floaters = state.floaters.filter((f) => f.life > 0);
  if (state.banner) {
    state.banner.life -= dt;
    if (state.banner.life <= 0) state.banner = null;
  }
  if (input.wasPressed('KeyM')) sound.setMuted(!sound.muted);
  if (state.screen === 'title') onTitle();
  else if (state.screen === 'playing') onPlaying(dt);
  else if (state.screen === 'shop') onShop();
  else if (state.screen === 'win' || state.screen === 'lose') onEnd();
  sound.update(dt, state.screen === 'playing');
  drawScene(ctx, state, input);
  input.endFrame();
  requestAnimationFrame(frame);
}

// ---- screenshot hooks (?shot=title|play|shop|win) ----
// These put the real game into a fixed, readable state so the screenshots
// show the whole loop at a glance. They use the same code paths as play.
function applyShot(shot) {
  if (shot === 'title') {
    state.screen = 'title';
  } else if (shot === 'play') {
    Object.assign(state, newGameState());
    state.screen = 'playing';
    state.day = 2;
    state.dayTimeLeft = 118;
    state.quota = DAY_QUOTA[1];
    state.servedToday = 2;
    state.gold = 145;
    state.hearts = 3;
    state.combo = 3;
    state.bestCombo = 3;
    state.totalServed = 6;
    startDay(state);
    state.day = 2;
    state.dayTimeLeft = 118;
    state.servedToday = 2;
    state.gold = 145;
    state.combo = 3;
    state.order.recipeId = 'sword';
    state.order.recipe = RECIPES.sword;
    state.order.customer = 'Ser Aldric';
    state.order.line = 'The tournament opens at dawn. No excuses.';
    state.order.patience = 30;
    state.order.patienceMax = 42;
    state.order.quality = 62;
    state.order.stage = 'hammer';
    state.order.spotsLeft = 3;
    state.order.spotsHit = 2;
    state.order.spotX = ANVIL.x + 150;
    state.order.spotTimer = 1.1;
    state.order.hammerX = ANVIL.x + 140;
    state.order.heatTemp = 72;
    state.order.heatLocked = true;
    state.time = 12.4;
  } else if (shot === 'shop') {
    Object.assign(state, newGameState());
    state.screen = 'shop';
    state.day = 2;
    state.gold = 210;
    state.hearts = 3;
    state.upgrades.hammer = 1;
    state.upgrades.bellows = 1;
    state.time = 4.2;
  } else if (shot === 'win') {
    Object.assign(state, newGameState());
    state.screen = 'win';
    state.stats = { coins: 1240, served: 24, perfects: 6, bestCombo: 5, days: 5, won: true };
    state.gold = 1240;
    state.time = 7.7;
  }
  window.__shotReady = true;
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(shot);
} else {
  window.__shotReady = true;
}

// ---- debug API for the play-test driver (not used by the game itself) ----
window.__game = {
  state,
  start: startGame,
  screen: () => state.screen,
  order: () => (state.order ? { stage: state.order.stage, quality: Math.round(state.order.quality), patience: state.order.patience } : null),
  // Jump straight to the final masterwork, to test the win path end to end.
  jumpToCrown() {
    Object.assign(state, newGameState());
    state.screen = 'playing';
    state.day = DAYS;
    state.dayTimeLeft = DAY_TIME[DAYS - 1];
    state.quota = DAY_QUOTA[DAYS - 1];
    state.servedToday = DAY_QUOTA[DAYS - 1] - 1;
    state.gold = 900;
    state.hearts = 2;
    state.combo = 4;
    nextOrder(state);
  },
};

requestAnimationFrame(frame);
