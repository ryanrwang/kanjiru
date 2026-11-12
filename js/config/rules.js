/*
 * Game rules that aren't points, modes or powers. The engine (js/engine/)
 * reads them from here, so tuning the game never touches its code.
 *
 * The daily schedule (its start date and the answer order) is data, not
 * config: tools/compile_game.py writes it to data/game/answers.json.
 */
export const RULES = {
  // The parts palette for one puzzle: every part of the answer, these
  // tiles, then decoys drawn at random until the mode's `palette` size
  // (modes.js) is reached. A daily's palette comes from its puzzle number,
  // so everyone gets the same one.
  palette: {
    // Always shown: 一, a real part of many answers.
    always: ['一'],
    // Shown too at a level with `strokeKeys` (Hard): the other single
    // strokes. No answer has one (compile_game.py LOOSE_STROKES), but a Hard
    // guess must make real kanji, and some need them. Elsewhere they were
    // dead keys (native audit, 2026-11-12).
    strokeKeys: ['丨', '丶', '丿', '乙', '亅'],
    // A decoy's chance = byUses × the jōyō kanji it appears in
    //                  + byNeighbour × the kanji it shares with an answer part.
    // Neighbours make more real kanji buildable from the palette.
    decoyWeight: { byUses: 1, byNeighbour: 20 },
    // A key whose part has other forms shows one of them small in its
    // corner (亻 on 人, 忄 on 心), the same at every level and in every game,
    // so it never gives the answer away (docs/DESIGN.md, "Key forms"). It's
    // the form the most jōyō kanji use, in at least minUses of them; a tie
    // goes to the one the answers use more (牜 on 牛, for 物). Never one in
    // skip: forms a reader takes for the key's own glyph (匸 for 匚, 巳 for 己).
    corner: { minUses: 5, skip: ['匸', '巳', '㔾', '母', '毌', '⺷', '夾', '氺'] }
  },

  // A guess must be built only from the palette's parts.
  guessFromPalette: true,

  // Practice answers skip the most recent ones played in that mode.
  practice: { avoidRecent: 30 },

  // The play page's tip to add Kanjiru to the home screen (js/install.js):
  // on a phone, once there's progress to lose. "Not now" puts it off this
  // many days. iOS clears an unvisited site's saves after 7.
  installTip: { laterDays: 14 },

  // Typing parts on a physical keyboard (js/play/keys.js): the keyboard's
  // rows of keys, by position (KeyboardEvent.code, so any layout works).
  // The game's keys take them row by row, in the same places: at a
  // desktop's 11 keys a row, Q to [, A to ', Z to N (2026-11-11, the user
  // agreed). A key past the end of its row has no letter.
  typing: {
    rows: [
      ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
      ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
      ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash']
    ]
  },

  // Debug mode is hidden (2026-11-10, the user asked): tapping About's
  // title in Settings this many times within `within` ms shows its section
  // and turns it on (js/settings.js).
  debugTaps: { count: 8, within: 3000 },

  // The share text after a game: one square per part, per guess, and a
  // mark when the game used a hint or power (the free meaning doesn't count).
  // show: false hides it on the result card for now (2026-11-08).
  share: {
    show: false,
    marks: { hit: '🟩', near: '🟨', other: '🟨', miss: '⬜' },
    hints: '💡'
  }
};
