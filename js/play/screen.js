/*
 * The game screen for one mode's daily or practice game: the board, the
 * hints, the parts picker and, once it's over, the result card.
 *
 *   const screen = openGame(root, { data, engine, glyph, mode, kind, ...callbacks });
 *   screen.refresh();   // after a language change
 *   screen.destroy();   // when leaving
 *
 * Making a guess (docs/DESIGN.md, "Making a guess"): tap parts on the
 * puzzle's palette to narrow the strip of kanji built from them, easiest
 * first (narrow() in js/engine/palette.js). Tapping a kanji puts it in the
 * next row with its meaning; tapping it again, or Guess, makes the guess.
 * A kanji typed with a Japanese keyboard works too.
 *
 * The board keeps the rows already drawn, so a new row's reveal plays once
 * and redrawing the picker never replays it.
 */
import { MODES, POWER } from '../registry.js';
import { t } from '../i18n.js';
import { el } from '../dom.js';
import * as store from '../store.js';
import { narrow } from '../engine/palette.js';
import { MARKS } from '../engine/score.js';
import { stats } from '../engine/stats.js';
import { localDate, answersFor } from '../engine/daily.js';
import * as session from './session.js';
import { renderClues, renderPowerBar, whyNot, openPowerSheet, closePowerSheet } from './hints.js';
import { renderResult } from './result.js';

const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rank = (mark) => MARKS.indexOf(mark);

// callbacks: onHome(), onPractice() (daily → practice), onWallet() (points
// changed), onReload() (a new day: open the route again).
export function openGame(root, ctx) {
  const { data, engine, glyph, mode, kind } = ctx;
  const open = () => (kind === 'practice'
    ? session.openPractice(engine, data, mode)
    : session.openDaily(engine, data, mode));

  let game = open();
  let ui = freshUi();
  let timer = null;
  let resultTimer = null;
  let doneRows = 0;

  // Parts that stay put between redraws.
  let input;
  let guessButton;
  const board = el('div', { class: 'board' });
  const boardDone = el('div', { class: 'board-rows', role: 'list' });
  const boardNext = el('div', { class: 'board-rows' });
  const head = el('div');
  const hints = el('div', { class: 'game-hints' });
  const picker = el('div', { class: 'picker' });
  const message = el('p', { class: 'status-line', role: 'status' });
  const choices = el('div', { class: 'picker-choices' });
  const result = el('div', { class: 'game-result' });
  const live = el('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  board.append(boardDone, boardNext);

  function freshUi() {
    return {
      picked: [],      // palette tiles picked, in order
      entry: '',       // the next guess: tapped in the strip or typed
      message: null,   // { kind: 'error' | 'info', text }
      newRow: -1,      // the row to reveal
      points: game && game.done ? engine.points(game.state) : null
    };
  }

  const state = () => game.state;
  const playing = () => state().status === 'playing';
  const meaningOf = (word) => ([...word].length === 1 && data.kanji[word]
    ? data.kanji[word].meanings.slice(0, 3).join(t('game.meaningSep')) : '');
  const markText = (mark) => t(`game.mark.${mark}`);

  // ── Head ───────────────────────────────────────────────────────────

  function renderHead() {
    const s = state();
    const back = el('button', {
      class: 'icon-btn', type: 'button', title: t('game.home'), 'aria-label': t('game.home'), onclick: ctx.onHome
    });
    back.innerHTML = BACK;
    head.replaceChildren(el('header', { class: 'game-head' },
      back,
      el('h2', { class: 'game-title', id: 'game-title' },
        el('span', {}, t(`mode.${mode.id}.name`)),
        el('span', { class: 'game-kind' }, s.daily ? t('game.daily', { n: s.puzzle }) : t('game.practice'))),
      el('span', { class: 'pill game-count', title: t('game.countTitle') },
        t('game.count', { n: s.guesses.length, rows: s.rows }))));
  }

  // ── Board ──────────────────────────────────────────────────────────

  function tileNode(tile, i) {
    const node = el('span', { class: `tile is-cell is-${tile.mark}`, lang: 'ja' }, glyph(tile.form));
    node.style.setProperty('--i', i);
    return node;
  }

  function rowLabel(g, i) {
    const parts = g.slots.flatMap((slot) => slot.tiles.map((tile) => `${tile.form} ${markText(tile.mark)}`));
    return t('game.rowLabel', { n: i + 1, word: g.word, parts: parts.join(t('game.listSep')) });
  }

  function guessRow(g, i, reveal) {
    let n = 0;
    const tiles = g.slots.map((slot, s) => [
      s ? el('span', { class: 'row-gap' }) : null,
      slot.tiles.map((tile) => tileNode(tile, n++))
    ]);
    const row = el('div', { class: `board-row${reveal ? ' is-new' : ''}`, role: 'listitem', 'aria-label': rowLabel(g, i) },
      el('span', { class: 'row-kanji kanji', lang: 'ja', 'aria-hidden': 'true' }, g.word),
      el('span', { class: 'row-tiles', 'aria-hidden': 'true' }, tiles),
      el('span', { class: 'row-meaning', 'aria-hidden': 'true' }, meaningOf(g.word)));
    if (reveal) setTimeout(() => row.classList.remove('is-new'), revealTime(g));
    return row;
  }

  // The next row: the chosen kanji with its parts, not yet scored. Parts
  // missing from this puzzle's palette are marked, since it can't be guessed.
  function pendingRow() {
    const word = ui.entry;
    const chars = [...word];
    const known = chars.length > 0 && chars.every((ch) => data.kanji[ch]);
    const palette = new Set(state().palette);
    const tiles = known ? chars.flatMap((ch) => data.kanji[ch].parts).map((p) =>
      el('span', { class: `tile is-cell is-pending${palette.has(p.el) ? '' : ' is-absent'}`, lang: 'ja' }, glyph(p.form || p.el))) : [];
    return el('div', { class: 'board-row is-next', 'aria-hidden': 'true' },
      el('span', { class: `row-kanji kanji${word ? '' : ' is-empty'}`, lang: 'ja' }, word),
      el('span', { class: 'row-tiles' }, tiles),
      el('span', { class: 'row-meaning' }, word ? meaningOf(word) : t('game.nextHint')));
  }

  function renderBoard() {
    const s = state();
    boardDone.setAttribute('aria-label', t('game.board'));
    if (doneRows > s.guesses.length) { boardDone.replaceChildren(); doneRows = 0; }
    s.guesses.slice(doneRows).forEach((g, j) => {
      const i = doneRows + j;
      boardDone.append(guessRow(g, i, i === ui.newRow && !reducedMotion()));
    });
    doneRows = s.guesses.length;

    const next = [];
    if (s.status === 'playing') {
      next.push(pendingRow());
      const left = s.rows - s.guesses.length - 1;
      if (left > 0) {
        next.push(el('div', { class: 'board-dots', 'aria-hidden': 'true' },
          Array.from({ length: left }, () => el('span', { class: 'board-dot' }))));
      }
    }
    boardNext.replaceChildren(...next);
  }

  // ── Hints ──────────────────────────────────────────────────────────

  function renderHints() {
    if (!playing()) { hints.replaceChildren(); return; }
    hints.replaceChildren(...[
      renderClues({ engine, state: state(), mode, glyph }),
      renderPowerBar({ engine, state: state(), mode, inventory: store.get().inventory, onPick: pickPower })
    ].filter(Boolean));
  }

  function pickPower(id) {
    const power = POWER[id];
    const held = store.get().inventory[id] || 0;
    openPowerSheet({ power, held, why: whyNot(engine, state(), power, held), onUse: () => usePower(id) });
  }

  function usePower(id) {
    if (!(store.get().inventory[id] > 0)) return;
    const r = engine.usePower(state(), id);
    if (r.error) { say('error', whyNot(engine, state(), POWER[id], 1)); return; }
    session.spendPower(id);
    game = { ...game, state: r.state };
    session.progress(mode, game);
    say('info', t('game.powers.used', { name: t(`power.${id}.name`) }));
    renderHead();
    renderBoard();
    renderHints();
    renderChoices();
  }

  // ── Picker ─────────────────────────────────────────────────────────

  // The best mark each tile has had: guesses, revealed parts, swept parts.
  function knownMarks() {
    const s = state();
    const out = new Map();
    const note = (id, mark) => { if (!out.has(id) || rank(mark) > rank(out.get(id))) out.set(id, mark); };
    s.guesses.forEach((g) => g.slots.forEach((slot) => slot.tiles.forEach((tile) => note(tile.el, tile.mark))));
    const c = engine.clues(s);
    c.parts.forEach((p) => note(p.el, 'hit'));
    c.eliminated.forEach((id) => note(id, 'miss'));
    return out;
  }

  function say(kind, text) {
    ui.message = text ? { kind, text } : null;
    message.className = `status-line${ui.message && ui.message.kind === 'error' ? ' is-error' : ''}`;
    message.textContent = text || '';
  }

  function makeEntry() {
    input = el('input', {
      class: 'entry-input', type: 'text', lang: 'ja',
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'go',
      'aria-label': t('game.typeLabel'), placeholder: t('game.typePlaceholder')
    });
    input.value = ui.entry;
    input.addEventListener('input', () => {
      ui.entry = input.value.trim();
      say(null, '');
      renderBoard();
      renderChoices();
    });
    input.addEventListener('keydown', (event) => {
      // Enter also confirms a Japanese keyboard's conversion: only guess after it.
      if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      submit();
    });
    guessButton = el('button', { class: 'btn btn-primary', type: 'button', onclick: submit }, t('game.guess'));
  }

  function togglePick(id) {
    ui.picked = ui.picked.includes(id) ? ui.picked.filter((x) => x !== id) : [...ui.picked, id];
    renderChoices();
  }

  function choose(ch) {
    if (ui.entry === ch) { submit(); return; }
    ui.entry = ch;
    input.value = ch;
    say('info', t('game.chosen', { kanji: ch, meaning: meaningOf(ch) }));
    renderBoard();
    renderChoices();
  }

  function strip(kanji) {
    if (!ui.picked.length) return el('p', { class: 'strip-hint' }, t('game.stripHint'));
    const guessed = new Set(state().guesses.map((g) => g.word));
    return el('div', { class: 'strip' },
      el('div', { class: 'strip-head' },
        el('span', { class: 'strip-picked', lang: 'ja' }, ui.picked.map((id) => el('span', { class: 'strip-part' }, glyph(id)))),
        el('span', { class: 'strip-count' }, t('game.matches', { n: kanji.length })),
        el('button', {
          class: 'btn btn-ghost btn-small', type: 'button',
          onclick: () => { ui.picked = []; renderChoices(); }
        }, t('game.clear'))),
      el('div', { class: 'strip-kanji' }, kanji.map((ch) => el('button', {
        class: `strip-btn kanji${ch === ui.entry ? ' is-chosen' : ''}`,
        type: 'button', lang: 'ja',
        disabled: guessed.has(ch),
        'aria-pressed': String(ch === ui.entry),
        title: meaningOf(ch),
        onclick: () => choose(ch)
      }, ch))));
  }

  function palette(combine) {
    const known = knownMarks();
    const tileOf = new Map(data.tiles.map((tile) => [tile.id, tile]));
    const groups = [];
    state().palette.forEach((id) => {
      const n = tileOf.get(id).strokes;
      if (!groups.length || groups[groups.length - 1].n !== n) groups.push({ n, ids: [] });
      groups[groups.length - 1].ids.push(id);
    });
    const tileButton = (id) => {
      const tile = tileOf.get(id);
      const picked = ui.picked.includes(id);
      const usable = picked || combine.has(id);
      const mark = known.get(id);
      // The most used other form (氵 for 水) shows small in the corner.
      const variants = tile.forms.filter((f) => f.glyph !== id).sort((a, b) => b.uses - a.uses).slice(0, 1);
      return el('button', {
        class: `tile is-cell palette-tile${mark ? ` is-${mark}` : ''}${usable ? '' : ' is-out'}`,
        type: 'button', lang: 'ja',
        'aria-pressed': String(picked),
        disabled: !usable,
        'aria-label': mark ? `${id} ${markText(mark)}` : id,
        onclick: () => togglePick(id)
      },
        glyph(id),
        variants.length ? el('span', { class: 'palette-variant', 'aria-hidden': 'true' }, variants.map((f) => glyph(f.glyph))) : null);
    };
    return el('div', { class: 'palette', role: 'group', 'aria-label': t('game.palette') },
      groups.map((g) => el('div', { class: 'palette-group' },
        el('span', { class: 'palette-strokes', title: t('game.strokes', { n: g.n }) }, String(g.n)),
        g.ids.map(tileButton))));
  }

  function renderChoices() {
    if (!playing()) { choices.replaceChildren(); return; }
    const { kanji, tiles } = narrow(data, state().palette, ui.picked);
    choices.replaceChildren(strip(kanji), palette(tiles));
  }

  function renderPicker() {
    if (!playing()) { picker.replaceChildren(); return; }
    picker.replaceChildren(
      el('div', { class: 'entry' }, input, guessButton),
      message,
      choices);
    renderChoices();
  }

  // ── Guessing ───────────────────────────────────────────────────────

  function submit() {
    const word = (ui.entry || '').trim();
    if (!word) { say('error', t('game.errors.empty')); return; }
    const r = engine.guess(state(), word);
    if (r.error) { say('error', t(`game.errors.${r.error}`, { n: mode.length })); return; }
    game = { ...game, state: r.state };
    const row = r.state.guesses.length - 1;
    ui.newRow = row;
    ui.picked = [];
    ui.entry = '';
    input.value = '';
    say(null, '');
    live.textContent = rowLabel(r.state.guesses[row], row);

    if (playing()) session.progress(mode, game);
    else finish();

    renderHead();
    renderBoard();
    ui.newRow = -1;
    renderHints();
    renderPicker();
    const shown = boardDone.lastElementChild;
    if (shown) shown.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    // The result waits for the last row's reveal.
    if (!playing()) {
      const wait = reducedMotion() ? 0 : revealTime(r.state.guesses[row]);
      resultTimer = setTimeout(renderResultCard, wait);
    }
  }

  function revealTime(g) {
    const ms = (v) => parseFloat(v) || 0;
    const tr = window.TOKENS.active().transition;
    const tiles = g.slots.reduce((n, slot) => n + slot.tiles.length, 0);
    return ms(tr.reveal) + ms(tr.base) * Math.max(0, tiles - 1);
  }

  function finish() {
    const done = session.finish(engine, mode, game);
    game = done.game;
    ui.points = done.points;
    if (done.paid) ctx.onWallet();
  }

  // ── Result ─────────────────────────────────────────────────────────

  function streak() {
    const dailyModes = MODES.filter((m) => m.daily && answersFor(data, m).length).map((m) => m.id);
    return stats(store.get().history, { today: localDate(), dailyModes }).currentStreak;
  }

  function renderResultCard() {
    clearInterval(timer);
    if (playing()) { result.replaceChildren(); return; }
    const card = renderResult({
      engine, data, mode, game, glyph,
      points: ui.points || engine.points(state()),
      streak: streak(),
      onPractice: () => (kind === 'practice' ? playAgain() : ctx.onPractice()),
      onHome: ctx.onHome
    });
    result.replaceChildren(card.node);
    // At midnight a finished daily makes way for the new one.
    const day = localDate();
    timer = setInterval(() => {
      card.tick();
      if (kind === 'daily' && localDate() !== day) { clearInterval(timer); ctx.onReload(); }
    }, 1000);
  }

  function playAgain() {
    game = open();
    if (!game) { ctx.onHome(); return; }
    ui = freshUi();
    build();
    window.scrollTo(0, 0);
  }

  // ── Whole screen ───────────────────────────────────────────────────

  function build() {
    clearTimeout(resultTimer);
    // The tile reveal style (settings.tiles): styles.css keys on it.
    board.setAttribute('data-tiles', store.get().settings.tiles);
    boardDone.replaceChildren();
    doneRows = 0;
    makeEntry();
    renderHead();
    renderBoard();
    renderHints();
    renderPicker();
    renderResultCard();
    root.replaceChildren(el('section', { class: 'game', 'aria-labelledby': 'game-title' },
      head, board, hints, picker, result, live));
  }

  if (!game) {
    root.replaceChildren(el('section', { class: 'card game-soon' },
      el('p', {}, t('game.soon')),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn btn-secondary', type: 'button', onclick: ctx.onHome }, t('game.home')))));
    return { refresh() {}, destroy() {} };
  }

  build();
  return {
    refresh() { ui.message = null; build(); },
    destroy() { clearInterval(timer); clearTimeout(resultTimer); closePowerSheet(); }
  };
}
