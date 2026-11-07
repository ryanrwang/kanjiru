/*
 * Skin catalogue.
 *
 * A look has independent slots, so skins mix and match:
 *   theme   colours — the palette itself lives in tokens.js THEMES (same id)
 *   tiles   how a guessed tile reveals its colour
 *   effect  what plays when you solve the puzzle
 *
 * Adding a skin = one entry in the right slot (plus, for a theme, its colours
 * in tokens.js; for tiles/effects, its CSS or animation). Adding a whole new
 * slot (say, a board frame) = a new key in SLOTS and SKINS.
 *
 * Fields
 *   id      stable key used in saves (never rename)
 *   name    shown in the UI
 *   tier    'basic' or 'fancy' (fancy ones get the textures and animations)
 *   unlock  { type: 'free' }
 *           { type: 'points', cost: 400 }            — buy with points
 *           { type: 'achievement', id: 'streak-7' }  — see achievements.js
 */

const FREE = { type: 'free' };

export const SLOTS = [
  { id: 'theme',  name: 'Colours' },
  { id: 'tiles',  name: 'Tile reveal' },
  { id: 'effect', name: 'Win effect' }
];

export const SKINS = {
  theme: [
    { id: 'default', name: 'Classic', tier: 'basic', unlock: FREE },
    { id: 'ai',      name: 'Ai 藍',    tier: 'basic', unlock: FREE },
    { id: 'matcha',  name: 'Matcha 抹茶', tier: 'basic', unlock: FREE },
    { id: 'sakura',  name: 'Sakura 桜', tier: 'basic', unlock: FREE },
    { id: 'urushi',  name: 'Urushi 漆', tier: 'fancy', unlock: { type: 'points', cost: 800 } },
    { id: 'kinpaku', name: 'Kinpaku 金箔', tier: 'fancy', unlock: { type: 'achievement', id: 'streak-30' } }
  ],

  tiles: [
    { id: 'flip',  name: 'Flip',        tier: 'basic', unlock: FREE },
    { id: 'ink',   name: 'Ink bleed',   tier: 'fancy', unlock: { type: 'points', cost: 400 } },
    { id: 'stamp', name: 'Hanko stamp', tier: 'fancy', unlock: { type: 'achievement', id: 'streak-7' } }
  ],

  effect: [
    { id: 'none',   name: 'None',        tier: 'basic', unlock: FREE },
    { id: 'draw',   name: 'Brush draw',  tier: 'basic', unlock: FREE },
    { id: 'petals', name: 'Petal fall',  tier: 'fancy', unlock: { type: 'points', cost: 600 } },
    { id: 'hanabi', name: 'Hanabi 花火',  tier: 'fancy', unlock: { type: 'achievement', id: 'sharp-eye' } }
  ]
};

// What a brand-new player starts with.
export const DEFAULT_LOOK = { theme: 'default', tiles: 'flip', effect: 'draw' };
