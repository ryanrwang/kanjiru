/*
 * Hints and powers.
 *
 * Each power is data. What it does is an `effect` the game engine implements
 * once; a new power that reuses an effect with different `params` (say,
 * "reveal 3 parts") is just a new entry here, plus its name and description
 * under power.<id> in js/i18n/*.js. No engine change.
 *
 * Effects the engine will implement:
 *   revealStrokes   show the stroke count (per kanji in longer modes)
 *   revealLayout    show the shape: side by side, stacked, enclosed …
 *   revealMeaning   show the English meaning
 *   revealReading   show the kana reading
 *   revealParts     mark `count` parts green on the palette
 *   eliminateParts  grey out `count` palette parts that aren't in the answer
 *   addGuesses      add `count` rows
 *   revealKanji     fill in `count` whole kanji (2+ kanji modes)
 *
 * Fields
 *   id         stable key used in saves (never rename)
 *   icon       shown in the UI
 *   effect, params     what it does (above)
 *   when       'before' (start screen, before the first guess) and/or 'during'
 *   cost       price in points; null = can't be bought, only earned
 *   hold       most you can carry at once
 *   drop       weight in the random bonus drop after a win (0 = never drops)
 *   minLength  only offered when the answer has at least this many kanji
 */
export const POWERS = [
  { id: 'strokes', icon: '🔢', effect: 'revealStrokes', params: {},
    when: ['before', 'during'], cost: 20, hold: 5, drop: 30, minLength: 1 },
  { id: 'layout', icon: '📐', effect: 'revealLayout', params: {},
    when: ['before', 'during'], cost: 25, hold: 5, drop: 25, minLength: 1 },
  { id: 'meaning', icon: '💬', effect: 'revealMeaning', params: {},
    when: ['before', 'during'], cost: 30, hold: 5, drop: 20, minLength: 1 },
  { id: 'reading', icon: '🔊', effect: 'revealReading', params: {},
    when: ['before', 'during'], cost: 40, hold: 5, drop: 15, minLength: 1 },
  { id: 'sweep', icon: '🧹', effect: 'eliminateParts', params: { count: 10 },
    when: ['before', 'during'], cost: 40, hold: 3, drop: 15, minLength: 1 },
  { id: 'reveal-part', icon: '🧩', effect: 'revealParts', params: { count: 1 },
    when: ['during'], cost: 60, hold: 3, drop: 10, minLength: 1 },
  { id: 'head-start', icon: '🚀', effect: 'revealParts', params: { count: 2 },
    when: ['before'], cost: 100, hold: 2, drop: 5, minLength: 1 },
  { id: 'extra-guess', icon: '➕', effect: 'addGuesses', params: { count: 1 },
    when: ['before', 'during'], cost: 80, hold: 3, drop: 10, minLength: 1 },
  { id: 'reveal-kanji', icon: '🀄', effect: 'revealKanji', params: { count: 1 },
    when: ['before', 'during'], cost: 150, hold: 2, drop: 5, minLength: 2 }
];
