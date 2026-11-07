/*
 * 日本語の表示テキスト。キーは en.js と同じにすること。
 * {name} の部分は t(key, { name: … }) で置き換わる。
 */
export default {
  meta: {
    description: 'パーツから漢字を当てる、毎日のパズル。'
  },

  header: {
    points: '所持ポイント',
    schemeDark: 'ダークモードにする',
    schemeLight: 'ライトモードにする',
    schemeFixed: 'このきせかえは配色が1つだけです'
  },

  currency: {
    name: '小判',
    amount: '{n}pt'
  },

  hero: {
    title: 'パーツから漢字を当てよう。',
    body: '答えるたびに、パーツの色でヒントがわかります。',
    hit: '正しいパーツ・正しい位置',
    near: '正しいパーツ・ちがう位置',
    miss: '答えにないパーツ'
  },

  play: {
    title: 'プレイ',
    note: 'ゲーム画面は準備中',
    meta: '{guesses}回まで・ポイント×{mult}'
  },

  looks: {
    title: 'きせかえ',
    note: '色・タイル・演出を組み合わせよう',
    lockPoints: '🔒 {cost}pt',
    lockAchievement: '🔒 {name}',
    buyHint: '{cost}ポイントで購入（ショップは準備中）',
    achievementHint: '解除条件：{desc}'
  },

  powers: {
    title: 'ヒントとアイテム',
    note: '遊んで獲得、またはポイントで購入',
    cost: '{cost}pt',
    earnedOnly: '獲得のみ',
    whenBoth: 'ゲーム前・ゲーム中に使える',
    whenBefore: '最初の回答の前に使える',
    whenDuring: 'ゲーム中に使える',
    minLength: '{n}字以上のモード',
    have: '所持数 {n}'
  },

  mode: {
    k1: { name: '漢字一字' },
    k2: { name: '二字熟語' },
    k3: { name: '三字熟語' },
    k4: { name: '四字熟語' }
  },

  slot: {
    theme: 'カラー',
    tiles: 'タイルの演出',
    effect: 'クリア演出'
  },

  skin: {
    theme: {
      default: 'クラシック',
      ai: '藍',
      matcha: '抹茶',
      sakura: '桜',
      urushi: '漆',
      kinpaku: '金箔'
    },
    tiles: {
      flip: 'めくり',
      ink: 'にじみ墨',
      stamp: 'はんこ'
    },
    effect: {
      none: 'なし',
      draw: '筆書き',
      petals: '花びら',
      hanabi: '花火'
    }
  },

  power: {
    strokes: {
      name: '画数',
      desc: '答えの画数がわかります。'
    },
    layout: {
      name: '構成',
      desc: '形がわかります：左右・上下・囲み。'
    },
    meaning: {
      name: '意味',
      desc: '英語の意味がわかります。'
    },
    reading: {
      name: '読み',
      desc: '読み方がわかります。'
    },
    sweep: {
      name: 'おそうじ',
      desc: '答えにないパーツを10個消します。'
    },
    'reveal-part': {
      name: 'パーツ公開',
      desc: '答えのパーツを1つ緑にします。'
    },
    'head-start': {
      name: 'スタートダッシュ',
      desc: '最初の回答の前にパーツを2つ公開します。'
    },
    'extra-guess': {
      name: 'もう一回',
      desc: '回答できる回数を1回増やします。'
    },
    'reveal-kanji': {
      name: '漢字公開',
      desc: '熟語の漢字を1字まるごと公開します。'
    }
  },

  achievement: {
    'first-win': { name: 'はじめの一字', desc: '初めてパズルを解く。' },
    'streak-7': { name: '一週間', desc: 'デイリーを7日連続で解く。' },
    'streak-30': { name: '一か月', desc: 'デイリーを30日連続で解く。' },
    'sharp-eye': { name: '慧眼', desc: '2回以内で解く。' },
    unaided: { name: '独力', desc: 'ヒントなしでクリアする。' },
    'collector-50': { name: 'コレクター', desc: '50種類の漢字を解く。' },
    'full-set': { name: '全制覇', desc: '1日ですべての長さのデイリーを解く。' }
  }
};
