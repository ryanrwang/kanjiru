/*
 * Hints and powers.
 *
 * Each power is data. What it does is an `effect` the game engine implements
 * once; a new power that reuses an effect with different `params` (say,
 * "reveal 3 parts") is just a new entry here, plus its name and description
 * under power.<id> in js/i18n/*.js. No engine change.
 *
 * Effects the engine implements:
 *   revealStrokes   show the stroke count (per kanji in longer modes)
 *   revealLayout    show the shape: side by side, stacked, enclosed …
 *   revealMeaning   show the meaning (Japanese in Japanese, when the answer has one)
 *   revealReading   show the kana reading
 *   revealParts     put `count` parts of the answer in their cells, green
 *   eliminateParts  grey out `count` palette parts that aren't in the answer
 *   addGuesses      add `count` rows
 *   revealKanji     fill in `count` whole kanji (2+ kanji modes)
 *   pointNear       an arrow on every yellow tile, this game: which way along
 *                   the word its part lies (left or right)
 * A game shows each one used with its own animation (js/play/reveal.js).
 *
 * Prices (2026-11-10): a win at Normal pays about 170 points (economy.js:
 * a solve in 4 of 6 is 120, its 5 parts 40, plus a share of streak
 * rewards), and the user asked that a win buy about two hints. So the
 * hints cost 50 to 120 (two of the five cheapest come to about 140, the
 * mean of all eight to about 95), and Reveal a kanji, which gives away a
 * whole kanji, 200.
 *
 * Fields
 *   id         stable key used in saves (never rename)
 *   icon       shown in the UI
 *   effect, params     what it does (above)
 *   when       'before' (before the first guess) and/or 'during'
 *   cost       price in points; null = can't be bought, only earned
 *   hold       most you can carry at once
 *   drop       weight in the random bonus drop after a win (0 = never drops)
 *   minLength  only offered when the answer has at least this many kanji
 *   retired    no longer offered, sold, dropped or given (2026-11-09). Its
 *              entry stays so saves and games that used it still read, and
 *              the engine still plays it back.
 *   becomes    a retired power's hints still held count as this one:
 *              { id, n } (each held one is n of `id`; js/ledger.js balance)
 */
export const POWERS = [
  { id: 'strokes', icon: '🔢', effect: 'revealStrokes', params: {},
    when: ['before', 'during'], cost: 50, hold: 5, drop: 30, minLength: 1 },
  { id: 'layout', icon: '📐', effect: 'revealLayout', params: {},
    when: ['before', 'during'], cost: 60, hold: 5, drop: 25, minLength: 1 },
  { id: 'meaning', icon: '💬', effect: 'revealMeaning', params: {},
    when: ['before', 'during'], cost: 70, hold: 5, drop: 20, minLength: 1 },
  // Arrows (2026-11-10, the user asked): for the rest of the game, each
  // yellow tile points the way to its part.
  { id: 'arrows', icon: '🧭', effect: 'pointNear', params: {},
    when: ['before', 'during'], cost: 70, hold: 3, drop: 15, minLength: 1 },
  // Retired: the reading as good as gives the word away.
  { id: 'reading', icon: '🔊', effect: 'revealReading', params: {},
    when: ['before', 'during'], cost: null, hold: 5, drop: 0, minLength: 1,
    retired: true, becomes: { id: 'meaning', n: 1 } },
  { id: 'sweep', icon: '🧹', effect: 'eliminateParts', params: { count: 10 },
    when: ['before', 'during'], cost: 80, hold: 3, drop: 15, minLength: 1 },
  // One part, at any time: Head start (2 parts, before the first guess) is
  // folded into it.
  { id: 'reveal-part', icon: '🧩', effect: 'revealParts', params: { count: 1 },
    when: ['before', 'during'], cost: 100, hold: 3, drop: 15, minLength: 1 },
  { id: 'head-start', icon: '🚀', effect: 'revealParts', params: { count: 2 },
    when: ['before'], cost: null, hold: 2, drop: 0, minLength: 1,
    retired: true, becomes: { id: 'reveal-part', n: 2 } },
  { id: 'extra-guess', icon: '➕', effect: 'addGuesses', params: { count: 1 },
    when: ['before', 'during'], cost: 120, hold: 3, drop: 10, minLength: 1 },
  { id: 'reveal-kanji', icon: '🀄', effect: 'revealKanji', params: { count: 1 },
    when: ['before', 'during'], cost: 200, hold: 2, drop: 5, minLength: 2 }
];
