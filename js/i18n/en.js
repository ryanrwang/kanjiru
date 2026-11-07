/*
 * English interface text. This file is the reference: every key here must
 * exist in every other language file (validate() warns when one is missing).
 * {name} placeholders are filled in by t(key, { name: … }).
 * Catalogue text is keyed by the catalogue id: mode.<id>, skin.<slot>.<id>,
 * power.<id>, achievement.<id>.
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
    miss: 'Not in the answer'
  },

  play: {
    title: 'Play',
    note: 'Game screen coming next',
    meta: '{guesses} guesses · ×{mult} pts'
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

  mode: {
    k1: { name: 'One kanji' },
    k2: { name: 'Two kanji' },
    k3: { name: 'Three kanji' },
    k4: { name: 'Four kanji' }
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
