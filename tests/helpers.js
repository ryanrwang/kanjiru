/*
 * Shared test setup: fixture data and a test config whose numbers differ
 * from the real ones, so a test that passes proves the engine read them.
 */
import { KANJI, TILES } from './fixture-kanji.js';
import { MODES, POWERS, ECONOMY, RULES, LEVELS, DEFAULT_LEVEL } from '../js/registry.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

// answers: { [length]: [...] }, words: { [word]: { reading, meanings } }
// localMeanings: { [lang]: { [answer]: meaning } }
export function fixtureData({ answers = {}, words = {}, epoch = '2026-01-01', localMeanings = {} } = {}) {
  return { kanji: clone(KANJI), tiles: clone(TILES), answers, words, epoch, localMeanings };
}

// The real config with test numbers. Overrides merge in at the top level.
export function testConfig(overrides = {}) {
  return {
    modes: clone(MODES),
    powers: clone(POWERS),
    economy: {
      ...clone(ECONOMY),
      perPart: { hit: 10, near: 4, other: 1 },
      solve: { base: 100, perUnusedGuess: 10, perUnusedGuessHinted: 0 },
      dailyMultiplier: 1,
      practiceMultiplier: 0.5,
      drops: { chanceOnPerfect: 0.6, perfectShare: 0.5, afterHints: false }
    },
    rules: clone(RULES),
    // Easy pays ×1 here, so the kanji-guess tests read plain numbers.
    levels: clone(LEVELS).map((l) => ({ ...l, points: { easy: 1, normal: 2, hard: 3 }[l.id] || 1 })),
    defaultLevel: DEFAULT_LEVEL,
    ...overrides
  };
}

// A start for engine.newGame.
// Level 'easy' (kanji guesses) unless extra says otherwise.
export const start = (modeId, answer, extra = {}) => ({ modeId, answer, seed: `test:${answer}`, daily: true, puzzle: 1, level: 'easy', ...extra });

// Kanji → scoreGuess slots.
export const slots = (word) => [...word].map((kanji) => ({ kanji, parts: KANJI[kanji].parts }));

export const marks = (scoredSlot) => scoredSlot.tiles.map((t) => t.mark);
