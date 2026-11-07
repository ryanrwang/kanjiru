/*
 * Hints and powers.
 *
 * Each power is data. What it does is an `effect` the game engine implements
 * once; a new power that reuses an effect with different `params` (say,
 * "reveal 3 parts") is just a new entry here, with no engine change.
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
 *   name, desc, icon   shown in the UI
 *   effect, params     what it does (above)
 *   when       'before' (start screen, before the first guess) and/or 'during'
 *   cost       price in points; null = can't be bought, only earned
 *   hold       most you can carry at once
 *   drop       weight in the random bonus drop after a win (0 = never drops)
 *   minLength  only offered in modes with at least this many kanji
 */
export const POWERS = [
  {
    id: 'strokes', name: 'Stroke count', icon: '🔢',
    desc: 'Shows how many strokes the answer has.',
    effect: 'revealStrokes', params: {},
    when: ['before', 'during'], cost: 20, hold: 5, drop: 30, minLength: 1
  },
  {
    id: 'layout', name: 'Layout', icon: '📐',
    desc: 'Shows the shape: side by side, stacked or enclosed.',
    effect: 'revealLayout', params: {},
    when: ['before', 'during'], cost: 25, hold: 5, drop: 25, minLength: 1
  },
  {
    id: 'meaning', name: 'Meaning', icon: '💬',
    desc: 'Shows the English meaning.',
    effect: 'revealMeaning', params: {},
    when: ['before', 'during'], cost: 30, hold: 5, drop: 20, minLength: 1
  },
  {
    id: 'reading', name: 'Reading', icon: '🔊',
    desc: 'Shows how it is read.',
    effect: 'revealReading', params: {},
    when: ['before', 'during'], cost: 40, hold: 5, drop: 15, minLength: 1
  },
  {
    id: 'sweep', name: 'Sweep', icon: '🧹',
    desc: 'Greys out 10 parts that aren’t in the answer.',
    effect: 'eliminateParts', params: { count: 10 },
    when: ['before', 'during'], cost: 40, hold: 3, drop: 15, minLength: 1
  },
  {
    id: 'reveal-part', name: 'Reveal a part', icon: '🧩',
    desc: 'Marks one part of the answer green.',
    effect: 'revealParts', params: { count: 1 },
    when: ['during'], cost: 60, hold: 3, drop: 10, minLength: 1
  },
  {
    id: 'head-start', name: 'Head start', icon: '🚀',
    desc: 'Reveals 2 parts before your first guess.',
    effect: 'revealParts', params: { count: 2 },
    when: ['before'], cost: 100, hold: 2, drop: 5, minLength: 1
  },
  {
    id: 'extra-guess', name: 'Extra guess', icon: '➕',
    desc: 'Adds one more row.',
    effect: 'addGuesses', params: { count: 1 },
    when: ['before', 'during'], cost: 80, hold: 3, drop: 10, minLength: 1
  },
  {
    id: 'reveal-kanji', name: 'Reveal a kanji', icon: '🀄',
    desc: 'Fills in one whole kanji of the word.',
    effect: 'revealKanji', params: { count: 1 },
    when: ['before', 'during'], cost: 150, hold: 2, drop: 5, minLength: 2
  }
];
