// EMBER & ANVIL — shop.js
// The between-day shop: four upgrades, each with three levels and a price
// that climbs. Buying is the only way gold leaves the till, and the only
// way the late days stay fair.

import { UPGRADES } from './config.js';
import { addHeart } from './state.js';

export function shopItems(state) {
  return UPGRADES.map((u) => {
    const level = state.upgrades[u.id];
    const maxed = level >= u.max;
    const cost = maxed ? null : u.costs[Math.min(level, u.costs.length - 1)];
    const afford = cost !== null && state.gold >= cost;
    return { ...u, level, maxed, cost, afford };
  });
}

// Try to buy an upgrade by id. Returns 'bought', 'poor', 'maxed' or 'bad'.
export function buyUpgrade(state, id, sound) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return 'bad';
  if (id === 'heart' && state.hearts >= 5) return 'maxed';
  const level = state.upgrades[id];
  if (level >= def.max) return 'maxed';
  const cost = def.costs[Math.min(level, def.costs.length - 1)];
  if (state.gold < cost) {
    if (sound) sound.thud();
    return 'poor';
  }
  state.gold -= cost;
  state.upgrades[id] = level + 1;
  if (id === 'heart') addHeart(state);
  if (sound) sound.coin();
  return 'bought';
}

// Leave the shop and open the next day. After day 5 there is no shop:
// the Crown ends the game instead, so this is only called for days 1-4.
export function leaveShop(state) {
  state.day += 1;
  state.screen = 'playing';
  return state.day;
}
