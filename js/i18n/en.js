/*
 * English interface text. This file is the reference: every key here must
 * exist in every other language file (validate() warns when one is missing).
 * {name} placeholders are filled in by t(key, { name: … }).
 * Catalogue text is keyed by the catalogue id: mode.<id>, level.<id>,
 * skin.<slot>.<id>, power.<id>, achievement.<id>.
 */
export default {
  meta: {
    description: 'A daily kanji puzzle: guess the kanji from its parts.'
  },

  header: {
    points: 'Your points',
    schemeDark: 'Switch to dark mode',
    schemeLight: 'Switch to light mode',
    schemeFixed: 'This skin has one colour scheme only'
  },

  currency: {
    name: 'Koban',
    amount: '{n} pts'
  },

  hero: {
    title: 'Guess the word from its parts.',
    hit: 'Right part, right spot',
    near: 'Right part, wrong spot',
    miss: 'Not in the answer',
    // Parts in writing order (every level now)
    partsBody: 'Fill the cells with the word’s parts in writing order, like Wordle’s letters. Where one kanji ends is for you to work out. A part turns green in its cell, yellow if it’s elsewhere in the word, grey if the word hasn’t got it.'
  },

  play: {
    title: 'Play',
    note: 'A new puzzle every day, then as many more as you like',
    meta: '{guesses} guesses · ×{mult} pts',
    soon: 'Coming soon',
    loading: 'Loading…',
    loadFailed: 'The game didn’t load. Check your connection and reload.',
    practiceOnly: 'No daily yet: keep playing',
    dailyNew: 'Daily #{n}',
    dailyStarted: 'Daily #{n} · {level} · {guesses} guessed',
    dailyWon: 'Daily #{n} · {level} · solved in {guesses} ✓',
    dailyLost: 'Daily #{n} · {level} · not solved',
    levelNow: 'Playing at {level}. Hard and Guided are in Settings.',
    levelChange: 'Settings',
    daily: 'Play',
    continue: 'Continue',
    result: 'Result',
    practice: 'Keep playing'
  },

  game: {
    home: 'Back to start',
    daily: 'Daily #{n}',
    practice: 'Keep playing',
    kindLevel: '{kind} · {level}',
    listSep: ', ',
    meaningSep: ', ',
    layoutSep: ' · ',
    board: 'Your guesses',
    rowLabel: 'Guess {n}: {word}. {parts}',
    rowLabelParts: 'Guess {n}: {parts}',
    rowLabelFit: '{label}. {fit}',
    cells: 'Next guess: {n} of {cells} cells filled',
    cellEmpty: '{cell}, empty',
    cellFilled: '{cell}: {part}',
    cellShown: '{cell}: {part}, shown by a hint',
    cellNumber: 'Cell {n}',
    cellPlace: 'Cell {n}, {place}',
    shape: 'Cells: {places}',
    fit: 'Kanji that fit: {n}',
    fitTitle: 'How many kanji still fit',
    fitCount: '{n} fit',
    placeOfSlot: '{n}: {place}',
    palettePlace: 'Parts for {place}',
    frameLabel: 'The kanji so far: {parts}',
    framePart: '{part} {place}',
    frameEmpty: 'no parts found yet',
    frameSolved: 'Solved: {kanji}',
    guess: 'Guess',
    delete: 'Delete',
    palette: 'Parts',
    soon: 'This mode is coming soon: its words need reviewing first.',
    on: 'On',
    kun: 'Kun',
    mark: {
      hit: 'right spot',
      near: 'wrong spot',
      other: 'in another kanji',
      miss: 'not in the answer'
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
      layout: 'Layout',
      parts: 'Parts',
      kanji: 'Kanji',
      eliminated: 'Swept',
      eliminatedCount: '{n} parts greyed out below'
    },
    powers: {
      title: 'Hints',
      use: 'Use',
      cancel: 'Cancel',
      used: '{name} used.',
      why: {
        none: 'You have none yet. Wins can drop bonus hints; the shop is coming soon.',
        before: 'Only before your first guess.',
        during: 'Only after your first guess.',
        useless: 'It wouldn’t show anything new.',
        over: 'The game is over.',
        mode: 'Only for answers of {n} or more kanji.',
        unknown: 'Not in this mode.'
      }
    },
    errors: {
      slots: 'Fill all {cells} cells first.',
      'not-real': 'Those parts don’t make real kanji in that order. Try another mix.',
      'keep-shown': '{part} stays in cell {cell}: a hint showed it there.',
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
    parts: 'Parts',
    points: 'Points',
    pointsEarned: '+{n} pts',
    pointsWhy: 'parts {parts} + solve {solve}, ×{mult}',
    streak: 'Daily streak',
    streakDays: '{n} in a row',
    share: 'Share',
    copied: 'Copied. Paste it anywhere.',
    copyManually: 'Select the text above and copy it.',
    nextDaily: 'Next daily in',
    practice: 'Keep playing',
    again: 'Next puzzle'
  },

  share: {
    daily: 'Kanjiru {numeral} #{puzzle} {level} {score}{hints}',
    practice: 'Kanjiru {numeral} {level} {score}{hints}'
  },

  looks: {
    title: 'Looks',
    note: 'Mix colours, tiles and effects',
    lockPoints: '🔒 {cost} pts',
    lockAchievement: '🔒 {name}',
    buyHint: 'Buy for {cost} points (shop coming soon)',
    achievementHint: 'Unlock: {desc}'
  },

  powers: {
    title: 'Hints & powers',
    note: 'Earn or buy with points',
    cost: '{cost} pts',
    earnedOnly: 'Earned only',
    whenBoth: 'Before or during a game',
    whenBefore: 'Before your first guess',
    whenDuring: 'During a game',
    minLength: 'Answers of {n}+ kanji',
    have: 'You have {n}'
  },

  settings: {
    open: 'Settings',
    title: 'Settings',
    close: 'Close',
    game: {
      title: 'Game',
      body: 'For your next puzzle, and one you haven’t started.'
    },
    hard: {
      name: 'Hard',
      body: 'Every guess must make real kanji and use what you’ve found: greens stay put, and parts found are used again. Points ×{mult}.'
    },
    guided: {
      name: 'Guided',
      body: 'Shows where each kanji starts, its places and a frame for each, and dims the parts that can’t go in the cell. Points ×{mult}.'
    }
  },

  transfer: {
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
      mergeDesc: 'Keeps the games from both devices and recounts streaks. Points and hints take the higher of the two.',
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
    guided: { name: 'Guided', desc: 'Shows each kanji’s cells and places, a frame per kanji with how many still fit, and dims the parts that can’t go in the cell.' },
    'guided-hard': { name: 'Guided · Hard', desc: 'Guided and Hard together.' }
  },

  slot: {
    theme: 'Colours',
    tiles: 'Tile reveal',
    effect: 'Win effect'
  },

  skin: {
    theme: {
      default: 'Classic',
      ai: 'Ai 藍',
      matcha: 'Matcha 抹茶',
      sakura: 'Sakura 桜',
      urushi: 'Urushi 漆',
      kinpaku: 'Kinpaku 金箔'
    },
    tiles: {
      flip: 'Flip',
      ink: 'Ink bleed',
      stamp: 'Hanko stamp'
    },
    effect: {
      none: 'None',
      draw: 'Brush draw',
      petals: 'Petal fall',
      hanabi: 'Hanabi 花火'
    }
  },

  power: {
    strokes: {
      name: 'Stroke count',
      desc: 'Shows how many strokes the answer has.'
    },
    layout: {
      name: 'Layout',
      desc: 'Shows the shape: side by side, stacked or enclosed.'
    },
    meaning: {
      name: 'Meaning',
      desc: 'Shows the English meaning.'
    },
    reading: {
      name: 'Reading',
      desc: 'Shows how it is read.'
    },
    sweep: {
      name: 'Sweep',
      desc: 'Greys out 10 parts that aren’t in the answer.'
    },
    'reveal-part': {
      name: 'Reveal a part',
      desc: 'Puts one part of the answer in its cell, green.'
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
    'streak-7': { name: 'One week', desc: 'Solve 7 dailies in a row.' },
    'streak-30': { name: 'One month', desc: 'Solve 30 dailies in a row.' },
    'sharp-eye': { name: 'Sharp eye', desc: 'Solve a puzzle in 2 guesses.' },
    unaided: { name: 'Unaided', desc: 'Win without any hints.' },
    'collector-50': { name: 'Collector', desc: 'Solve 50 different kanji.' },
    'full-set': { name: 'Full set', desc: 'Solve every daily length in one day.' }
  }
};
