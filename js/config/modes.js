/*
 * Game modes. The main one is the daily: an answer of 4–6 parts, which may
 * be 1 to 4 kanji (most are 2). After it, players keep playing more of the
 * same, for the same points.
 *
 * Nothing else in the app hard-codes a mode or a length. A mode reads its
 * answers from one list in data/game/answers.json, which
 * tools/compile_game.py writes from the Keep words (its LISTS setting says
 * which words go in each list). To add a mode: a list there, an entry here,
 * and its name under mode.<id> in js/i18n/*.js.
 *
 * Fields
 *   id           stable key used in saves and puzzle numbers (never rename)
 *   length       kanji per answer, or null when its answers vary (each game
 *                takes its answer's length)
 *   answers      the list in data/game/answers.json it plays
 *   numeral      kanji shown on the mode card
 *   guesses      rows before the game is lost
 *   daily        has a daily puzzle (otherwise only more puzzles)
 *   points       multiplier on every point earned in this mode
 *   palette      parts shown per puzzle: the answer's parts, the tiles in
 *                rules.js palette.always, and random decoys up to this many
 *   freeMeaning  the meaning shows for free once this many guesses are used
 *                (0 = from the start, null = never)
 *   playable     the game screen can play it. It also needs answers (Keep
 *                words); until both, the start screen shows "soon"
 *   listed       shown on the start screen
 *
 * k1–k4 were the first modes, one per answer length. They're retired (not
 * listed, not playable, no answer lists) but stay so old saves still read.
 */
export const MODES = [
  { id: 'main', length: null, answers: 'main', numeral: '漢', guesses: 6, daily: true, points: 1, palette: 40, freeMeaning: 3, playable: true, listed: true },
  { id: 'k1', length: 1, answers: '1', numeral: '一', guesses: 6, daily: true, points: 1,   palette: 40, freeMeaning: 3, playable: false, listed: false },
  { id: 'k2', length: 2, answers: '2', numeral: '二', guesses: 6, daily: true, points: 1.5, palette: 50, freeMeaning: 3, playable: false, listed: false },
  { id: 'k3', length: 3, answers: '3', numeral: '三', guesses: 7, daily: true, points: 2,   palette: 56, freeMeaning: 3, playable: false, listed: false },
  { id: 'k4', length: 4, answers: '4', numeral: '四', guesses: 8, daily: true, points: 2.5, palette: 64, freeMeaning: 3, playable: false, listed: false }
];
