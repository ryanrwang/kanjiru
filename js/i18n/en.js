/*
 * English interface text. This file is the reference: every key here must
 * exist in every other language file (validate() warns when one is missing).
 * {name} placeholders are filled in by t(key, { name: … }).
 * Catalogue text is keyed by the catalogue id: mode.<id>, level.<id>,
 * skin.<slot>.<id>, power.<id>, achievement.<id>.
 */
export default {
  meta: {
    description: 'A kanji word puzzle: guess the word from its parts.'
  },

  header: {
    home: 'Play',
    points: 'Points',
    wallet: 'Your points: {amount}. Open Points',
    game: 'Play',
    hints: 'Hints: you have {n}. Open hints',
    // Points, Settings and About: back where you came from.
    close: 'Close'
  },

  currency: {
    name: 'Koban',
    amount: '{n} pts',
    unit: 'pts'
  },

  // How to play, the play page's intro: a worked example.
  howto: {
    title: 'How to play',
    lead: 'Guess the word from its parts.',
    body: 'Fill in the word’s parts in writing order, like letters in Wordle. Where one kanji ends and the next begins is part of the puzzle.',
    hit: 'Right part, right spot',
    near: 'Right part, wrong spot',
    miss: 'Not in the answer',
    // The lines under the little game, one per step (js/howto.js).
    step: {
      type: 'Tap parts to fill a row, in writing order.',
      colours: 'Green: right spot. Yellow: wrong spot. Grey: not in the word.',
      use: 'Use the colours for the next guess.',
      closer: 'Three right. Two parts are in the word, in other cells.',
      split: 'Where one kanji ends is up to you to work out.',
      solved: 'Solved: {answer}. You get 6 tries.'
    }
  },

  // Every game played, under the play card (js/history.js).
  history: {
    // Kanjita: kanjiru in the past tense (2026-11-10, the user's name for it).
    title: 'Kanjita',
    count: '{n} played · {won} solved',
    won: 'Solved in {n}',
    lost: 'Not solved',
    gaveUp: 'Gave up',
    more: 'Show {n} more',
    delete: 'Delete',
    deleteLabel: 'Delete {answer}',
    deleteTitle: 'Delete this game?',
    deleteBody: '{answer} leaves your games and your stats, for good.',
    deleteYes: 'Delete game',
    deleteDesc: 'Points, hints and achievements it earned stay yours.',
    deleted: 'Deleted {answer}.'
  },

  // The play card: the game (or today's daily, in a mode with one), the Hard
  // and Guided switches, then Play.
  play: {
    soon: 'Coming soon',
    loading: 'Loading…',
    loadFailed: 'The game didn’t load. Check your connection and reload.',
    practiceOnly: 'No daily yet. Keep playing for points.',
    daily: 'Daily #{n}',
    ready: 'Guess today’s word from its parts in {rows} tries.',
    readyAny: 'Guess a word from its parts in {rows} tries.',
    going: '{n} of {rows} guesses used · {level}',
    // The flag beside Continue, after giving up (app.js endFromCard).
    gaveUp: 'You gave up. The answer was {answer}.',
    won: 'Solved in {n} ✓ · {level}',
    lost: 'Not solved today · {level}',
    level: 'Level',
    mult: '×{mult} pts',
    hard: {
      name: 'Hard',
      body: 'Guesses must make real kanji and keep what you’ve found.'
    },
    guided: {
      name: 'Guided',
      body: 'Shows where each kanji starts and what goes where.'
    },
    start: 'Play',
    continue: 'Continue',
    result: 'See result',
    more: 'Play again',
    nextDaily: 'Next daily in'
  },

  game: {
    home: 'Back to start',
    listSep: ', ',
    meaningSep: ', ',
    layoutSep: ' · ',
    board: 'Your guesses',
    rowLabel: 'Guess {n}: {word}. {parts}',
    rowLabelParts: 'Guess {n}: {parts}',
    cells: 'Next guess: {n} of {cells} cells filled',
    cellEmpty: '{cell}, empty',
    cellFilled: '{cell}: {part}',
    cellShown: '{cell}: {part}, shown by a hint',
    cellGhost: '{cell}, empty: a hint showed {part} here. Tap again to put it in',
    cellNumber: 'Cell {n}',
    cellPlace: 'Cell {n}, {place}',
    shape: 'Cells: {places}',
    placeOfSlot: '{n}: {place}',
    palettePlace: 'Parts for {place}',
    frameLabel: 'The kanji so far: {parts}',
    framePart: '{part} {place}',
    frameEmpty: 'no parts found yet',
    frameUnknown: 'nothing known yet',
    frameSolved: 'Solved: {kanji}',
    guess: 'Guess',
    delete: 'Delete',
    palette: 'Parts',
    keysHelp: 'Arrow keys move between parts. Enter or Space puts one in the selected cell; Backspace takes it out.',
    cellsHelp: 'Left and right arrows pick a cell.',
    debugCells: 'answer cell {cells}',
    soon: 'This mode is coming soon: its words need reviewing first.',
    on: 'On',
    kun: 'Kun',
    mark: {
      hit: 'right spot',
      near: 'wrong spot',
      other: 'in another kanji',
      miss: 'not in the answer'
    },
    // The Arrows hint, after a yellow tile's mark: which way its part lies.
    way: {
      left: 'its part is to the left',
      right: 'its part is to the right'
    },
    markParts: {
      hit: 'in this kanji',
      other: 'in another kanji',
      miss: 'not in the answer'
    },
    clue: {
      meaning: 'Meaning',
      free: 'free',
      meaningSoon: 'The meaning shows for free after guess {n}.',
      reading: 'Reading',
      strokes: 'Strokes',
      strokesN: '{n} strokes',
      again: 'Tap to see it again',
      guide: 'Kanji',
      layout: 'Layout'
    },
    powers: {
      title: 'Hints',
      use: 'Use',
      back: 'Back',
      close: 'Close',
      count: '×{n}',
      // Debug mode: every hint free.
      free: 'Free',
      freeLabel: 'Free in debug mode',
      freeNote: 'Free in debug mode: none are used up.',
      held: 'You have {n}',
      confirmUse: 'Use {name}?',
      confirmUseYes: 'Use it',
      left: 'You have {n}. {left} left after this.',
      used: '{name} used.',
      swept: 'Swept away {n} parts that aren’t in the answer.',
      pointed: '{n} yellow tiles now point the way to their part.',
      pointLater: 'From now on, yellow tiles point the way to their part.',
      bought: 'Bought. You have {n}.',
      why: {
        none: 'You have none. Buy one, or win for a chance at a bonus hint.',
        before: 'Only before your first guess.',
        during: 'Only after your first guess.',
        useless: 'It wouldn’t show anything new.',
        over: 'The game is over.',
        mode: 'Only for answers of {n} or more kanji.',
        unknown: 'Not in this mode.'
      }
    },
    // What a hint shows when it's used (js/play/reveal.js).
    reveal: {
      kanji: 'Kanji {n}',
      done: 'Done'
    },
    // Ending early: the flag in the header during a game (js/play/screen.js endGame).
    end: {
      open: 'End game',
      title: 'End this game?',
      giveUp: 'Give up',
      giveUpDesc: 'See the answer. Counts as a loss.',
      new: 'New puzzle',
      newDesc: 'Skip this one. It isn’t counted.',
      skipped: 'A new puzzle. The last one wasn’t counted.',
      gaveUp: 'You gave up. Here’s the answer.'
    },
    errors: {
      slots: 'Fill all {cells} cells first.',
      'not-real': 'Those parts don’t make real kanji in that order. Try another mix.',
      'keep-shown': '{part} goes in cell {cell}: a hint showed it there.',
      'keep-hit': '{part} stays in cell {cell}: you found it there.',
      'use-near': 'Use {part}: you found it in the word.',
      level: 'That kind of guess isn’t used at this level.',
      over: 'The game is over.',
      length: 'The answer is {n} kanji long.',
      'not-kanji': 'Guess a jōyō kanji.',
      'not-in-palette': 'That kanji has a part that isn’t in this puzzle.',
      repeat: 'You already guessed that.',
      'not-a-word': 'That isn’t a word.'
    }
  },

  pos: {
    left: 'left',
    right: 'right',
    top: 'top',
    bottom: 'bottom',
    outer: 'outside',
    inner: 'inside',
    whole: 'whole',
    none: 'across'
  },

  // Place names over narrow cells on the board.
  posShort: {
    left: 'L',
    right: 'R',
    top: 'top',
    bottom: 'btm',
    outer: 'out',
    inner: 'in',
    whole: 'all',
    none: '—'
  },

  result: {
    won: 'Solved in {n}!',
    lost: 'Out of guesses',
    gaveUp: 'You gave up',
    parts: 'Parts',
    points: 'Points',
    pointsEarned: '+{n} pts',
    pointsWhy: 'parts {parts} + solve {solve}, ×{mult}',
    rewards: 'Rewards',
    balance: 'You have {icon} {n} pts',
    spend: 'Spend them',
    streak: 'Win streak',
    streakDays: '{n} in a row',
    share: 'Share',
    copied: 'Copied. Paste it anywhere.',
    copyManually: 'Select the text above and copy it.',
    nextDaily: 'Next daily in',
    practice: 'Play again',
    again: 'New game',
    done: 'Done',
    source: 'Meanings and readings from JMdict and KANJIDIC (EDRDG).',
    credits: 'Credits'
  },

  share: {
    daily: 'Kanjiru {numeral} #{puzzle} {level} {score}{hints}',
    practice: 'Kanjiru {numeral} {level} {score}{hints}'
  },

  // The Points page: the wallet at the top.
  points: {
    title: 'Points',
    wallet: 'Your points',
    hints: 'Hints held',
    streak: 'Win streak',
    achievements: 'Achievements',
    of: '{n} of {total}'
  },

  looks: {
    title: 'Looks',
    note: 'Mix colours, tiles, effects and icons',
    lockPoints: '{cost} pts',
    lockAchievement: '{name}',
    locked: 'Locked',
    inUse: 'In use'
  },

  powers: {
    title: 'Hints & powers',
    note: 'Use them in a game',
    earnedOnly: 'Earned only',
    whenBoth: 'Before or during a game',
    whenBefore: 'Before your first guess',
    whenDuring: 'During a game',
    minLength: 'Answers of {n}+ kanji',
    have: 'You have {n}'
  },

  // Buying, on the Points page and in a game's hint sheet.
  shop: {
    buyFor: 'Buy · {cost} pts',
    // A hint's Buy button shows its price alone; this is what it's called.
    buyLabel: 'Buy {name} for {cost} pts',
    confirm: 'Spend {cost} of your {have} pts on {name}? You’ll have {left} left.',
    confirmTitle: 'Buy {name}?',
    confirmYes: 'Buy for {cost} pts',
    cancel: 'Cancel',
    dontAsk: 'Don’t ask again before buying hints',
    have: 'Held {n}/{hold}',
    full: 'The most you can hold is {hold}',
    short: '{n} more pts needed',
    soon: 'Coming soon',
    owned: 'Yours',
    ownedSoon: 'Yours · coming soon',
    byAchievement: 'Achievement',
    earn: '“{name}”: {desc}',
    bought: '{name} bought: you have {n}. {left} pts left.',
    boughtSkin: '{name} is yours and on. {left} pts left.'
  },

  reward: {
    points: '+{n} pts',
    spent: '−{n} pts',
    hint: '{icon} {name}',
    hints: '{icon} {name} ×{n}',
    sep: ' · ',
    streak: '{n} wins in a row!',
    drop: 'Bonus hint',
    achievement: 'Achievement: {name}',
    unlocks: 'Unlocks {name}'
  },

  achievements: {
    title: 'Achievements',
    note: '{n} of {total} earned',
    earned: 'Earned {date}',
    progress: '{n} of {goal}',
    best: 'Best so far: {n}'
  },

  toast: {
    dismiss: 'Dismiss'
  },

  // The ask before something that can't be undone (js/confirm.js).
  confirm: {
    cancel: 'Cancel',
    close: 'Close',
    step: 'Step {n} of {of}'
  },

  settings: {
    open: 'Settings',
    title: 'Settings',
    language: 'Language',
    scheme: {
      title: 'Appearance',
      auto: 'Auto',
      light: 'Light',
      dark: 'Dark',
      fixed: '{name} has one colour scheme only.'
    },
    hints: {
      title: 'Hints',
      name: 'Ask before buying',
      body: 'Buying a hint asks first, with its price and the points left.'
    },
    debug: {
      title: 'Debug',
      name: 'Debug mode',
      body: 'For testing: numbered dots on the game’s keys show the answer in writing order, and every hint in a game is free.',
      unlocked: 'Debug mode is on.',
      locked: 'Debug mode is off.'
    }
  },

  // The first visit: the language picker (each language's own words, so
  // title is the same in both), then a tip at the gear; and the first
  // game's welcome bonus card at the hints button.
  welcome: {
    lang: {
      title: 'Language · 言語',
      play: 'Play in English',
      later: 'Not now'
    },
    langTip: {
      body: 'Change the language any time in Settings.',
      close: 'Close the tip'
    },
    tip: {
      title: 'Welcome bonus',
      button: 'Buy a hint',
      later: 'Maybe later'
    }
  },

  // Starting over, in Settings: reset achievements, or delete everything
  // (three asks, the last one typed).
  reset: {
    title: 'Start over',
    achievements: {
      name: 'Reset achievements',
      note: 'Earn them again from zero. Your games, points, hints and looks bought stay.',
      button: 'Reset achievements',
      title: 'Reset achievements?',
      body: 'Every achievement goes back to unearned, and only games you play from now on count toward them.',
      keep: 'Your games, points, hints and looks bought stay. Rewards already paid aren’t paid again, and looks an achievement unlocked lock until you earn it again.',
      confirm: 'Reset achievements',
      confirmDesc: 'Start them again from zero.',
      done: 'Achievements reset. Play to earn them again.'
    },
    all: {
      name: 'Delete all data',
      note: 'Every game, point, hint, look and achievement on this device. Three steps to confirm.',
      button: 'Delete all data',
      title1: 'Delete all your progress?',
      body1: 'This deletes everything Kanjiru has saved on this device:',
      counts: '{games} games played, {points} pts, {hints} hints, {achievements} achievements, and every look you bought.',
      stays: 'Your language and light or dark setting stay.',
      next: 'Continue',
      nextDesc: 'Two more steps before anything is deleted.',
      title2: 'Are you sure?',
      body2: 'This can’t be undone. Your progress can’t be brought back unless you have a copy.',
      backup: 'To keep a copy, cancel and use Copy save text in Move your progress first.',
      sure: 'Yes, I’m sure',
      sureDesc: 'Last step: type {word}.',
      title3: 'Type {word} to delete',
      word: 'DELETE',
      typeLabel: 'Confirmation word',
      typeHint: 'Type {word} below',
      delete: 'Delete everything and restart',
      deleteDesc: 'Kanjiru reloads, and you start fresh on the home page.',
      done: 'Everything is deleted. You’re starting fresh.'
    }
  },

  // Adding Kanjiru to the home screen (js/install.js): a tip on the play
  // page, and a section in Settings.
  install: {
    title: 'Add Kanjiru to your home screen',
    why: {
      ios: 'Safari clears a site’s saved progress after 7 days without a visit. From your home screen, it’s kept.',
      android: 'It opens full screen, like an app, with your progress.',
      other: 'On a phone it opens like an app. On iPhone it also keeps your progress, which Safari clears after 7 days without a visit.'
    },
    ios: {
      name: 'iPhone and iPad',
      share: 'In Safari, tap Share (on iOS 26, it’s under ⋯).',
      add: 'Tap Add to Home Screen, then Add.',
      move: 'Kanjiru on your home screen starts empty. To bring your progress, tap Get a code in Settings here, then enter it in the app’s Settings.'
    },
    android: {
      name: 'Android',
      menu: 'In Chrome, tap ⋮, then Add to Home screen or Install app.',
      keeps: 'Your progress comes with it.'
    },
    button: 'Install',
    later: 'Not now',
    backup: 'The save text below is a backup too, wherever you play.',
    tipBackup: 'Your save text in Settings is a backup too.'
  },

  // The About page (js/about.js, #about from Settings): the game, your
  // progress and the credits. EDRDG asks for its credit on a screen of its own.
  about: {
    title: 'About',
    open: 'About and credits',
    lead: 'A kanji word puzzle: guess the word from its parts, like Wordle.',
    name: 'The name is 感じる (kanjiru, “to sense”), with the 漢 of 漢字 (kanji).',
    by: 'Made by Ryan Wang',
    privacy: {
      title: 'Your progress',
      body: 'No account needed. Your progress is saved in this browser only. A transfer code keeps a copy on the server until it’s used, 15 minutes at most.'
    },
    credits: {
      title: 'Credits',
      note: 'Thank you',
      edrdg: 'Kanjiru uses the JMdict and KANJIDIC dictionary files. These files are the property of the Electronic Dictionary Research and Development Group, and are used in conformance with the Group’s licence.',
      data: 'Kanjiru’s word and parts data adapt these sources, so they’re shared under CC BY-SA 4.0, with the source code.'
    },
    source: {
      jmdict: { name: 'JMdict', by: 'EDRDG. JSON by Dmitry Shpika (jmdict-simplified)', use: 'The words: spelling, reading and English meanings.' },
      kanjidic: { name: 'KANJIDIC2', by: 'EDRDG', use: 'Each kanji’s meanings, readings, stroke count and frequency.' },
      kanjivg: { name: 'KanjiVG', by: 'Ulrich Apel and contributors', use: 'Each kanji’s parts, their places and writing order, and drawings of parts some fonts lack.' },
      waller: { name: 'JLPT lists', by: 'Jonathan Waller (JLPT Resources). JMdict links by Stephen Kraus (yomitan-jlpt-vocab)', use: 'Which kanji and words are N5 to N3, so answers stay learnable.' },
      noto: { name: 'Noto Sans JP and Noto Serif JP', by: 'Google', use: 'The fonts, and the 金 on the points’ coin.' }
    },
    link: {
      project: 'Project page',
      edrdg: 'EDRDG',
      licence: 'EDRDG licence',
      json: 'jmdict-simplified',
      site: 'tanos.co.uk (archived)',
      lists: 'yomitan-jlpt-vocab',
      fonts: 'Google Fonts',
      code: 'Source code'
    }
  },

  transfer: {
    title: 'Move your progress',
    intro: 'Your progress is saved in this browser. To play on another device, move it there.',
    notSaving: 'This browser isn’t saving progress (private browsing?), so anything you receive lasts only until you close the page.',
    send: {
      title: 'Send to another device',
      body: 'Get a one-time code, then enter it on your other device.',
      button: 'Get a code',
      again: 'Get a new code',
      busy: 'Getting a code…',
      codeLabel: 'Your code: {code}',
      expires: 'Works once · expires in {time}',
      expired: 'That code has expired. Get a new one.'
    },
    receive: {
      title: 'Receive from another device',
      body: 'On your other device, open Settings and tap “Get a code”. Then enter the code here.',
      label: 'Transfer code',
      placeholder: 'Code',
      button: 'Receive',
      busy: 'Receiving…'
    },
    ask: {
      title: 'This device has progress of its own. What should happen to it?',
      merge: 'Merge both',
      mergeDesc: 'Keeps the games from both devices and recounts streaks. Points and hints from both add up.',
      replace: 'Replace this device',
      replaceDesc: 'This device’s own progress is lost.',
      cancel: 'Cancel'
    },
    done: {
      received: 'Progress received.',
      merged: 'Progress merged: the games from both devices are kept.'
    },
    text: {
      title: 'Save text (backup)',
      body: 'Your whole save as text. Keep a copy somewhere safe, or paste one in. No code needed.',
      copy: 'Copy save text',
      paste: 'Paste save text',
      load: 'Load',
      copied: 'Copied. Paste it somewhere safe.',
      copyManually: 'Select the text above and copy it.',
      copyLabel: 'Your save text',
      pasteLabel: 'Paste a save text here'
    },
    errors: {
      offline: 'Couldn’t reach the server. Check your connection and try again.',
      server: 'Something went wrong on the server. Try again in a moment.',
      method: 'Something went wrong. Try again.',
      'bad-request': 'Something went wrong. Try again.',
      'too-large': 'This save is too big to send by code. Use the save text instead.',
      'bad-save': 'This save couldn’t be read. Use the save text instead.',
      'bad-code': 'Enter the code shown on your other device.',
      'not-found': 'No transfer has that code. Check it, or get a new one: each code works once.',
      expired: 'That code has expired. Get a new one on the other device.',
      'rate-limited': 'Too many tries. Wait a few minutes, then try again.',
      'not-a-save': 'That isn’t a Kanjiru save.',
      'newer-version': 'That save is from a newer version of Kanjiru. Reload this page, then send it again.'
    }
  },

  mode: {
    main: { name: 'Kanjiru' },
    k1: { name: 'One kanji' },
    k2: { name: 'Two kanji' },
    k3: { name: 'Three kanji' },
    k4: { name: 'Four kanji' }
  },

  level: {
    easy: { name: 'Easy', desc: 'Guess kanji from a list the parts make, with meanings. (Retired.)' },
    normal: { name: 'Normal', desc: 'The word’s parts in writing order, one per cell. You work out where each kanji starts.' },
    hard: { name: 'Hard', desc: 'Every guess must make real kanji, and use what you’ve found: greens stay put, and parts found are used again.' },
    guided: { name: 'Guided', desc: 'Shows each kanji’s cells and places, a frame per kanji with the parts found, and dims the parts that can’t go in the cell.' },
    'guided-hard': { name: 'Guided · Hard', desc: 'Guided and Hard together.' }
  },

  slot: {
    theme: 'Colours',
    tiles: 'Tile reveal',
    effect: 'Win effect',
    icons: 'Hint icons'
  },

  skin: {
    theme: {
      default: 'Classic',
      ai: 'Ai 藍',
      matcha: 'Matcha 抹茶',
      sakura: 'Sakura 桜',
      fuji: 'Fuji 藤',
      sumi: 'Sumi 墨',
      urushi: 'Urushi 漆',
      kinpaku: 'Kinpaku 金箔'
    },
    tiles: {
      flip: 'Flip',
      fade: 'Fade',
      turn: 'Turn',
      drop: 'Drop',
      wipe: 'Brush wipe',
      ink: 'Ink bleed',
      shoji: 'Shoji 障子',
      stamp: 'Hanko stamp'
    },
    effect: {
      none: 'None',
      draw: 'Brush draw',
      wave: 'Wave',
      confetti: 'Confetti',
      petals: 'Petal fall',
      glow: 'Gold shine',
      seal: 'Seal 印',
      hanabi: 'Hanabi 花火'
    },
    icons: {
      emoji: 'Emoji',
      badge: 'Badge',
      seal: 'Seal',
      illustrated: 'Illustrated'
    }
  },

  power: {
    strokes: {
      name: 'Stroke count',
      desc: 'Shows how many strokes each kanji has.'
    },
    layout: {
      name: 'Layout',
      desc: 'Shows the shape: side by side, stacked or enclosed.'
    },
    meaning: {
      name: 'Meaning',
      desc: 'Shows what the answer means.'
    },
    reading: {
      name: 'Reading',
      desc: 'Shows how it is read.'
    },
    arrows: {
      name: 'Arrows',
      desc: 'Each yellow tile shows an arrow: move it left or right. Lasts the whole game.'
    },
    sweep: {
      name: 'Sweep',
      desc: 'Greys out 10 parts that aren’t in the answer.'
    },
    'reveal-part': {
      name: 'Reveal a part',
      desc: 'Puts one part of the answer in its cell, green. Use it any time.'
    },
    'head-start': {
      name: 'Head start',
      desc: 'Puts 2 parts in their cells, green, before your first guess.'
    },
    'extra-guess': {
      name: 'Extra guess',
      desc: 'Adds one more row.'
    },
    'reveal-kanji': {
      name: 'Reveal a kanji',
      desc: 'Fills in one whole kanji of the word, green.'
    }
  },

  achievement: {
    'first-win': { name: 'First kanji', desc: 'Solve your first puzzle.' },
    regular: { name: 'Regular', desc: 'Solve 25 puzzles.' },
    'streak-7': { name: 'One week', desc: 'Solve 7 dailies in a row.' },
    'streak-30': { name: 'One month', desc: 'Solve 30 dailies in a row.' },
    'win-run-5': { name: 'On a roll', desc: 'Solve 5 puzzles in a row.' },
    'win-run-10': { name: 'Unstoppable', desc: 'Solve 10 puzzles in a row.' },
    'sharp-eye': { name: 'Sharp eye', desc: 'Solve a puzzle in 2 guesses.' },
    unaided: { name: 'Unaided', desc: 'Win without any hints.' },
    'hard-win': { name: 'Hard win', desc: 'Solve a puzzle with Hard on.' },
    'collector-50': { name: 'Collector', desc: 'Solve 50 different kanji.' },
    'full-set': { name: 'Full set', desc: 'Solve every daily length in one day.' }
  }
};
