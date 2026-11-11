/*
 * 日本語の表示テキスト。キーは en.js と同じにすること。
 * {name} の部分は t(key, { name: … }) で置き換わる。
 */
export default {
  meta: {
    description: 'パーツからことばを当てる漢字パズル。'
  },

  header: {
    home: 'プレイ',
    points: 'ポイント',
    wallet: '所持ポイント {amount}。ポイントを開く',
    game: 'プレイ',
    hints: 'ヒント（所持 {n}）。ヒントを開く',
    close: '閉じる'
  },

  currency: {
    name: '小判',
    amount: '{n}pt',
    unit: 'pt'
  },

  // 遊び方（プレイページの最初）：例で説明
  howto: {
    title: '遊び方',
    lead: 'パーツからことばを当てよう。',
    body: 'ことばのパーツを書き順にマスへ入れます。どこで漢字が切れるかも考えます。そのマスなら緑、ことばの別の場所にあれば黄、ことばになければ灰色になります。',
    hit: '正しいパーツ・正しい位置',
    near: '正しいパーツ・ちがう位置',
    miss: '答えにないパーツ',
    // ミニゲームの下の説明（一段階ずつ）
    step: {
      type: 'パーツをタップして、書き順にマスを埋めます。',
      colours: '緑：正しいマス。黄：ことばの別の場所。灰：ことばにない。',
      use: '色をヒントに次の回答を。',
      closer: '3つ正解。2つはことばの別のマスにあります。',
      split: 'どこで漢字が切れるかも考えよう。',
      solved: '正解：{answer}。チャンスは6回。'
    }
  },

  // 遊んだゲームの一覧（プレイカードの下）
  history: {
    title: '漢じた',
    count: '{n}回プレイ・{won}回クリア',
    won: '{n}回でクリア',
    lost: 'クリアならず',
    gaveUp: 'ギブアップ',
    more: 'さらに{n}件表示',
    delete: '削除',
    deleteLabel: '{answer}を削除',
    deleteTitle: 'このゲームを削除しますか？',
    deleteBody: '{answer}が記録と成績から消えます。元には戻せません。',
    deleteYes: 'ゲームを削除',
    deleteDesc: 'もらったポイント・ヒント・実績はそのままです。',
    deleted: '{answer}を削除しました。'
  },

  // プレイカード：ゲーム（デイリーのあるモードでは今日のデイリー）、むずかしい・ガイドのスイッチ、遊ぶ
  play: {
    gaveUp: 'あきらめました。答えは「{answer}」でした。',
    soon: '近日公開',
    loading: '読み込み中…',
    loadFailed: 'ゲームを読み込めませんでした。通信状況を確認して、再読み込みしてください。',
    practiceOnly: 'デイリーはまだありません。もっと遊んでポイントを貯めよう。',
    daily: 'デイリー #{n}',
    ready: '今日のことばをパーツから当てよう。チャンスは{rows}回。',
    readyAny: 'ことばをパーツから当てよう。チャンスは{rows}回。',
    going: '{rows}回中{n}回回答・{level}',
    won: '{n}回でクリア ✓・{level}',
    lost: '今日はクリアならず・{level}',
    level: 'レベル',
    mult: 'ポイント×{mult}',
    hard: {
      name: 'むずかしい',
      body: '実在する漢字だけ。見つけたパーツはそのまま使う。'
    },
    guided: {
      name: 'ガイド',
      body: '漢字の切れ目と、どこに何が入るかを表示。'
    },
    start: 'プレイ',
    continue: '続ける',
    result: '結果を見る',
    more: 'もう一度遊ぶ',
    nextDaily: '次のデイリーまで'
  },

  game: {
    home: 'スタートに戻る',
    listSep: '、',
    // 意味は辞書の英語なので、英語の区切り
    meaningSep: ', ',
    layoutSep: '・',
    board: 'あなたの回答',
    rowLabel: '{n}回目：{word}。{parts}',
    rowLabelParts: '{n}回目：{parts}',
    cells: '次の回答：{cells}マス中{n}マス',
    cellEmpty: '{cell}（空）',
    cellFilled: '{cell}：{part}',
    cellShown: '{cell}：{part}（ヒントで表示）',
    cellGhost: '{cell}（空）：ヒントで{part}が表示されました。もう一度タップで入れます',
    cellNumber: '{n}マス目',
    cellPlace: '{n}マス目（{place}）',
    shape: 'マス：{places}',
    placeOfSlot: '{n}字目の{place}',
    palettePlace: '{place}のパーツ',
    frameLabel: 'ここまでの漢字：{parts}',
    framePart: '{place}に{part}',
    frameEmpty: 'まだパーツなし',
    frameUnknown: 'まだ何もわかっていません',
    frameSolved: '正解：{kanji}',
    guess: '回答',
    delete: '消す',
    palette: 'パーツ',
    keysHelp: '矢印キーでパーツを移動。EnterかSpaceで選んだマスに入れ、Backspaceで消します。',
    cellsHelp: '左右の矢印キーでマスを選びます。',
    debugCells: '答えの{cells}マス目',
    soon: 'このモードは近日公開です（単語の確認待ち）。',
    on: '音',
    kun: '訓',
    mark: {
      hit: '位置も正しい',
      near: '位置がちがう',
      other: '別の字にある',
      miss: '答えにない'
    },
    way: {
      left: 'もっと左',
      right: 'もっと右'
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
      strokesN: '{n}画',
      again: 'タップでもう一度見る',
      guide: '漢字',
      layout: '構成'
    },
    powers: {
      title: 'ヒント',
      use: '使う',
      back: '戻る',
      close: '閉じる',
      count: '×{n}',
      free: '無料',
      freeLabel: 'デバッグモードでは無料',
      freeNote: 'デバッグモードでは無料。ヒントは減りません。',
      held: '所持数 {n}',
      confirmUse: '{name}を使いますか？',
      confirmUseYes: '使う',
      left: '所持{n}。使うと残り{left}になります。',
      used: '{name}を使いました。',
      swept: '答えにないパーツを{n}個おそうじしました。',
      pointed: '黄色のマス{n}個に、パーツのある方向の矢印が出ました。',
      pointLater: 'これから黄色のマスに、パーツのある方向の矢印が出ます。',
      bought: '買いました。所持数 {n}。',
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
    // ヒントを使ったときの表示（js/play/reveal.js）
    reveal: {
      kanji: '{n}字目',
      done: 'OK'
    },
    // 途中で終える：ゲーム中のヘッダーの旗
    end: {
      open: 'ゲームを終える',
      title: 'このゲームを終えますか？',
      giveUp: 'あきらめる',
      giveUpDesc: '答えを見ます。負けになります。',
      new: '新しい問題',
      newDesc: 'この問題は記録されません。',
      skipped: '新しい問題です。前の問題は記録されません。',
      gaveUp: 'あきらめました。答えはこちら。'
    },
    errors: {
      slots: '{cells}マスすべてを埋めてください。',
      'not-real': 'その順番のパーツでは実在する漢字になりません。別の組み合わせを試してください。',
      'keep-shown': '{part}は{cell}マス目に入ります。ヒントでそこに表示されました。',
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
    gaveUp: 'ギブアップ',
    parts: 'パーツ',
    points: 'ポイント',
    pointsEarned: '+{n}pt',
    pointsWhy: 'パーツ {parts} + クリア {solve}、×{mult}',
    rewards: 'ごほうび',
    balance: '所持 {icon} {n}pt',
    spend: 'ポイントを使う',
    streak: '連勝',
    streakDays: '{n}回連続',
    share: 'シェア',
    copied: 'コピーしました。好きな場所に貼り付けてください。',
    copyManually: '上のテキストを選択して、コピーしてください。',
    nextDaily: '次のデイリーまで',
    practice: 'もう一度遊ぶ',
    again: '新しいゲーム',
    done: '閉じる',
    source: '意味と読みはJMdictとKANJIDIC（EDRDG）より。',
    credits: 'クレジット'
  },

  share: {
    daily: '漢じる {numeral} #{puzzle} {level} {score}{hints}',
    practice: '漢じる {numeral} {level} {score}{hints}'
  },

  // ポイントページ：上に所持ポイント
  points: {
    title: 'ポイント',
    wallet: '所持ポイント',
    hints: '所持ヒント',
    streak: '連勝',
    achievements: '実績',
    of: '{total}個中{n}個'
  },

  looks: {
    title: 'きせかえ',
    note: '色・タイル・演出を組み合わせよう',
    lockPoints: '{cost}pt',
    lockAchievement: '{name}',
    locked: 'ロック中',
    inUse: '使用中'
  },

  powers: {
    title: 'ヒントとアイテム',
    note: 'ゲームの中で使えます',
    earnedOnly: '獲得のみ',
    whenBoth: 'ゲーム前・ゲーム中に使える',
    whenBefore: '最初の回答の前に使える',
    whenDuring: 'ゲーム中に使える',
    minLength: '{n}字以上の答え',
    have: '所持数 {n}'
  },

  // 購入（ポイントページと、ゲーム中のヒントシート）
  shop: {
    buyFor: '買う・{cost}pt',
    // ヒントの購入ボタンは値段だけ。読み上げではこう呼ぶ
    buyLabel: '{name}を{cost}ptで買う',
    confirm: '{name}に{cost}ptを使いますか？　所持{have}pt、残りは{left}ptになります。',
    confirmTitle: '{name}を買いますか？',
    confirmYes: '{cost}ptで買う',
    cancel: 'キャンセル',
    dontAsk: '次からヒントを買うときに確認しない',
    have: '所持 {n}/{hold}',
    full: '持てるのは{hold}つまでです',
    short: 'あと{n}pt必要',
    soon: '近日公開',
    owned: '入手済み',
    ownedSoon: '入手済み・近日公開',
    byAchievement: '実績',
    earn: '「{name}」：{desc}',
    bought: '{name}を買いました（所持 {n}）。残り{left}pt。',
    boughtSkin: '{name}を手に入れて、使用中にしました。残り{left}pt。'
  },

  reward: {
    points: '+{n}pt',
    spent: '−{n}pt',
    hint: '{icon} {name}',
    hints: '{icon} {name} ×{n}',
    sep: '・',
    streak: '{n}連勝！',
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

  // 取り消せない操作の前の確認
  confirm: {
    cancel: 'キャンセル',
    close: '閉じる',
    step: 'ステップ {n}/{of}'
  },

  toast: {
    dismiss: '閉じる'
  },

  settings: {
    open: '設定',
    title: '設定',
    language: '言語',
    scheme: {
      title: '外観',
      auto: '自動',
      light: 'ライト',
      dark: 'ダーク',
      fixed: '{name}は配色が1つだけです。'
    },
    hints: {
      title: 'ヒント',
      name: '買う前に確認する',
      body: 'ヒントを買うとき、値段と残りのポイントを表示して確認します。'
    },
    debug: {
      title: 'デバッグ',
      name: 'デバッグモード',
      body: 'テスト用：ゲームのキーに番号付きの点で答えを書き順に表示し、ゲーム中のヒントはすべて無料になります。',
      unlocked: 'デバッグモードをオンにしました。',
      locked: 'デバッグモードをオフにしました。'
    }
  },

  welcome: {
    lang: {
      title: 'Language · 言語',
      play: '日本語で遊ぶ',
      later: 'あとで'
    },
    langTip: {
      body: '言語はいつでも設定から変えられます。',
      close: '案内を閉じる'
    },
    tip: {
      title: 'ウェルカムボーナス',
      button: 'ヒントを買う',
      later: 'あとで'
    }
  },

  // ホーム画面に追加（js/install.js）：プレイページのヒントと設定の項目
  // やり直す（設定）：実績のリセット、すべてのデータの削除（3段階の確認、最後は入力）
  reset: {
    title: 'やり直す',
    achievements: {
      name: '実績をリセット',
      note: '実績をゼロから取り直します。ゲーム、ポイント、ヒント、購入した見た目はそのままです。',
      button: '実績をリセット',
      title: '実績をリセットしますか？',
      body: 'すべての実績が未達成に戻り、これから遊ぶゲームだけが数えられます。',
      keep: 'ゲーム、ポイント、ヒント、購入した見た目はそのままです。受け取った報酬は二度はもらえません。実績で解除した見た目は、もう一度達成するまでロックされます。',
      confirm: '実績をリセット',
      confirmDesc: 'ゼロから取り直す。',
      done: '実績をリセットしました。遊んでもう一度達成しよう。'
    },
    all: {
      name: 'すべてのデータを削除',
      note: 'この端末のゲーム、ポイント、ヒント、見た目、実績をすべて削除します。3段階で確認します。',
      button: 'すべてのデータを削除',
      title1: 'すべての進行状況を削除しますか？',
      body1: 'この端末に保存されたKanjiruのデータをすべて削除します：',
      counts: '遊んだゲーム{games}回、{points}pt、ヒント{hints}個、実績{achievements}個、購入した見た目すべて。',
      stays: '言語とライト・ダークの設定はそのままです。',
      next: '続ける',
      nextDesc: '削除の前に、あと2段階あります。',
      title2: '本当によろしいですか？',
      body2: 'この操作は取り消せません。コピーがなければ、進行状況は元に戻せません。',
      backup: 'コピーを残すには、キャンセルして「進行状況を移す」のセーブテキストをコピーしてください。',
      sure: 'はい、削除します',
      title3: '{word} と入力して削除',
      word: '削除',
      typeLabel: '確認のことば',
      typeHint: '下に {word} と入力',
      delete: 'すべて削除',
      done: 'すべての進行状況を削除しました。最初からスタートです。'
    }
  },

  install: {
    title: 'ホーム画面に漢じるを追加',
    why: {
      ios: 'Safariは、7日間アクセスのないサイトの保存データを消去します。ホーム画面から開けば消えません。',
      android: 'アプリのように全画面で開き、進行状況もそのまま使えます。',
      other: 'スマホではアプリのように開けます。iPhoneでは、7日間アクセスがないとSafariが保存データを消すので、追加すると安心です。'
    },
    ios: {
      name: 'iPhone・iPad',
      share: 'Safariで共有ボタンをタップします（iOS 26では「⋯」の中）。',
      add: '「ホーム画面に追加」をタップし、「追加」をタップします。',
      move: 'ホーム画面の漢じるは、最初はデータがありません。進行状況を移すには、ここの設定で「コードを発行」し、アプリの設定でそのコードを入力します。'
    },
    android: {
      name: 'Android',
      menu: 'Chromeで「⋮」をタップし、「ホーム画面に追加」または「アプリをインストール」を選びます。',
      keeps: '進行状況はそのまま引き継がれます。'
    },
    button: 'インストール',
    later: '今はしない',
    backup: '下のセーブテキストも、どこで遊ぶ場合でもバックアップになります。',
    tipBackup: '設定のセーブテキストもバックアップになります。'
  },

  // このアプリについて（js/about.js、設定から #about）：EDRDGは専用の画面での表記を求めている
  about: {
    title: 'アプリ情報',
    open: 'アプリ情報・クレジット',
    lead: 'パーツからことばを当てる漢字パズル。Wordleのように遊べます。',
    name: '名前は「感じる」の「感」を、漢字の「漢」にしたものです。',
    by: '制作：Ryan Wang',
    privacy: {
      title: '進行状況',
      body: 'アカウントは不要です。進行状況はこのブラウザにだけ保存されます。引き継ぎコードを発行すると、使われるまで（最長15分）サーバーにコピーが残ります。'
    },
    credits: {
      title: 'クレジット',
      note: 'ありがとうございます',
      edrdg: '漢じるは、JMdictとKANJIDICの辞書ファイルを使用しています。これらのファイルはElectronic Dictionary Research and Development Group（EDRDG）の所有物であり、同グループのライセンスに従って使用しています。',
      data: '漢じるのことばとパーツのデータはこれらを改変したものなので、ソースコードとともにCC BY-SA 4.0で公開しています。'
    },
    source: {
      jmdict: { name: 'JMdict', by: 'EDRDG。JSON化：Dmitry Shpika（jmdict-simplified）', use: 'ことばの表記・読み・英語の意味。' },
      kanjidic: { name: 'KANJIDIC2', by: 'EDRDG', use: '各漢字の意味・読み・画数・使用頻度。' },
      kanjivg: { name: 'KanjiVG', by: 'Ulrich Apelと協力者のみなさん', use: '各漢字のパーツと位置・書き順、一部のフォントにないパーツの字形。' },
      waller: { name: 'JLPTリスト', by: 'Jonathan Waller（JLPT Resources）。JMdictとの対応：Stephen Kraus（yomitan-jlpt-vocab）', use: 'N5〜N3の漢字とことば。答えを学びやすい範囲にするため。' },
      noto: { name: 'Noto Sans JP・Noto Serif JP', by: 'Google', use: 'フォント。' }
    },
    link: {
      project: 'プロジェクトページ',
      edrdg: 'EDRDG',
      licence: 'EDRDGライセンス',
      json: 'jmdict-simplified',
      site: 'tanos.co.uk（アーカイブ）',
      lists: 'yomitan-jlpt-vocab',
      fonts: 'Google Fonts',
      code: 'ソースコード'
    }
  },

  transfer: {
    title: '進行状況を移す',
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
    guided: { name: 'ガイド', desc: '漢字ごとのマスと位置、見つけたパーツが入る漢字ごとの枠を表示し、そのマスに入らないパーツを薄くします。' },
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
      fuji: '藤',
      sumi: '墨',
      urushi: '漆',
      kinpaku: '金箔'
    },
    tiles: {
      flip: 'めくり',
      fade: 'ふわり',
      turn: 'くるり',
      drop: 'ストン',
      wipe: '筆はらい',
      ink: 'にじみ墨',
      shoji: '障子',
      stamp: 'はんこ'
    },
    effect: {
      none: 'なし',
      draw: '筆書き',
      wave: 'なみ',
      confetti: '紙吹雪',
      petals: '花びら',
      glow: '金の光',
      seal: '印',
      hanabi: '花火'
    }
  },

  power: {
    strokes: {
      name: '画数',
      desc: '漢字ごとの画数がわかります。'
    },
    layout: {
      name: '構成',
      desc: '形がわかります：左右・上下・囲み。'
    },
    meaning: {
      name: '意味',
      desc: '答えの意味がわかります。'
    },
    reading: {
      name: '読み',
      desc: '読み方がわかります。'
    },
    arrows: {
      name: '矢印',
      desc: '黄色のマスに矢印が出ます：左か右か。ゲーム中ずっと続きます。'
    },
    sweep: {
      name: 'おそうじ',
      desc: '答えにないパーツを10個消します。'
    },
    'reveal-part': {
      name: 'パーツ公開',
      desc: '答えのパーツを1つ、そのマスに緑で入れます。いつでも使えます。'
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
    regular: { name: '常連', desc: '25問解く。' },
    'streak-7': { name: '一週間', desc: 'デイリーを7日連続で解く。' },
    'streak-30': { name: '一か月', desc: 'デイリーを30日連続で解く。' },
    'win-run-5': { name: '好調', desc: '5問続けて解く。' },
    'win-run-10': { name: '快進撃', desc: '10問続けて解く。' },
    'sharp-eye': { name: '慧眼', desc: '2回以内で解く。' },
    unaided: { name: '独力', desc: 'ヒントなしでクリアする。' },
    'hard-win': { name: '難関突破', desc: 'ハードをオンにしてパズルを解く。' },
    'collector-50': { name: 'コレクター', desc: '50種類の漢字を解く。' },
    'full-set': { name: '全制覇', desc: '1日ですべての長さのデイリーを解く。' }
  }
};
