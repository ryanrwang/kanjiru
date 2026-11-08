/*
 * 日本語の表示テキスト。キーは en.js と同じにすること。
 * {name} の部分は t(key, { name: … }) で置き換わる。
 */
export default {
  meta: {
    description: 'パーツから漢字を当てる、毎日のパズル。'
  },

  header: {
    schemeDark: 'ダークモードにする',
    schemeLight: 'ライトモードにする',
    schemeFixed: 'このきせかえは配色が1つだけです',
    shop: 'ショップ',
    wallet: '所持ポイント {amount}。ショップを開く'
  },

  currency: {
    name: '小判',
    amount: '{n}pt'
  },

  hero: {
    title: 'パーツからことばを当てよう。',
    hit: '正しいパーツ・正しい位置',
    near: '正しいパーツ・ちがう位置',
    miss: '答えにないパーツ',
    // パーツを書き順に（今はすべてのレベル）
    partsBody: 'ことばのパーツを書き順にマスへ入れます。どこで漢字が切れるかも考えます。そのマスなら緑、ことばの別の場所にあれば黄、ことばになければ灰色になります。'
  },

  play: {
    title: 'プレイ',
    note: '毎日新しい一問、そのあとは好きなだけ',
    meta: '{guesses}回まで・ポイント×{mult}',
    soon: '近日公開',
    loading: '読み込み中…',
    loadFailed: 'ゲームを読み込めませんでした。通信状況を確認して、再読み込みしてください。',
    practiceOnly: 'デイリーはまだありません。もっと遊べます',
    dailyNew: 'デイリー #{n}',
    dailyStarted: 'デイリー #{n}・{level}・{guesses}回回答済み',
    dailyWon: 'デイリー #{n}・{level}・{guesses}回でクリア ✓',
    dailyLost: 'デイリー #{n}・{level}・クリアならず',
    levelNow: '{level}で遊んでいます。むずかしいとガイドは設定にあります。',
    levelChange: '設定',
    daily: 'プレイ',
    continue: '続ける',
    result: '結果',
    practice: 'もっと遊ぶ'
  },

  game: {
    home: 'スタートに戻る',
    daily: 'デイリー #{n}',
    practice: 'もっと遊ぶ',
    kindLevel: '{kind}・{level}',
    listSep: '、',
    // 意味は辞書の英語なので、英語の区切り
    meaningSep: ', ',
    layoutSep: '・',
    board: 'あなたの回答',
    rowLabel: '{n}回目：{word}。{parts}',
    rowLabelParts: '{n}回目：{parts}',
    rowLabelFit: '{label}。{fit}',
    cells: '次の回答：{cells}マス中{n}マス',
    cellEmpty: '{cell}（空）',
    cellFilled: '{cell}：{part}',
    cellShown: '{cell}：{part}（ヒントで表示）',
    cellNumber: '{n}マス目',
    cellPlace: '{n}マス目（{place}）',
    shape: 'マス：{places}',
    fit: '当てはまる漢字：{n}',
    fitTitle: '当てはまる漢字の数',
    fitCount: '候補{n}',
    placeOfSlot: '{n}字目の{place}',
    palettePlace: '{place}のパーツ',
    frameLabel: 'ここまでの漢字：{parts}',
    framePart: '{place}に{part}',
    frameEmpty: 'まだパーツなし',
    frameSolved: '正解：{kanji}',
    guess: '回答',
    delete: '消す',
    palette: 'パーツ',
    soon: 'このモードは近日公開です（単語の確認待ち）。',
    on: '音',
    kun: '訓',
    mark: {
      hit: '位置も正しい',
      near: '位置がちがう',
      other: '別の字にある',
      miss: '答えにない'
    },
    markParts: {
      hit: 'この字にある',
      other: '別の字にある',
      miss: '答えにない'
    },
    clue: {
      meaning: '意味',
      free: '無料',
      meaningSoon: '{n}回目の回答のあと、意味が無料で表示されます。',
      reading: '読み',
      strokes: '画数',
      layout: '構成',
      parts: 'パーツ',
      kanji: '漢字',
      eliminated: 'おそうじ',
      eliminatedCount: '下のパーツを{n}個グレーにしました'
    },
    powers: {
      title: 'ヒント',
      titleHeld: 'ヒント（所持 {n}）',
      buy: '1つ買う・{cost}pt',
      bought: '買いました。所持数 {n}。',
      use: '使う',
      cancel: 'キャンセル',
      used: '{name}を使いました。',
      why: {
        none: '持っていません。ここで買うか、クリアするとボーナスでもらえることがあります。',
        before: '最初の回答の前だけ使えます。',
        during: '最初の回答のあとだけ使えます。',
        useless: '新しくわかることがありません。',
        over: 'ゲームは終了しました。',
        mode: '{n}字以上の答えだけで使えます。',
        unknown: 'このモードでは使えません。'
      }
    },
    errors: {
      slots: '{cells}マスすべてを埋めてください。',
      'not-real': 'その順番のパーツでは実在する漢字になりません。別の組み合わせを試してください。',
      'keep-shown': '{part}は{cell}マス目のままです。ヒントでそこに表示されました。',
      'keep-hit': '{part}は{cell}マス目のままです。そこで見つけました。',
      'use-near': '{part}を使ってください。ことばの中にあります。',
      level: 'このレベルではその答え方はできません。',
      over: 'ゲームは終了しました。',
      length: '答えは{n}字です。',
      'not-kanji': '常用漢字で回答してください。',
      'not-in-palette': 'このパズルにないパーツを含む漢字です。',
      repeat: 'その漢字はもう回答しました。',
      'not-a-word': '単語ではありません。'
    }
  },

  pos: {
    left: '左',
    right: '右',
    top: '上',
    bottom: '下',
    outer: '外',
    inner: '内',
    whole: '全体',
    none: '交差'
  },

  // 狭いマスの上の場所名（日本語は一字なので同じ）
  posShort: {
    left: '左',
    right: '右',
    top: '上',
    bottom: '下',
    outer: '外',
    inner: '内',
    whole: '全体',
    none: '交差'
  },

  result: {
    won: '{n}回でクリア！',
    lost: '回答回数を使い切りました',
    parts: 'パーツ',
    points: 'ポイント',
    pointsEarned: '+{n}pt',
    pointsWhy: 'パーツ {parts} + クリア {solve}、×{mult}',
    rewards: 'ごほうび',
    balance: '所持 {icon} {n}pt',
    streak: 'デイリー連続記録',
    streakDays: '{n}日連続',
    share: 'シェア',
    copied: 'コピーしました。好きな場所に貼り付けてください。',
    copyManually: '上のテキストを選択して、コピーしてください。',
    nextDaily: '次のデイリーまで',
    practice: 'もっと遊ぶ',
    again: '次の問題'
  },

  share: {
    daily: '漢じる {numeral} #{puzzle} {level} {score}{hints}',
    practice: '漢じる {numeral} {level} {score}{hints}'
  },

  looks: {
    title: 'きせかえ',
    note: '色・タイル・演出を組み合わせよう',
    lockPoints: '🔒 {cost}pt',
    lockAchievement: '🔒 {name}',
    buyHint: 'ショップで{cost}ptで購入',
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
    minLength: '{n}字以上の答え',
    have: '所持数 {n}'
  },

  shop: {
    open: 'ショップ',
    title: 'ショップ',
    close: '閉じる',
    intro: 'ポイントは遊ぶと貯まります。見つけたパーツ、クリア、連続記録、実績で。ここで使えます。',
    hints: 'ヒント',
    looks: '見た目',
    buy: '買う',
    confirm: '{name}に{cost}ptを使いますか？　所持{have}pt、残りは{left}ptになります。',
    confirmYes: '{cost}ptで買う',
    cancel: 'キャンセル',
    have: '所持 {n}／{hold}',
    full: '持てるのは{hold}つまでです',
    short: 'あと{n}pt必要',
    soon: '近日公開',
    owned: '入手済み',
    ownedSoon: '入手済み・近日公開',
    inUse: '使用中',
    use: '使う',
    using: '{name}にしました。',
    byAchievement: '実績',
    earn: '「{name}」：{desc}',
    bought: '{name}を買いました（所持 {n}）。残り{left}pt。',
    boughtSkin: '{name}を手に入れました。残り{left}pt。'
  },

  reward: {
    points: '+{n}pt',
    spent: '−{n}pt',
    hint: '{icon} {name}',
    hints: '{icon} {name} ×{n}',
    sep: '・',
    streak: '{n}日連続！',
    drop: 'ボーナスヒント',
    achievement: '実績：{name}',
    unlocks: '{name}を解放'
  },

  achievements: {
    title: '実績',
    note: '{total}個中{n}個獲得',
    earned: '{date}に獲得',
    progress: '{n}／{goal}',
    best: 'これまでの最高：{n}'
  },

  toast: {
    dismiss: '閉じる'
  },

  settings: {
    game: {
      title: 'ゲーム',
      body: '次の問題と、まだ始めていない問題に使われます。'
    },
    hard: {
      name: 'むずかしい',
      body: '毎回実在する漢字を作り、見つけたヒントを使います。緑はそのまま、見つけたパーツはまた使います。ポイント×{mult}。'
    },
    guided: {
      name: 'ガイド',
      body: '漢字の切れ目と位置、漢字ごとの枠を表示し、そのマスに入らないパーツを薄くします。ポイント×{mult}。'
    },
    open: '設定',
    title: '設定',
    close: '閉じる'
  },

  transfer: {
    intro: '進行状況はこのブラウザに保存されています。別の端末で遊ぶときは、データを引き継げます。',
    notSaving: 'このブラウザは進行状況を保存していません（プライベートブラウズ？）。受け取ったデータは、ページを閉じるまでしか残りません。',
    send: {
      title: '別の端末へ送る',
      body: '1回だけ使える引き継ぎコードを発行して、別の端末で入力してください。',
      button: 'コードを発行',
      again: '新しいコードを発行',
      busy: '発行中…',
      codeLabel: '引き継ぎコード：{code}',
      expires: '1回限り・残り {time}',
      expired: 'コードの有効期限が切れました。新しいコードを発行してください。'
    },
    receive: {
      title: '別の端末から受け取る',
      body: '別の端末で設定を開いて「コードを発行」をタップし、表示されたコードをここに入力してください。',
      label: '引き継ぎコード',
      placeholder: 'コード',
      button: '受け取る',
      busy: '受け取り中…'
    },
    ask: {
      title: 'この端末にも進行状況があります。どうしますか？',
      merge: '両方をまとめる',
      mergeDesc: '両方の端末のプレイ記録を残し、連続記録を数え直します。ポイントとアイテムは両方の分を合わせます。',
      replace: 'この端末を上書き',
      replaceDesc: 'この端末の進行状況は消えます。',
      cancel: 'キャンセル'
    },
    done: {
      received: '進行状況を受け取りました。',
      merged: '進行状況をまとめました。両方の端末のプレイ記録が残っています。'
    },
    text: {
      title: 'セーブテキスト（バックアップ）',
      body: 'セーブデータ全体をテキストにします。安全な場所に保存しておくか、貼り付けて読み込めます。コードは不要です。',
      copy: 'セーブテキストをコピー',
      paste: 'セーブテキストを貼り付け',
      load: '読み込む',
      copied: 'コピーしました。安全な場所に貼り付けて保存してください。',
      copyManually: '上のテキストを選択して、コピーしてください。',
      copyLabel: 'あなたのセーブテキスト',
      pasteLabel: 'ここにセーブテキストを貼り付け'
    },
    errors: {
      offline: 'サーバーに接続できませんでした。通信状況を確認して、もう一度お試しください。',
      server: 'サーバーでエラーが発生しました。少し待ってから、もう一度お試しください。',
      method: 'エラーが発生しました。もう一度お試しください。',
      'bad-request': 'エラーが発生しました。もう一度お試しください。',
      'too-large': 'セーブデータが大きすぎて、コードでは送れません。セーブテキストを使ってください。',
      'bad-save': 'セーブデータを読み取れませんでした。セーブテキストを使ってください。',
      'bad-code': '別の端末に表示されたコードを入力してください。',
      'not-found': 'このコードは見つかりません。確認するか、新しいコードを発行してください（コードは1回限りです）。',
      expired: 'コードの有効期限が切れています。別の端末で新しいコードを発行してください。',
      'rate-limited': '試行回数が多すぎます。しばらく待ってから、もう一度お試しください。',
      'not-a-save': '漢じるのセーブデータではありません。',
      'newer-version': '新しいバージョンの漢じるのセーブデータです。このページを再読み込みしてから、もう一度送ってください。'
    }
  },

  mode: {
    main: { name: '漢じる' },
    k1: { name: '漢字一字' },
    k2: { name: '二字熟語' },
    k3: { name: '三字熟語' },
    k4: { name: '四字熟語' }
  },

  level: {
    easy: { name: 'かんたん', desc: 'パーツで作れる漢字の一覧から、漢字で答えます。（終了）' },
    normal: { name: 'ふつう', desc: 'ことばのパーツを書き順にマスへ。どこで漢字が切れるかも考えます。' },
    hard: { name: 'むずかしい', desc: '毎回実在する漢字を作り、見つけたヒントを使います。緑はそのまま、見つけたパーツはまた使います。' },
    guided: { name: 'ガイド', desc: '漢字ごとのマスと位置、漢字ごとの枠と当てはまる数を表示し、そのマスに入らないパーツを薄くします。' },
    'guided-hard': { name: 'ガイド・むずかしい', desc: 'ガイドとむずかしいの両方。' }
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
      desc: '答えのパーツを1つ、そのマスに緑で入れます。'
    },
    'head-start': {
      name: 'スタートダッシュ',
      desc: '最初の回答の前に、パーツを2つそのマスに緑で入れます。'
    },
    'extra-guess': {
      name: 'もう一回',
      desc: '回答できる回数を1回増やします。'
    },
    'reveal-kanji': {
      name: '漢字公開',
      desc: '熟語の漢字を1字まるごと緑で入れます。'
    }
  },

  achievement: {
    'first-win': { name: 'はじめの一字', desc: '初めてパズルを解く。' },
    'streak-7': { name: '一週間', desc: 'デイリーを7日連続で解く。' },
    'streak-30': { name: '一か月', desc: 'デイリーを30日連続で解く。' },
    'sharp-eye': { name: '慧眼', desc: '2回以内で解く。' },
    unaided: { name: '独力', desc: 'ヒントなしでクリアする。' },
    'hard-win': { name: '難関突破', desc: 'ハードをオンにしてパズルを解く。' },
    'collector-50': { name: 'コレクター', desc: '50種類の漢字を解く。' },
    'full-set': { name: '全制覇', desc: '1日ですべての長さのデイリーを解く。' }
  }
};
