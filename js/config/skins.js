/*
 * Skin catalogue.
 *
 * A look has independent slots, so skins mix and match:
 *   theme   colours — the palette itself lives in tokens.js THEMES (same id)
 *   tiles   how a guessed tile reveals its colour
 *   effect  what plays when you solve the puzzle
 *
 * Adding a skin = one entry in the right slot, its name under
 * skin.<slot>.<id> in js/i18n/*.js, plus for a theme its colours in
 * tokens.js, or for tiles/effects its CSS or animation. A whole new slot
 * (say, a board frame) = a new entry in SLOTS and a new key in SKINS.
 *
 * Fields
 *   id      stable key used in saves (never rename)
 *   tier    'basic' or 'fancy' (fancy ones get the textures and animations)
 *   unlock  { type: 'free' }
 *           { type: 'points', cost: 400 }            — buy with points
 *           { type: 'achievement', id: 'streak-7' }  — see achievements.js
 */

const FREE = { type: 'free' };

export const SLOTS = [
  { id: 'theme' },
  { id: 'tiles' },
  { id: 'effect' }
];

export const SKINS = {
  theme: [
    { id: 'default', tier: 'basic', unlock: FREE },
    { id: 'ai',      tier: 'basic', unlock: FREE },
    { id: 'matcha',  tier: 'basic', unlock: FREE },
    { id: 'sakura',  tier: 'basic', unlock: FREE },
    { id: 'urushi',  tier: 'fancy', unlock: { type: 'points', cost: 800 } },
    { id: 'kinpaku', tier: 'fancy', unlock: { type: 'achievement', id: 'streak-30' } }
  ],

  tiles: [
    { id: 'flip',  tier: 'basic', unlock: FREE },
    { id: 'ink',   tier: 'fancy', unlock: { type: 'points', cost: 400 } },
    { id: 'stamp', tier: 'fancy', unlock: { type: 'achievement', id: 'streak-7' } }
  ],

  effect: [
    { id: 'none',   tier: 'basic', unlock: FREE },
    { id: 'draw',   tier: 'basic', unlock: FREE },
    { id: 'petals', tier: 'fancy', unlock: { type: 'points', cost: 600 } },
    { id: 'hanabi', tier: 'fancy', unlock: { type: 'achievement', id: 'sharp-eye' } }
  ]
};

// What a brand-new player starts with.
export const DEFAULT_LOOK = { theme: 'default', tiles: 'flip', effect: 'draw' };
