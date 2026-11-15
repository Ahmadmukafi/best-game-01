// EMBER & ANVIL — state.js
// The GameState: everything that changes as the game is played, and the
// day/order/economy rules that move it. Rendering reads this; craft.js
// mutates the active order; shop.js mutates the upgrades.

import {
  DAYS, START_HEARTS, MAX_HEARTS, DAY_TIME, DAY_QUOTA,
  COMBO_STEP, COMBO_MAX, TIP_QUALITY, TIP_RATE,
  PERFECT_QUALITY, DAY_CLEAR_BONUS, WIN_BONUS,
} from './config.js';
import { makeOrder, makeCrownOrder } from './customers.js';

export function newGameState() {
  return {
    screen: 'title', // title | playing | shop | win | lose
    day: 1,
    dayTimeLeft: DAY_TIME[0],
    quota: DAY_QUOTA[0],
    servedToday: 0,
    gold: 0,
    hearts: START_HEARTS,
    combo: 0,
    bestCombo: 0,
    order: null,
    orderQueue: 0, // orders waiting behind the active one
    totalServed: 0,
    totalPerfect: 0,
    totalEarned: 0,
    upgrades: { hammer: 0, bellows: 0, tongs: 0, heart: 0 },
    // Transient feedback, drawn by render.js and decayed by main.js.
    floaters: [], // {x, y, text, color, life}
    particles: [], // {x, y, vx, vy, life, color, size}
    banner: null, // {text, sub, color, life}
    lastResult: null, // {coins, quality, tip, perfect} for the deliver flash
    stats: null, // filled on win/lose: {coins, served, perfects, bestCombo, days}
    time: 0, // total seconds since the game started (drives animations)
  };
}

export function comboMultiplier(state) {
  return Math.min(COMBO_MAX, 1 + COMBO_STEP * Math.max(0, state.combo - 1));
}

// Start a day: fresh timer, fresh quota, first order on the anvil.
export function startDay(state) {
  state.screen = 'playing';
  state.dayTimeLeft = DAY_TIME[state.day - 1];
  state.quota = DAY_QUOTA[state.day - 1];
  state.servedToday = 0;
  state.orderQueue = 0;
  nextOrder(state);
}

// Put the next order on the anvil. On day 5 the last order is the Crown.
export function nextOrder(state) {
  const isLastOfDay5 = state.day === DAYS && state.servedToday === state.quota - 1;
  state.order = isLastOfDay5 ? makeCrownOrder() : makeOrder(state.day, state.servedToday);
  state.order.stage = 'heat';
}

// What a finished order pays, without changing anything: the coin preview
// the deliver panel shows, and the payout deliverOrder() applies.
export function computePayout(state, order) {
  const q = Math.round(order.quality);
  const base = order.recipe.price;
  let coins = Math.round(base * (0.4 + (q / 100) * 0.9) * comboMultiplier(state));
  const tip = q >= TIP_QUALITY ? Math.round(base * TIP_RATE) : 0;
  coins += tip;
  return { coins, quality: q, tip, perfect: q >= PERFECT_QUALITY };
}

// Pay out a finished order: coins from quality, tip for a fine craft,
// combo growth for a good one, and the day counter moves on.
export function deliverOrder(state) {
  const order = state.order;
  const { coins, quality: q, tip, perfect } = computePayout(state, order);
  const good = q >= 60;
  if (good) {
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
  } else {
    state.combo = 0;
  }
  if (perfect) state.totalPerfect += 1;
  state.gold += coins;
  state.totalEarned += coins;
  state.totalServed += 1;
  state.servedToday += 1;
  state.lastResult = { coins, quality: q, tip, perfect, recipeName: order.recipe.name };
  state.order = null;
  return { coins, quality: q, tip, perfect };
}

// A customer whose patience ran out walks away angry.
export function loseCustomer(state) {
  state.hearts = Math.max(0, state.hearts - 1);
  state.combo = 0;
  state.order = null;
  state.banner = { text: 'Customer walked out!', sub: '-1 heart', color: '#e5484d', life: 2.2 };
}

// The day timer ran out with the quota unmet.
export function dayTimeout(state) {
  state.hearts = Math.max(0, state.hearts - 1);
  state.combo = 0;
  state.order = null;
}

// Close out a day: bonus gold for a cleared quota, then shop or the end.
export function endDay(state) {
  if (state.servedToday >= state.quota) {
    state.gold += DAY_CLEAR_BONUS;
    state.totalEarned += DAY_CLEAR_BONUS;
  }
  state.screen = 'shop';
}

// Finish the game: win only when the Crown itself was delivered.
export function finishGame(state, won) {
  const bonus = won ? WIN_BONUS : 0;
  state.gold += bonus;
  state.totalEarned += bonus;
  state.stats = {
    coins: state.totalEarned,
    served: state.totalServed,
    perfects: state.totalPerfect,
    bestCombo: state.bestCombo,
    days: won ? DAYS : state.day - 1,
    won,
  };
  state.screen = won ? 'win' : 'lose';
}

export function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, life: 1.4 });
}

export function burstSparks(state, x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 120 + Math.random() * 260;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 120,
      life: 0.5 + Math.random() * 0.4,
      color: color || '#ffb347',
      size: 2 + Math.random() * 3,
    });
  }
}

export function addHeart(state) {
  if (state.hearts < MAX_HEARTS) {
    state.hearts += 1;
    return true;
  }
  return false;
}
