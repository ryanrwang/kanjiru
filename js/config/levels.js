/*
 * How the game plays. Everyone plays the same daily; Settings has two
 * switches, Hard and Guided, and each mix of them is a level here
 * (settingsLevel() picks it; save.settings.level keeps the id). A game
 * keeps the level it started with, and its history entry records it.
 *
 * The game (docs/DESIGN.md, "The puzzle"): one cell per part of the answer,
 * in writing order, across all its kanji, like a word's letters in Wordle.
 * Green: the right part in the right cell. Yellow: in the word, another
 * cell. Grey: not in the word. The cells don't show where one kanji ends.
 *
 * To add a level: an entry here, plus its name and description under
 * level.<id> in js/i18n/*.js.
 *
 * Fields
 *   id           stable key used in saves and history (never rename)
 *   offered      a choice now. Retired levels stay so old games still read
 *   hard         its Settings switches (offered levels): Hard and Guided
 *   guided
 *   guess        what a guess is:
 *                  'parts'  one part per cell
 *                  'kanji'  a kanji or word (the retired Easy)
 *   order        'parts' guesses: cells are the answer's parts in writing
 *                order (above). false: each kanji is scored on its own
 *   places       'parts' guesses not in order: each cell is a place in its
 *                kanji (unused by the offered levels)
 *   realKanji    'parts' guesses must make real kanji: in order, split any
 *                way into jōyō kanji
 *   useHints     like Wordle's hard mode: greens stay in their cells, and
 *                every part found is used again
 *   showSplit    the board shows each kanji's cells apart, their places and
 *                a frame per kanji, and dims the keys that can't go in the
 *                selected cell (the keyboard never changes size)
 *   countLeft    each guess keeps how many kanji still fit each slot
 *                (engine.fits). No offered level shows it: Guided did,
 *                under its frames, until 2026-11-10
 *   strokeKeys   the keyboard also has the single strokes in rules.js
 *                palette.strokeKeys (Hard: they build guess kanji)
 *   paletteScale the mode's palette size (modes.js palette) times this,
 *                rounded: 28 keys for everyone
 *   meanings     guessed kanji show their meaning on the board
 *   freeMeaning  the mode's free meaning (modes.js freeMeaning) applies;
 *                false = only the Meaning hint shows it
 *   points       multiplier on every point earned at this level
 */
const PARTS = {
  guess: 'parts', order: true, places: false, paletteScale: 0.7, meanings: false, freeMeaning: false
};

export const LEVELS = [
  { id: 'normal', offered: true, hard: false, guided: false, ...PARTS, strokeKeys: false,
    realKanji: false, useHints: false, showSplit: false, countLeft: false, points: 1 },
  { id: 'hard', offered: true, hard: true, guided: false, ...PARTS, strokeKeys: true,
    realKanji: true, useHints: true, showSplit: false, countLeft: false, points: 1.5 },
  { id: 'guided', offered: true, hard: false, guided: true, ...PARTS, strokeKeys: false,
    realKanji: false, useHints: false, showSplit: true, countLeft: false, points: 0.75 },
  { id: 'guided-hard', offered: true, hard: true, guided: true, ...PARTS, strokeKeys: true,
    realKanji: true, useHints: true, showSplit: true, countLeft: false, points: 1.125 },
  // Retired: Easy guessed whole kanji from a strip.
  { id: 'easy', offered: false, hard: false, guided: false, guess: 'kanji', order: false, places: false,
    strokeKeys: true, realKanji: true, useHints: false, showSplit: false, countLeft: false, paletteScale: 1,
    meanings: true, freeMeaning: true, points: 0.5 }
];

// New players start here.
export const DEFAULT_LEVEL = 'normal';

// The offered level for the Settings switches.
export function settingsLevel(hard, guided) {
  const level = LEVELS.find((l) => l.offered && l.hard === !!hard && l.guided === !!guided);
  return level ? level.id : DEFAULT_LEVEL;
}
