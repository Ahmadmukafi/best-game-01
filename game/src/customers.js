// EMBER & ANVIL — customers.js
// Who walks into the forge and what they ask for. Orders are drawn from
// the day's recipe pool; the Crown of Embers is never drawn at random —
// it is the final order of day 5, handed out by state.js.

import { RECIPES, DAY_RECIPES } from './config.js';

const CUSTOMERS = [
  { name: 'Mira the Ranger', line: 'The road is long and my boots are thin.' },
  { name: 'Ser Aldric', line: 'The tournament opens at dawn. No excuses.' },
  { name: 'Old Fen', line: 'My mule threw a shoe three villages back.' },
  { name: 'Pip the Trader', line: 'Good iron sells itself. Make it good.' },
  { name: 'Lady Ysolde', line: 'I pay in gold and I pay on time.' },
  { name: 'Grunk the Smith', line: 'Even smiths need a smith sometimes.' },
  { name: 'Sister Anselm', line: 'The abbey bell cracked. The abbey waits.' },
  { name: 'Captain Rook', line: 'My crew sails at tide-turn. Be quick.' },
  { name: 'Tilda the Miller', line: 'Flour waits for no one, friend.' },
  { name: 'Young Bram', line: 'Father says a real blade chooses its smith.' },
  { name: 'The Wandering Queen', line: 'Make it worthy of the ember it is named for.' },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// One order: a customer, a recipe, and a patience clock in seconds.
// Patience shrinks a little as the days wear on, so late days bite.
export function makeOrder(day, servedToday) {
  const pool = DAY_RECIPES[Math.min(day - 1, DAY_RECIPES.length - 1)];
  const recipeId = pick(pool);
  const recipe = RECIPES[recipeId];
  const customer = pick(CUSTOMERS);
  const patience = Math.max(24, recipe.patience - (day - 1) * 2 - servedToday * 0.5);
  return {
    id: Math.random().toString(36).slice(2, 8),
    recipeId,
    recipe,
    customer: customer.name,
    line: customer.line,
    patience,
    patienceMax: patience,
    quality: 0,
    stage: 'heat',
    // Stage-local state, reset by craft.js as the order moves on.
    heatTemp: 0,
    heatLocked: false,
    spotsLeft: 0,
    spotsHit: 0,
    hammerX: 0,
    hammerDir: 1,
    spotX: 0,
    spotTimer: 0,
    quenchPos: 0,
    quenchDir: 1,
    quenchStopped: false,
    deliverTimer: 0,
    coinsEarned: 0,
  };
}

// The masterwork that ends the game: the Crown of Embers, ordered by the
// Wandering Queen herself on the last order of day 5.
export function makeCrownOrder() {
  const order = makeOrder(5, 0);
  order.recipeId = 'crown';
  order.recipe = RECIPES.crown;
  order.customer = 'The Wandering Queen';
  order.line = 'Five days of smoke and spark — now the Crown.';
  order.patience = RECIPES.crown.patience;
  order.patienceMax = RECIPES.crown.patience;
  return order;
}
