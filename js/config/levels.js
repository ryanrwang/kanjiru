/*
 * Difficulty levels. The player picks one on the start screen
 * (save.settings.level), and a game keeps the level it started with. Every
 * level plays the same daily, so puzzle numbers and streaks are shared.
 *
 * To add a level: an entry here, plus its name and description under
 * level.<id> in js/i18n/*.js.
 *
 * Fields
 *   id           stable key used in saves and history (never rename)
 *   guess        what a guess is:
 *                  'kanji'  a kanji (a word in longer modes): picked from the
 *                           strip of kanji the picked parts make, or typed
 *                  'parts'  one part per empty cell. Each kanji of the answer
 *                           shows as many cells as it has parts
 *   places       'parts' guesses only: each cell is a place in the answer's
 *                shape (left, right, top …), shown on the board. A part is
 *                green in its place and yellow in another place, as for
 *                'kanji' guesses. false: green wherever it sits, no yellow
 *   realKanji    'parts' guesses only: the parts must make a real kanji, one
 *                with exactly these parts (in these places, with places).
 *                ('kanji' guesses always do.)
 *   countLeft    'parts' guesses only: the board shows how many kanji still
 *                fit everything the player has seen, after every guess
 *   paletteScale the mode's palette size (modes.js palette) times this,
 *                rounded: fewer parts make each guess test more of them
 *   meanings     guessed kanji show their meaning on the board
 *   freeMeaning  the mode's free meaning (modes.js freeMeaning) applies;
 *                false = only the Meaning hint shows it
 *   points       multiplier on every point earned at this level
 */
export const LEVELS = [
  { id: 'easy', guess: 'kanji', places: false, realKanji: true, countLeft: false, paletteScale: 1,
    meanings: true, freeMeaning: true, points: 0.5 },
  { id: 'normal', guess: 'parts', places: false, realKanji: false, countLeft: true, paletteScale: 0.7,
    meanings: false, freeMeaning: false, points: 1 },
  { id: 'hard', guess: 'parts', places: true, realKanji: true, countLeft: false, paletteScale: 1,
    meanings: false, freeMeaning: false, points: 1.5 }
];

// New players start here.
export const DEFAULT_LEVEL = 'normal';
