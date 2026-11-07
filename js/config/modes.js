/*
 * Game modes — one per answer length.
 *
 * Nothing else in the app hard-codes a length. To add a 5-kanji mode:
 *   1. add an entry here, and
 *   2. raise MAX_LENGTH in tools/build_data.py so the word list has answers
 *      of that length.
 *
 * Fields
 *   id        stable key used in saves and puzzle numbers (never rename)
 *   length    kanji per answer
 *   name      shown in the UI
 *   numeral   kanji numeral shown on the mode card
 *   guesses   rows before the game is lost
 *   daily     has a daily puzzle (otherwise practice only)
 *   points    multiplier on every point earned in this mode
 */
export const MODES = [
  { id: 'k1', length: 1, name: 'One kanji',   numeral: '一', guesses: 6, daily: true, points: 1 },
  { id: 'k2', length: 2, name: 'Two kanji',   numeral: '二', guesses: 6, daily: true, points: 1.5 },
  { id: 'k3', length: 3, name: 'Three kanji', numeral: '三', guesses: 7, daily: true, points: 2 },
  { id: 'k4', length: 4, name: 'Four kanji',  numeral: '四', guesses: 8, daily: true, points: 2.5 }
];
