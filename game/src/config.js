// EMBER & ANVIL — config.js
// Every tuning number, recipe and upgrade in one place. Nothing here reads
// the network or touches the DOM; render.js and craft.js read these values.

export const CANVAS_W = 1280;
export const CANVAS_H = 800;

// ---- palette: one warm forge palette, used by every draw call ----
export const PALETTE = {
  stoneDark: '#17120e',
  stone: '#241b14',
  stoneLight: '#3a2c1e',
  wallLine: '#17100a',
  floor: '#100c09',
  ember: '#ff7a1a',
  emberBright: '#ffb347',
  gold: '#ffd166',
  goldDark: '#c98f1b',
  steel: '#8fa3b0',
  steelDark: '#5c6e7a',
  quench: '#4cc9f0',
  quenchDeep: '#1d7fa8',
  cream: '#f5e9d0',
  creamDim: '#cbb894',
  red: '#e5484d',
  green: '#57cc7a',
  purple: '#b388eb',
};

// ---- day flow ----
export const DAYS = 5;
export const START_HEARTS = 3;
export const MAX_HEARTS = 5;
export const DAY_TIME = [150, 150, 160, 160, 180]; // seconds per day
export const DAY_QUOTA = [4, 5, 5, 6, 6]; // orders to serve per day

// ---- crafting stages: quality is 0..100, built as heat 40 + hammer 40 + quench 20 ----
export const STAGE_POINTS = { heat: 40, hammer: 40, quench: 20 };
export const HEAT_PUMP_RATE = 38; // temp per second while the bellows are held
export const HEAT_COOL_RATE = 6; // temp per second while released
export const HAMMER_MISS_PENALTY = 6; // quality points lost per missed strike
export const PERFECT_QUALITY = 95; // quality at or above this counts as a perfect craft
export const TIP_QUALITY = 85; // quality at or above this earns a tip
export const TIP_RATE = 0.15;
export const COMBO_STEP = 0.1; // +10% pay per combo step
export const COMBO_MAX = 2.0; // pay multiplier cap

// ---- recipes: heat band [low, high], hammer spots, quench sweep speed, patience ----
export const RECIPES = {
  horseshoe: {
    name: 'Horseshoe', plural: 'Horseshoes', price: 30,
    heat: [60, 84], spots: 3, quenchSpeed: 95, patience: 48,
    blurb: 'Lucky iron for a travelling mule.',
  },
  dagger: {
    name: 'Dagger', plural: 'Daggers', price: 45,
    heat: [62, 82], spots: 4, quenchSpeed: 110, patience: 45,
    blurb: 'Short, sharp, and honest.',
  },
  sword: {
    name: 'Sword', plural: 'Swords', price: 70,
    heat: [64, 80], spots: 5, quenchSpeed: 125, patience: 42,
    blurb: 'A blade for the autumn tournament.',
  },
  shield: {
    name: 'Shield', plural: 'Shields', price: 95,
    heat: [66, 80], spots: 6, quenchSpeed: 140, patience: 40,
    blurb: 'Round, rimmed, and ready for a beating.',
  },
  armor: {
    name: 'Breastplate', plural: 'Breastplates', price: 130,
    heat: [66, 78], spots: 7, quenchSpeed: 155, patience: 38,
    blurb: 'Plate that turns a lance aside.',
  },
  crown: {
    name: 'Crown of Embers', plural: 'Crowns of Embers', price: 300,
    heat: [68, 78], spots: 8, quenchSpeed: 175, patience: 70,
    blurb: 'The masterwork. Ember-gold, fit for a queen.',
  },
};

// Which recipes may appear on each day (index 0 = day 1). The Crown only
// ever appears as the final order of day 5, never in the random pool.
export const DAY_RECIPES = [
  ['horseshoe', 'dagger'],
  ['horseshoe', 'dagger', 'sword'],
  ['dagger', 'sword', 'shield'],
  ['sword', 'shield', 'armor'],
  ['shield', 'armor'],
];

// ---- shop upgrades ----
export const UPGRADES = [
  {
    id: 'hammer', name: 'Sturdy Hammer', icon: '🔨',
    desc: '+5 quality per hammer hit',
    costs: [40, 80, 130], max: 3,
  },
  {
    id: 'bellows', name: 'Great Bellows', icon: '🌬️',
    desc: 'Pumps 25% faster, heat band +3 wider',
    costs: [40, 80, 130], max: 3,
  },
  {
    id: 'tongs', name: 'Cool Tongs', icon: '❄️',
    desc: 'Quench band +8 wider',
    costs: [35, 70, 110], max: 3,
  },
  {
    id: 'heart', name: 'Warm Heart', icon: '❤️',
    desc: '+1 heart (max 5)',
    costs: [60, 60, 60], max: 3,
  },
];

// ---- hammer sweep: base speed, grows with the day ----
export const HAMMER_SWEEP_BASE = 420; // px per second
export const HAMMER_SWEEP_PER_DAY = 45;
export const HAMMER_SPOT_RADIUS = 30;
export const HAMMER_SPOT_LIFETIME = 1.6; // seconds a spot stays lit

// ---- quench gauge ----
export const QUENCH_BAND = [35, 65]; // base band, widened by tongs
export const QUENCH_PERFECT_HALF = 4; // |pos - 50| <= 4 is a perfect temper

// ---- scoring ----
export const DAY_CLEAR_BONUS = 100;
export const WIN_BONUS = 500;
