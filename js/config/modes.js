/*
 * Game modes — one per answer length.
 *
 * Nothing else in the app hard-codes a length. To add a 5-kanji mode:
 *   1. add an entry here, plus its name under mode.<id> in js/i18n/*.js, and
 *   2. raise MAX_LENGTH in tools/build_data.py so the word list has answers
 *      of that length, then mark some Keep and run tools/compile_game.py.
 *
 * Fields
 *   id           stable key used in saves and puzzle numbers (never rename)
 *   length       kanji per answer
 *   numeral      kanji numeral shown on the mode card
 *   guesses      rows before the game is lost
 *   daily        has a daily puzzle (otherwise practice only)
 *   points       multiplier on every point earned in this mode
 *   palette      parts shown per puzzle: the answer's parts, the tiles in
 *                rules.js palette.always, and random decoys up to this many
 *   freeMeaning  the meaning shows for free once this many guesses are used
 *                (0 = from the start, null = never)
 *   playable     the game screen can play it. It also needs answers (Keep
 *                words); until both, the start screen shows "soon". Step 4
 *                turns on 2+ kanji.
 */
export const MODES = [
  { id: 'k1', length: 1, numeral: '一', guesses: 6, daily: true, points: 1,   palette: 40, freeMeaning: 3, playable: true },
  { id: 'k2', length: 2, numeral: '二', guesses: 6, daily: true, points: 1.5, palette: 50, freeMeaning: 3, playable: false },
  { id: 'k3', length: 3, numeral: '三', guesses: 7, daily: true, points: 2,   palette: 56, freeMeaning: 3, playable: false },
  { id: 'k4', length: 4, numeral: '四', guesses: 8, daily: true, points: 2.5, palette: 64, freeMeaning: 3, playable: false }
];
