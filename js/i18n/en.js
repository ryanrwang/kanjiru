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
    title: 'Guess the kanji from its parts.',
    body: 'Each guess colours its parts: right spot, wrong spot, or not in the answer.',
    hit: 'Right part, right spot',
    near: 'Right part, wrong spot',
    miss: 'Not in the answer',
    // Levels with parts guesses (Normal, Hard)
    partsBody: 'Fill the cells with parts. Each cell is a place in the kanji: a part turns green in its place, yellow in another, grey if the kanji hasn’t got it.'
  },

  play: {
    title: 'Play',
    note: 'A new daily every day, plus practice',
    meta: '{guesses} guesses · ×{mult} pts',
    soon: 'Coming soon',
    loading: 'Loading…',
    loadFailed: 'The game didn’t load. Check your connection and reload.',
    practiceOnly: 'Practice only',
    dailyNew: 'Daily #{n}',
    dailyStarted: 'Daily #{n} · {level} · {guesses} guessed',
    dailyWon: 'Daily #{n} · {level} · solved in {guesses} ✓',
    dailyLost: 'Daily #{n} · {level} · not solved',
    level: 'Level',
    levelPoints: '×{mult} pts',
    daily: 'Play',
    continue: 'Continue',
    result: 'Result',
    practice: 'Practice'
  },

  game: {
    home: 'Back to start',
    daily: 'Daily #{n}',
    practice: 'Practice',
    kindLevel: '{kind} · {level}',
    count: '{n}/{rows}',
    countTitle: 'Guesses used',
    listSep: ', ',
    meaningSep: ', ',
    layoutSep: ' · ',
    board: 'Your guesses',
    rowLabel: 'Guess {n}: {word}. {parts}',
    rowLabelParts: 'Guess {n}: {parts}',
    rowLabelFit: '{label}. {fit}',
    nextHint: 'Pick parts below, or type a kanji',
    cells: 'Next guess: {n} of {cells} cells filled',
    cellEmpty: '{place} cell, empty',
    cellFilled: '{place} cell: {part}',
    shape: 'Cells: {places}',
    fit: 'Kanji that fit: {n}',
    fitHead: 'fit',
    fitTitle: 'How many kanji still fit',
    placeTabs: 'Parts for',
    placeOfSlot: '{n}: {place}',
    palettePlace: 'Parts for {place}',
    frameLabel: 'The kanji so far: {parts}',
    framePart: '{part} {place}',
    frameEmpty: 'no parts found yet',
    frameSolved: 'Solved: {kanji}',
    typeLabel: 'Your guess',
    typePlaceholder: 'Type a kanji',
    guess: 'Guess',
    chosen: '{kanji}: {meaning}. Tap it again to guess.',
    stripHint: 'Tap parts to see the kanji they make.',
    matches: '{n} kanji',
    clear: 'Clear',
    palette: 'Parts',
    strokes: '{n} strokes',
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
      hit: 'in the answer',
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
        mode: 'Not in this mode.',
        unknown: 'Not in this mode.'
      }
    },
    errors: {
      empty: 'Pick a kanji first.',
      slots: 'Fill all {cells} cells first.',
      'not-real': 'No kanji has those parts in those places. Try another mix.',
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
    practice: 'Play practice',
    again: 'Play again'
  },

  share: {
    daily: 'Kanjiru {numeral} #{puzzle} {level} {score}{hints}',
    practice: 'Kanjiru {numeral} practice {level} {score}{hints}'
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
    minLength: '{n}+ kanji modes',
    have: 'You have {n}'
  },

  settings: {
    open: 'Settings',
    title: 'Settings',
    close: 'Close'
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
    k1: { name: 'One kanji' },
    k2: { name: 'Two kanji' },
    k3: { name: 'Three kanji' },
    k4: { name: 'Four kanji' }
  },

  level: {
    easy: { name: 'Easy', desc: 'Guess kanji. The parts you pick list the kanji they make, with meanings, and the meaning shows for free after a few guesses.' },
    normal: { name: 'Normal', desc: 'Guess parts: each cell is a place in the kanji, so parts go green in place and yellow out of place. No kanji list or free meaning; fewer parts, and a count of the kanji that still fit.' },
    hard: { name: 'Hard', desc: 'Like Normal, but every guess must be a real kanji, from all the parts, with no count.' }
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
      desc: 'Marks one part of the answer green.'
    },
    'head-start': {
      name: 'Head start',
      desc: 'Reveals 2 parts before your first guess.'
    },
    'extra-guess': {
      name: 'Extra guess',
      desc: 'Adds one more row.'
    },
    'reveal-kanji': {
      name: 'Reveal a kanji',
      desc: 'Fills in one whole kanji of the word.'
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
