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
 *                           shows as many cells as it has parts, and a part is
 *                           green when the answer has it, wherever it sits
 *   realKanji    'parts' guesses only: the parts must make a real kanji, one
 *                with exactly these parts. ('kanji' guesses always do.)
 *   meanings     guessed kanji show their meaning on the board
 *   freeMeaning  the mode's free meaning (modes.js freeMeaning) applies;
 *                false = only the Meaning hint shows it
 *   points       multiplier on every point earned at this level
 */
export const LEVELS = [
  { id: 'easy',   guess: 'kanji', realKanji: true,  meanings: true,  freeMeaning: true,  points: 0.5 },
  { id: 'normal', guess: 'parts', realKanji: false, meanings: false, freeMeaning: false, points: 1 },
  { id: 'hard',   guess: 'parts', realKanji: true,  meanings: false, freeMeaning: false, points: 1.5 }
];

// New players start here.
export const DEFAULT_LEVEL = 'normal';
