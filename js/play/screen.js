/*
 * The game screen for one mode's daily or "keep playing" game: the board,
 * the keyboard, the hints and, once it's over, the result card.
 *
 *   const screen = openGame(root, { data, engine, glyph, mode, kind, ...callbacks });
 *   screen.refresh();   // after a language change
 *   screen.destroy();   // when leaving
 *
 * Like Wordle (docs/DESIGN.md, "The puzzle" and "Levels"): every row shows
 * from the start, one cell per part of the answer in writing order, and the
 * parts sit below as a keyboard with Delete and Guess keys. One cell of the
 * next row is selected: a tapped part fills it and the next empty cell is
 * selected; tapping a cell selects it. The keyboard keeps the same keys in
 * the same spots for the whole game. A part a power showed (Reveal a part,
 * Head start, Reveal a kanji) starts each new row in its cell, green; at
 * Hard it must stay there (engine.shownCells).
 *
 * The level (js/config/levels.js; the play card's switches) changes the board:
 *   Normal      one row of cells: where one kanji ends is for the player to
 *               work out. A kanji shows above its cells once it's solved.
 *   Guided      (showSplit) each kanji's cells apart, their places named, a
 *               frame per kanji built from the parts found green, how many
 *               kanji still fit (countLeft), and the keys that can't go in
 *               the selected cell dimmed (tilesForPlace in js/engine/palette.js).
 *   Hard        (realKanji) each row shows the kanji its parts make.
 * Hints (the power bar) open from a button in the head and float just above
 * the keyboard, over the bottom of the board, like a message, so they never
 * move the board. They're open before the first guess, so they're easy to
 * find, and close with a guess. Clues already found stay on show above the
 * keyboard. A hint you hold none of can be bought from its sheet (js/shop.js).
 * When the game ends, its rewards show as toasts and on the result card.
 * In debug mode (Settings), each key whose part is in the answer shows the
 * answer's cells it fills as numbered dots, so the dots spell the answer.
 *
 * The board keeps the rows already drawn, so a new row's reveal plays once
 * and redrawing the keyboard never replays it.
 *
 * Keyboard play: the cells and the keys are each one tab stop. Arrows move
 * between keys (by row too) and between cells, which selects the cell;
 * Enter or Space puts a part in, Backspace or Delete takes one out, and
 * Enter away from a button guesses. A redraw puts the focus back on the
 * same key or cell, and the result takes it when the game ends.
 */
import { MODES, POWER, LEVEL } from '../registry.js';
import { t } from '../i18n.js';
import { el } from '../dom.js';
import * as store from '../store.js';
import { tilesForPlace } from '../engine/palette.js';
import { MARKS } from '../engine/score.js';
import { stats } from '../engine/stats.js';
import { localDate, answersFor } from '../engine/daily.js';
import * as session from './session.js';
import { renderClues, renderPowerBar, whyNot, openPowerSheet, closePowerSheet } from './hints.js';
import { renderResult } from './result.js';
import { describe } from './rewards.js';
import { powerOffer, buyPower } from '../shop.js';
import { toast } from '../toast.js';

const BULB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>';
const DELETE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 5H9l-7 7 7 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rank = (mark) => MARKS.indexOf(mark);

// callbacks: onHome(), onPractice() (daily → keep playing), onWallet()
// (points changed), onReload() (a new day: open the route again).
export function openGame(root, ctx) {
  const { data, engine, glyph, mode, kind } = ctx;
  const open = () => (kind === 'practice'
    ? session.openPractice(engine, data, mode)
    : session.openDaily(engine, data, mode));

  let game = open();
  let ui = freshUi();
  let timer = null;
  let resultTimer = null;
  let frameTimer = null;
  let frameShown = null;   // keys the frame last showed, so new ones animate
  let doneRows = 0;
  let byKeyboard = false;  // the last move came from the keyboard

  // Parts that stay put between redraws.
  let guessButton;
  let deleteButton;
  // The board: the rows in a column, with the kanji frames above them
  // (sized by fitBoard).
  const board = el('div', { class: 'board' });
  const grid = el('div', { class: 'board-grid' });
  const frames = el('div', { class: 'board-frames' });
  const shape = el('div', { class: 'board-shape' });
  const boardDone = el('div', { class: 'board-rows', role: 'list' });
  const boardNext = el('div', { class: 'board-rows' });
  const head = el('div');
  const hints = el('div', { class: 'game-hints' });
  const picker = el('div', { class: 'picker' });
  // Floats above the keyboard: the message, then the power bar.
  const float = el('div', { class: 'picker-float' });
  const message = el('p', { class: 'status-line', role: 'status' });
  const powers = el('div', { class: 'game-powers', id: 'game-powers' });
  float.append(message, powers);
  const choices = el('div', { class: 'picker-choices' });
  const result = el('div', { class: 'game-result' });
  const live = el('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  grid.append(frames, shape, boardDone, boardNext);
  board.append(grid);

  function freshUi() {
    return {
      cells: game ? emptyCells() : [],   // a tile id or null per cell
      active: 0,       // the selected cell, which a tapped part fills
      keyFocus: null,  // the key that takes Tab into the keyboard
      frameFrom: null, // the state the frames show while a row reveals
      // The power bar is open: before the first guess, so hints are easy to find.
      hintsOpen: !!game && !game.done && game.state.status === 'playing' && game.state.guesses.length === 0,
      message: null,   // { kind: 'error' | 'info', text }
      newRow: -1,      // the row to reveal
      points: game && game.done ? engine.points(game.state) : null,
      // What the game paid besides its points (session.finish), and whether
      // their toasts have shown.
      rewards: null,
      toasted: false
    };
  }

  const state = () => game.state;
  const playing = () => state().status === 'playing';
  const level = () => LEVEL[state().level];
  // Parts guesses: every offered level. (A finished game at the retired
  // Easy guessed kanji: its rows still draw, read only.)
  const partsMode = () => level().guess === 'parts';
  const splitShown = () => partsMode() && level().showSplit;
  const madeShown = () => partsMode() && level().realKanji;
  const meaningOf = (word) => (word && [...word].length === 1 && data.kanji[word]
    ? data.kanji[word].meanings.slice(0, 3).join(t('game.meaningSep')) : '');
  const rowMeaning = (word) => (level().meanings ? meaningOf(word) : '');
  // Mark words: per kanji without places, the old way; else right or wrong spot.
  const markText = (mark) => t(`${partsMode() && !level().order && !level().places ? 'game.markParts' : 'game.mark'}.${mark}`);

  // Each kanji of the answer has as many cells as parts.
  // (Declarations, so freshUi() can use them before this line runs.)
  function cellCounts() { return [...game.state.answer].map((ch) => data.kanji[ch].parts.length); }
  function emptyCells() { return Array(cellCounts().reduce((a, b) => a + b, 0)).fill(null); }
  // The cells' groups on the board: one per kanji when the split shows,
  // else one for the whole word.
  const groupCounts = () => (splitShown() ? cellCounts() : [cellCounts().reduce((a, b) => a + b, 0)]);
  // Each cell's place, per slot, when the board shows places (Guided, or an
  // old level with places); otherwise null.
  const places = () => (partsMode() && (level().showSplit || level().places)
    ? [...state().answer].map((ch) => data.kanji[ch].parts.map((p) => p.pos)) : null);
  // Cells in their groups (kept together when rows wrap), with a gap where
  // the place changes when places show.
  const laidOut = (perSlot) => {
    if (!splitShown()) return el('span', { class: 'row-slot' }, perSlot.flat());
    const pl = places();
    return perSlot.map((nodes, s) => el('span', { class: 'row-slot' },
      nodes.map((node, i) => [pl && i && pl[s][i] !== pl[s][i - 1] ? el('span', { class: 'cell-gap' }) : null, node])));
  };
  // How many kanji still fit (engine.fits), for the frames; one state at a time.
  let fitsFor = null;
  let fitsCount = null;
  const fitsNow = () => {
    if (fitsFor !== state()) { fitsFor = state(); fitsCount = engine.fits(state()).map((list) => list.length); }
    return fitsCount;
  };
  const countText = (counts) => counts.join(t('game.layoutSep'));
  const fitText = (counts) => t('game.fit', { n: countText(counts) });
  const picksBySlot = () => {
    let i = 0;
    return cellCounts().map((n) => { const out = ui.cells.slice(i, i + n); i += n; return out; });
  };
  // Every cell's { slot, pos }, in order (pos is null without places).
  const cellPlaces = () => {
    const pl = places();
    return cellCounts().flatMap((n, slot) => Array.from({ length: n }, (_, i) => ({ slot, pos: pl ? pl[slot][i] : null })));
  };
  const placeName = ({ slot, pos }) => {
    const name = t(`pos.${pos}`);
    return cellCounts().length > 1 ? t('game.placeOfSlot', { n: slot + 1, place: name }) : name;
  };
  // A cell for screen readers: its number, and its place when places show.
  const cellName = (i) => {
    const where = cellPlaces()[i];
    return where.pos ? t('game.cellPlace', { n: i + 1, place: placeName(where) }) : t('game.cellNumber', { n: i + 1 });
  };

  // The cells powers showed: cell → its part (engine.shownCells).
  const shownNow = () => new Map(engine.shownCells(state()).map((c) => [c.cell, c]));
  // Puts each shown part in its cell of the next row (over whatever was
  // there), and moves the selection off a filled cell.
  function prefill() {
    shownNow().forEach(({ el: id }, i) => { ui.cells[i] = id; });
    if (ui.cells[ui.active]) {
      const empty = ui.cells.indexOf(null);
      if (empty >= 0) ui.active = empty;
    }
  }

  // ── Head ───────────────────────────────────────────────────────────

  function renderHead() {
    const s = state();
    const back = el('button', {
      class: 'icon-btn', type: 'button', 'data-id': 'back', title: t('game.home'), 'aria-label': t('game.home'), onclick: ctx.onHome
    });
    back.innerHTML = BACK;
    head.replaceChildren(el('header', { class: 'game-head' },
      back,
      el('h2', { class: 'game-title', id: 'game-title' },
        el('span', {}, t(`mode.${mode.id}.name`)),
        el('span', { class: 'game-kind' }, t('game.kindLevel', {
          kind: s.daily ? t('game.daily', { n: s.puzzle }) : t('game.practice'),
          level: t(`level.${s.level}.name`)
        }))),
      playing() ? hintsButton() : null));
  }

  // Opens and closes the power bar (renderHints), with the number of hints
  // held on it.
  function hintsButton() {
    const held = Object.values(store.held()).reduce((a, n) => a + n, 0);
    const label = held ? t('game.powers.titleHeld', { n: held }) : t('game.powers.title');
    const node = el('button', {
      class: `icon-btn hints-btn${ui.hintsOpen ? ' is-open' : ''}`, type: 'button', 'data-id': 'hints',
      title: label, 'aria-label': label,
      'aria-expanded': String(ui.hintsOpen), 'aria-controls': 'game-powers',
      onclick: () => keepFocus(() => { ui.hintsOpen = !ui.hintsOpen; renderHead(); renderHints(); })
    });
    node.innerHTML = BULB;
    if (held) node.append(el('span', { class: 'hints-count', 'aria-hidden': 'true' }, String(held)));
    return node;
  }

  // ── Board ──────────────────────────────────────────────────────────

  function tileNode(tile, i) {
    const node = el('span', { class: `tile is-cell is-${tile.mark}`, lang: 'ja' }, glyph(tile.form));
    node.style.setProperty('--i', i);
    return node;
  }

  function rowLabel(g, i) {
    const parts = g.slots.flatMap((slot) => slot.tiles.map((tile) => `${tile.form} ${markText(tile.mark)}`));
    const list = parts.join(t('game.listSep'));
    const label = g.word ? t('game.rowLabel', { n: i + 1, word: g.word, parts: list }) : t('game.rowLabelParts', { n: i + 1, parts: list });
    return g.left ? t('game.rowLabelFit', { label, fit: fitText(g.left) }) : label;
  }

  // Hard: the kanji a row's parts make, hanging off its right edge, so the
  // cells stay centred (fitBoard leaves room for it on both sides).
  const madeColumn = (word) => (madeShown() && word ? el('span', { class: 'row-made kanji', lang: 'ja', 'aria-hidden': 'true' }, word) : null);

  function guessRow(g, i, reveal) {
    let n = 0;
    const perSlot = g.slots.map((slot) => slot.tiles.map((tile) => tileNode(tile, n++)));
    const row = g.parts
      ? el('div', { class: `board-row${reveal ? ' is-new' : ''}`, role: 'listitem', 'aria-label': rowLabel(g, i) },
        el('span', { class: 'row-tiles', 'aria-hidden': 'true' }, laidOut(perSlot)),
        madeColumn(g.word))
      // A finished game at the retired Easy: its kanji, parts and meaning.
      : el('div', { class: 'board-row', role: 'listitem', 'aria-label': rowLabel(g, i) },
        el('span', { class: 'row-kanji kanji', lang: 'ja', 'aria-hidden': 'true' }, g.word || ''),
        el('span', { class: 'row-tiles', 'aria-hidden': 'true' }, perSlot.map((nodes, s) => [s ? el('span', { class: 'row-gap' }) : null, nodes])),
        el('span', { class: 'row-meaning', 'aria-hidden': 'true' }, rowMeaning(g.word)));
    if (reveal) setTimeout(() => row.classList.remove('is-new'), revealTime(g));
    return row;
  }

  // The next row's cells. Each is a button that selects it; the selected
  // one takes the next tapped part.
  // A cell still holding the part a power showed there is green.
  function pendingCells() {
    let n = 0;
    const filled = ui.cells.filter(Boolean).length;
    const shown = shownNow();
    const perSlot = cellCounts().map((count) => Array.from({ length: count }, () => {
      const i = n++;
      const id = ui.cells[i];
      const known = id && shown.has(i) && shown.get(i).el === id;
      const label = known ? 'game.cellShown' : id ? 'game.cellFilled' : 'game.cellEmpty';
      return el('button', {
        class: `tile is-cell is-pending ${known ? 'is-hit' : id ? 'is-filled' : 'is-empty'}${i === ui.active ? ' is-active' : ''}`,
        type: 'button', lang: 'ja', 'data-id': `cell-${i}`, 'data-index': i,
        tabindex: i === ui.active ? '0' : '-1',
        'aria-pressed': String(i === ui.active),
        'aria-label': t(label, { cell: cellName(i), part: id }),
        onclick: () => selectCell(i)
      }, id ? glyph(known ? shown.get(i).form : id) : null);
    }));
    return el('div', {
      class: 'board-row is-next', role: 'group', 'aria-describedby': 'game-cells-help',
      'aria-label': t('game.cells', { n: filled, cells: ui.cells.length })
    },
      el('span', { class: 'row-tiles' }, laidOut(perSlot)));
  }

  // A row not reached yet.
  function blankRow() {
    const perSlot = cellCounts().map((count) => Array.from({ length: count }, () => el('span', { class: 'tile is-cell is-blank' })));
    return el('div', { class: 'board-row is-blank', 'aria-hidden': 'true' },
      el('span', { class: 'row-tiles' }, laidOut(perSlot)));
  }

  // A place's name over its run of n cells (styles.css .shape-place); the
  // short name when the run is narrower than a base cell. The run holding
  // the selected cell lights up: the keys that stay bright are for it.
  function placeLabel({ pos, n, from }) {
    const tk = window.TOKENS.active();
    const size = CELL_SIZES.find(([id]) => id === board.dataset.cell);
    const cell = parseFloat(tk.layout[size ? size[1] : 'cell']);
    const wide = n * cell + (n - 1) * parseFloat(tk.spacing.xs) >= parseFloat(tk.layout.cell);
    const on = playing() && ui.active >= from && ui.active < from + n;
    const node = el('span', { class: `shape-place${on ? ' is-active' : ''}`, title: t(`pos.${pos}`) }, t(`${wide ? 'pos' : 'posShort'}.${pos}`));
    node.style.setProperty('--n', n);
    return node;
  }

  // Guided: each cell's place, above the board.
  function renderShape() {
    const pl = places();
    board.classList.toggle('has-shape', !!pl);
    if (!pl) { shape.replaceChildren(); return; }
    let first = 0;   // the slot's first cell
    const groups = pl.map((slot) => {
      const out = [];
      slot.forEach((pos, i) => {
        if (i && slot[i - 1] === pos) { out[out.length - 1].n += 1; return; }
        out.push({ pos, n: 1, from: first + i });
      });
      first += slot.length;
      return out;
    });
    shape.replaceChildren(
      el('span', { class: 'visually-hidden' }, t('game.shape', {
        places: pl.map((slot) => slot.map((pos) => t(`pos.${pos}`)).join(t('game.listSep'))).join(' / ')
      })),
      el('div', { class: 'board-row', 'aria-hidden': 'true' },
        el('span', { class: 'row-tiles' }, groups.map((slot) => el('span', { class: 'row-slot' },
          slot.map((g, i) => [i ? el('span', { class: 'cell-gap' }) : null, placeLabel(g)]))))));
  }

  // ── Board size ─────────────────────────────────────────────────────

  // Largest first: the board takes the biggest cells, then frames and keys,
  // that fit.
  const CELL_SIZES = [['xl', 'cellXl'], ['lg', 'cellLg'], ['md', 'cellMd'], ['base', 'cell'], ['sm', 'cellSm'], ['xs', 'cellXs']];
  const FRAME_SIZES = [['base', 'frame'], ['sm', 'frameSm']];
  const KEY_SIZES = [['base', 'key'], ['sm', 'keySm']];
  // When the keyboard isn't up (the game is over), the rows may take this
  // share of the screen's height.
  const ROWS_HEIGHT = 0.5;

  // The keyboard's columns: the fewest rows of keys at least keySm wide,
  // with room left at the end of the last row for Delete (one key wide) and
  // Guess (the rest, two keys or more), as in Wordle. Returns the rows.
  function fitKeys(tk, px) {
    const n = state().palette.length;
    const width = picker.clientWidth;
    const gap = px(tk.spacing.xs);
    const least = px(tk.layout.keySm);
    let cols = 1;
    for (let rows = 1; rows <= n + 3; rows += 1) {
      cols = Math.ceil((n + 3) / rows);
      if (cols * least + (cols - 1) * gap <= width) break;
    }
    const rows = Math.ceil((n + 3) / cols);
    picker.style.setProperty('--key-cols', cols);
    deleteButton.style.gridColumn = 'span 1';
    guessButton.style.gridColumn = `span ${Math.min(rows * cols - n - 1, cols)}`;
    return rows;
  }

  // Sizes the board to the space and the answer, so it works for any number
  // of kanji and parts. Cells are the largest size whose rows fit the width
  // on one line and, with the head, frames, place names, clues found and
  // keyboard, the screen's height, as in Wordle. For those cells, frames
  // take the largest size that fits, then keys; keys drop to keySm only
  // when cells are at the base size or smaller. With the split shown, each
  // kanji's frame sits above its cells, no wider than them, and if even the
  // smallest cells are too wide, rows wrap between kanji (data-wrap).
  // Without it, a solved kanji takes a line of cell height above its cells.
  // Sizes are layout tokens; styles.css keys on the board's data-cell and
  // data-frame, and the keyboard's data-keys.
  function fitBoard() {
    const keyboard = picker.isConnected && picker.classList.contains('is-keyboard');
    if (!partsMode()) {
      ['cell', 'frame', 'wrap'].forEach((k) => board.removeAttribute(`data-${k}`));
      picker.removeAttribute('data-keys');
      return;
    }
    const tk = window.TOKENS.active();
    const px = (v) => parseFloat(v) || 0;
    const xs = px(tk.spacing.xs);
    const sm = px(tk.spacing.sm);
    const md = px(tk.spacing.md);
    const counts = groupCounts();
    const split = splitShown();
    const pl = split ? places() : null;
    // Per group: its place changes, each a wider gap (laidOut).
    const turns = counts.map((n, s) => (pl ? pl[s].filter((pos, i) => i && pos !== pl[s][i - 1]).length : 0));
    const slotWidth = (c, s) => counts[s] * c + (counts[s] - 1) * xs + turns[s] * sm;
    const slotWidths = (c) => counts.map((n, s) => slotWidth(c, s));
    // Hard's word hangs off the right of the rows (styles.css .row-made).
    const made = madeShown() ? sm + px(tk.spacing['2xl']) : 0;
    const rowWidth = (c) => slotWidths(c).reduce((a, b) => a + b, 0) + (counts.length - 1) * md + made;
    const width = board.clientWidth;
    const rows = state().rows;
    const sizes = (list) => list.map(([id, key]) => ({ id, px: px(tk.layout[key]) }));
    const cells = sizes(CELL_SIZES);
    const frameSizes = sizes(FRAME_SIZES);
    const keySizes = sizes(KEY_SIZES);
    // Each frame no wider than its kanji's cells (the smallest if none is).
    const framesFor = (c) => {
      if (!split) return frameSizes.slice(0, 1);
      const narrowest = Math.min(...slotWidths(c));
      const narrow = frameSizes.filter((x) => x.px <= narrowest);
      return narrow.length ? narrow : frameSizes.slice(-1);
    };
    const keysFor = (c) => (keyboard && c <= px(tk.layout.cell) ? keySizes : keySizes.slice(0, 1));
    // Height: everything else on the screen while the keyboard is up (the
    // keys at a given height), plus the frames (with their count) and place
    // names; else a share of the screen. The clues count, since they stay
    // once found, in the keyboard; the message and the power bar float over
    // the board (.picker-float), so they take no room.
    let others = () => 0;
    if (keyboard) {
      const keyRows = fitKeys(tk, px);
      const keyNow = px(tk.layout[(KEY_SIZES.find(([id]) => id === picker.dataset.keys) || KEY_SIZES[0])[1]]);
      const above = Math.max(0, head.getBoundingClientRect().top + window.scrollY);
      const fixed = above + head.offsetHeight + 2 * md + picker.offsetHeight
        + (pl ? px(tk.spacing.lg) + xs : 0) - keyRows * keyNow;
      others = (k) => fixed + keyRows * k;
    }
    const solvedAny = engine.clues(state()).solved.length > 0;
    const framesHeight = (c, f) => (split
      ? f + xs + (level().countLeft ? md + xs : 0)
      : (solvedAny ? c + xs : 0));
    const rowsHeight = (c, lines) => rows * lines * c + (rows * lines - 1) * xs;
    const fits = (c, f, k, lines) => (keyboard
      ? others(k) + framesHeight(c, f) + rowsHeight(c, lines) <= window.innerHeight
      : rowsHeight(c, lines) <= window.innerHeight * ROWS_HEIGHT);
    // The largest frame, then keys, that fit with cells c; else null.
    const choose = (c, lines = 1) => {
      for (const k of keysFor(c.px)) {
        for (const f of framesFor(c.px)) {
          if (fits(c.px, f.px, k.px, lines)) return { cell: c.id, frame: f.id, keys: k.id };
        }
      }
      return null;
    };
    // Nothing fits the height: the smallest of everything.
    const least = (c) => ({ cell: c.id, frame: framesFor(c.px).slice(-1)[0].id, keys: keysFor(c.px).slice(-1)[0].id });

    const wide = cells.filter((c) => rowWidth(c.px) <= width);
    let pick = null;
    for (const c of wide) { pick = choose(c); if (pick) break; }
    if (!pick && wide.length) pick = least(wide[wide.length - 1]);
    if (!pick) {
      // Wrap between kanji: the largest cells whose kanji fit the width
      // and whose wrapped rows (lines × rows) fit the height.
      const lines = (c) => {
        let n = 1;
        let used = 0;
        slotWidths(c).forEach((w) => {
          if (used && used + md + w > width) { n += 1; used = w; } else used += (used ? md : 0) + w;
        });
        return n;
      };
      const narrow = cells.filter((x) => Math.max(...slotWidths(x.px)) + made <= width);
      for (const c of narrow) { pick = choose(c, lines(c.px)); if (pick) break; }
      if (!pick) pick = least(narrow.length ? narrow[narrow.length - 1] : cells[cells.length - 1]);
      pick.wrap = true;
    }
    board.dataset.cell = pick.cell;
    board.dataset.frame = pick.frame;
    board.toggleAttribute('data-wrap', !!pick.wrap);
    if (keyboard) picker.dataset.keys = pick.keys;
    else picker.removeAttribute('data-keys');
  }

  // ── Kanji frames ───────────────────────────────────────────────────

  // Where each place sits in the frame: top and bottom span the width;
  // left, inner and right share the middle; outer, whole and none cover it
  // all when they hold one part (門 around 日). Holding several (立 and 厂
  // around 生 in 産), they'd pile up past the frame, so they take a column
  // of the middle instead, before the inner.
  const COVER = ['outer', 'whole', 'none'];
  function frameAreas(order, covers) {
    const mid = ['left', 'outer', 'none', 'inner', 'right'].filter((pos) => order.includes(pos) && !covers(pos));
    const cols = Math.max(mid.length, 1);
    const rows = [];
    if (order.includes('top')) rows.push(Array(cols).fill('top'));
    if (mid.length) rows.push(mid);
    if (order.includes('bottom')) rows.push(Array(cols).fill('bottom'));
    if (!rows.length) rows.push(['inner']);
    return {
      gridTemplateAreas: rows.map((r) => `"${r.join(' ')}"`).join(' '),
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows.length}, 1fr)`
    };
  }

  // Above the rows, laid out like a row (styles.css), so each kanji's part
  // centres over its cells: a slot n cells and g place gaps wide.
  //   Guided: one frame per kanji, its shape, with each part found green (by
  //     a guess or a power: state.found) in its place, a dot for each part
  //     still hidden, and how many kanji still fit under it.
  //   Otherwise: only a kanji once it's solved, which gives away its cells,
  //     and nothing at all before that.
  // A solved kanji shows whole. While a row reveals, the frames show the
  // state before it (ui.frameFrom), then catch up.
  function renderFrame() {
    if (!partsMode()) { frames.replaceChildren(); return; }
    const s = ui.frameFrom || state();
    const pl = places();
    const counts = cellCounts();
    const solved = new Set(engine.clues(s).solved);
    const split = splitShown();
    if (!split && !solved.size) { frames.replaceChildren(); return; }
    const seen = new Set();
    const isNew = (k) => { seen.add(k); return frameShown !== null && !frameShown.has(k); };
    const fit = split && level().countLeft ? (s === state() ? fitsNow() : engine.fits(s).map((list) => list.length)) : null;
    const slots = [...s.answer].map((ch, slot) => {
      const node = el('span', { class: 'frame-slot' },
        split || solved.has(slot) ? frameOf(s, ch, slot, solved.has(slot), isNew) : null,
        fit && !solved.has(slot) ? el('span', { class: 'frame-count', title: t('game.fitTitle') }, t('game.fitCount', { n: fit[slot] })) : null);
      node.style.setProperty('--n', counts[slot]);
      node.style.setProperty('--g', split && pl ? pl[slot].filter((pos, i) => i && pos !== pl[slot][i - 1]).length : 0);
      return node;
    });
    frames.replaceChildren(el('span', { class: 'row-tiles' }, slots));
    frameShown = seen;
  }

  function frameOf(s, ch, slot, solved, isNew) {
    if (solved) {
      return el('span', {
        class: `kanji-frame is-solved kanji${isNew(`solved:${slot}`) ? ' is-new' : ''}`,
        lang: 'ja', role: 'img', 'aria-label': t('game.frameSolved', { kanji: ch })
      }, ch);
    }
    const parts = data.kanji[ch].parts;
    const order = [...new Set(parts.map((p) => p.pos))];
    const covers = (pos) => COVER.includes(pos) && parts.filter((p) => p.pos === pos).length === 1;
    const found = (i) => s.found[`${slot}:${i}`] === 'hit';
    const said = parts.filter((p, i) => found(i)).map((p) => t('game.framePart', { part: p.form || p.el, place: t(`pos.${p.pos}`) }));
    return el('span', {
      class: `kanji-frame${order.includes('outer') && covers('outer') ? ' has-outer' : ''}`,
      style: frameAreas(order, covers),
      role: 'img',
      'aria-label': t('game.frameLabel', { parts: said.length ? said.join(t('game.listSep')) : t('game.frameEmpty') })
    }, order.map((pos) => {
      const here = parts.map((p, i) => ({ p, i })).filter(({ p }) => p.pos === pos);
      const cover = covers(pos);
      return el('span', {
        class: `frame-zone is-${pos}${cover ? ' is-cover' : ''}`,
        'data-n': String(Math.min(here.length, 4)),
        style: cover ? null : { gridArea: pos }
      }, here.map(({ p, i }) => {
        if (found(i)) {
          return el('span', { class: `frame-part${isNew(`${slot}:${i}`) ? ' is-new' : ''}`, lang: 'ja' }, glyph(p.form || p.el));
        }
        // A covering part has no room for a dot: the inset inner shows it.
        return cover ? null : el('span', { class: 'frame-part is-hidden' });
      }));
    }));
  }

  function renderBoard() {
    const s = state();
    board.classList.toggle('is-parts', partsMode());
    board.classList.toggle('is-flat', partsMode() && !splitShown());
    board.classList.toggle('has-made', madeShown());
    if (board.isConnected) fitBoard();
    renderFrame();
    renderShape();
    boardDone.setAttribute('aria-label', t('game.board'));
    if (doneRows > s.guesses.length) { boardDone.replaceChildren(); doneRows = 0; }
    s.guesses.slice(doneRows).forEach((g, j) => {
      const i = doneRows + j;
      boardDone.append(guessRow(g, i, i === ui.newRow && !reducedMotion()));
    });
    doneRows = s.guesses.length;

    // Every row, like Wordle: the next one, then blanks.
    const next = [];
    if (partsMode()) {
      if (s.status === 'playing') next.push(pendingCells());
      const blanks = s.rows - s.guesses.length - (s.status === 'playing' ? 1 : 0);
      for (let k = 0; k < blanks; k += 1) next.push(blankRow());
    }
    boardNext.replaceChildren(...next);
  }

  // ── Hints ──────────────────────────────────────────────────────────

  // Clues already found always show above the keyboard; the power bar
  // floats over the board while it's open (the Hints button in the head).
  function renderHints() {
    if (!playing()) { hints.replaceChildren(); powers.replaceChildren(); return; }
    hints.replaceChildren(...[renderClues({ engine, state: state(), mode, glyph })].filter(Boolean));
    powers.replaceChildren(...[ui.hintsOpen
      ? renderPowerBar({ engine, state: state(), held: store.held(), points: store.points(), onPick: pickPower })
      : null].filter(Boolean));
  }

  // A power's sheet: Use, or Buy one first when none is held and it could
  // be used now.
  function pickPower(id) {
    const power = POWER[id];
    openPowerSheet({
      power,
      read: () => {
        const held = store.held()[id] || 0;
        return {
          held,
          points: store.points(),
          why: whyNot(engine, state(), power, held),
          offer: engine.canUse(state(), id) ? null : powerOffer(id)
        };
      },
      onBuy: () => {
        if (!buyPower(id)) return false;
        ctx.onWallet();
        renderHead();
        renderHints();
        return true;
      },
      onUse: () => usePower(id)
    });
  }

  function usePower(id) {
    if (!(store.held()[id] > 0)) return;
    const r = engine.usePower(state(), id);
    if (r.error) { say('error', whyNot(engine, state(), POWER[id], 1)); return; }
    session.spendPower(id);
    game = { ...game, state: r.state };
    session.progress(mode, game);
    prefill();
    // Before the first guess the bar stays open for more; after it, it
    // gets out of the way.
    ui.hintsOpen = state().guesses.length === 0;
    say('info', t('game.powers.used', { name: t(`power.${id}.name`) }));
    renderHead();
    renderHints();   // before the board, which fits around the clues
    renderBoard();
    renderChoices();
  }

  // ── Keyboard ───────────────────────────────────────────────────────

  // The best mark each tile has had, like Wordle's keyboard: guesses,
  // revealed parts, swept parts.
  function knownMarks() {
    const s = state();
    const out = new Map();
    const note = (id, mark) => { if (!out.has(id) || rank(mark) > rank(out.get(id))) out.set(id, mark); };
    s.guesses.forEach((g) => g.slots.forEach((slot) => slot.tiles.forEach((tile) => note(tile.el, tile.mark))));
    engine.shownCells(s).forEach((c) => note(c.el, 'hit'));
    engine.clues(s).eliminated.forEach((id) => note(id, 'miss'));
    return out;
  }

  // With the keyboard up, a message floats over the bottom of the board for
  // a moment (.picker-float in styles.css), so it never moves the board or
  // scrolls the page.
  let messageTimer = 0;
  function say(kind, text) {
    clearTimeout(messageTimer);
    ui.message = text ? { kind, text } : null;
    message.className = `status-line${ui.message && ui.message.kind === 'error' ? ' is-error' : ''}`;
    message.textContent = text || '';
    if (text) messageTimer = setTimeout(() => say(null, ''), parseFloat(window.TOKENS.active().transition.message) || 0);
  }

  function makeKeys() {
    guessButton = el('button', { class: 'btn btn-primary', type: 'button', 'data-id': 'guess', onclick: submit }, t('game.guess'));
    deleteButton = el('button', {
      class: 'btn btn-secondary key-delete', type: 'button', 'data-id': 'delete', title: t('game.delete'), 'aria-label': t('game.delete'),
      onclick: deletePart
    });
    deleteButton.innerHTML = DELETE;
  }

  // A tapped part fills the selected cell, then the next empty cell is
  // selected (the selection stays put when all are full).
  function addPart(id) {
    const filled = ui.active;
    ui.cells[ui.active] = id;
    const n = ui.cells.length;
    for (let k = 1; k < n; k += 1) {
      const i = (ui.active + k) % n;
      if (!ui.cells[i]) { ui.active = i; break; }
    }
    say(null, '');
    live.textContent = t('game.cellFilled', { cell: cellName(filled), part: id });
    keepFocus(() => { renderBoard(); renderChoices(); });
  }

  function selectCell(i) {
    ui.active = i;
    keepFocus(() => { renderBoard(); renderChoices(); });
  }

  // Delete empties the selected cell, or when it's already empty, the one
  // before it, which it selects (like a backspace).
  function deletePart() {
    let i = ui.active;
    if (!ui.cells[i] && i > 0) i -= 1;
    ui.cells[i] = null;
    ui.active = i;
    say(null, '');
    live.textContent = t('game.cellEmpty', { cell: cellName(i) });
    keepFocus(() => { renderBoard(); renderChoices(); });
  }

  // Redraws make new cells and keys: the focus goes to the new one in the
  // same place (on the cells, the selected one), so keyboard play keeps
  // its spot. Delete and Guess are the same buttons, moved, which loses
  // the focus too.
  function keepFocus(draw) {
    const was = document.activeElement;
    const id = was && root.contains(was) ? was.dataset.id : null;
    draw();
    if (!id || (document.activeElement === was && was.isConnected)) return;
    const target = id.startsWith('cell-') ? `cell-${ui.active}` : id;
    const now = root.querySelector(`[data-id="${CSS.escape(target)}"]`);
    if (now) now.focus({ preventScroll: true });
  }

  // ── Keyboard play ──────────────────────────────────────────────────

  // An arrow from a key: the one before or after, or the nearest in the
  // row above or below. Up from the top row goes to the selected cell.
  function moveKey(from, dir) {
    const keys = [...from.closest('.palette').querySelectorAll('button:not(:disabled)')];
    const i = keys.indexOf(from);
    let to = null;
    if (dir === 'ArrowLeft') to = keys[i - 1];
    else if (dir === 'ArrowRight') to = keys[i + 1];
    else {
      const box = from.getBoundingClientRect();
      const mid = (r) => r.left + r.width / 2;
      const away = (k) => Math.abs(mid(k.getBoundingClientRect()) - mid(box));
      const down = dir === 'ArrowDown';
      const row = keys.filter((k) => {
        const r = k.getBoundingClientRect();
        return down ? r.top >= box.bottom - 1 : r.bottom <= box.top + 1;
      });
      if (row.length) {
        const tops = row.map((k) => k.getBoundingClientRect().top);
        const edge = down ? Math.min(...tops) : Math.max(...tops);
        to = row.filter((k) => Math.abs(k.getBoundingClientRect().top - edge) < 1)
          .sort((a, b) => away(a) - away(b))[0];
      } else if (!down) to = boardNext.querySelector(`[data-index="${ui.active}"]`);
    }
    if (to) to.focus();
  }

  // An arrow on the cells (or with nothing focused): left and right pick the
  // cell; down goes to the keys.
  function moveCell(dir, focused) {
    if (dir === 'ArrowDown') {
      const key = choices.querySelector('.palette button[tabindex="0"]');
      if (key) key.focus();
      return;
    }
    if (dir === 'ArrowUp') return;
    const i = ui.active + (dir === 'ArrowLeft' ? -1 : 1);
    if (i < 0 || i >= ui.cells.length) return;
    selectCell(i);
    if (focused) {
      const cell = boardNext.querySelector(`[data-index="${i}"]`);
      if (cell) cell.focus();
    }
  }

  function onKey(event) {
    byKeyboard = true;
    if (!playing() || !partsMode() || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    if (document.querySelector('dialog[open]')) return;   // a sheet has the keys
    const target = event.target instanceof Element ? event.target : null;
    if (target && target.closest('input, textarea, select, [contenteditable]')) return;
    const onBody = !target || target === document.body;
    const key = target && target.closest('.palette button');
    const cell = target && target.closest('[data-index]');
    switch (event.key) {
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        deletePart();
        return;
      case 'Enter':
        if (!onBody && target.closest('button, a')) return;   // the button's own
        event.preventDefault();
        submit();
        return;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        if (key) { event.preventDefault(); moveKey(key, event.key); }
        else if (cell || onBody) { event.preventDefault(); moveCell(event.key, !!cell); }
        return;
      default:
    }
  }

  // The palette's keys, in palette order (fewest strokes first).
  //   ids      the tiles to show
  //   marks    tile → its mark (colour)
  //   pressed  id → true when it's in the selected cell
  //   usable   the tiles that can be tapped (the rest dim, keeping their
  //            spot), or null for all
  //   onTap    id → what a tap does
  //   after    nodes that close the last row (Delete and Guess)
  //   answer   debug mode: id → the cells (from 1) it fills in the answer
  function palette({ ids, marks, pressed, usable = null, onTap, label, after = [], answer = null }) {
    const tileOf = new Map(data.tiles.map((tile) => [tile.id, tile]));
    const isOn = (id) => !usable || pressed(id) || usable.has(id);
    // One key takes Tab into the keyboard: the last one focused, if it can
    // still be tapped, else the first that can.
    const onIds = ids.filter(isOn);
    const roving = onIds.includes(ui.keyFocus) ? ui.keyFocus : onIds[0];
    const key = (id) => {
      const tile = tileOf.get(id);
      const on = isOn(id);
      const mark = marks.get(id);
      // The most used other form (氵 for 水) shows small in the corner.
      const variants = tile.forms.filter((f) => f.glyph !== id).sort((a, b) => b.uses - a.uses).slice(0, 1);
      const cells = answer && answer.get(id);
      return el('button', {
        class: `tile is-cell palette-tile${mark ? ` is-${mark}` : ''}${on ? '' : ' is-out'}`,
        type: 'button', lang: 'ja', 'data-id': `key-${id}`, 'data-key': id,
        tabindex: id === roving ? '0' : '-1',
        'aria-pressed': String(pressed(id)),
        disabled: !on,
        'aria-label': [mark ? `${id} ${markText(mark)}` : id, cells ? t('game.debugCells', { cells: cells.join(t('game.listSep')) }) : null].filter(Boolean).join(t('game.listSep')),
        onclick: () => onTap(id)
      },
        glyph(id),
        variants.length ? el('span', { class: 'palette-variant', 'aria-hidden': 'true' }, variants.map((f) => glyph(f.glyph))) : null,
        cells ? el('span', { class: 'key-dots', 'aria-hidden': 'true' },
          cells.map((n) => el('span', { class: 'key-dot' }, String(n)))) : null);
    };
    return el('div', {
      class: 'palette', role: 'group', 'aria-label': label, 'aria-describedby': 'game-keys-help',
      // The key focused last takes Tab next time.
      onfocusin: (event) => {
        const id = event.target.dataset.key;
        if (!id) return;
        ui.keyFocus = id;
        event.currentTarget.querySelectorAll('[data-key]').forEach((node) => {
          node.setAttribute('tabindex', node === event.target ? '0' : '-1');
        });
      }
    }, ids.map(key), after);
  }

  // The keyboard: every key of the puzzle's palette, always in the same
  // spot, with Delete and Guess at the end of the last row (fitKeys).
  // Guided dims the keys no kanji has in the selected cell's place, which
  // lights up above the board (placeLabel); tapping a cell switches place.
  function partsChoices() {
    const where = cellPlaces()[ui.active] || { slot: 0, pos: null };
    const guided = splitShown() && where.pos;
    const place = guided ? placeName(where) : null;
    return palette({
      ids: state().palette,
      marks: knownMarks(),
      pressed: (id) => ui.cells[ui.active] === id,
      usable: guided ? new Set(tilesForPlace(data, state().palette, where.pos)) : null,
      onTap: addPart,
      label: place ? t('game.palettePlace', { place }) : t('game.palette'),
      after: [deleteButton, guessButton],
      answer: store.get().settings.debug ? answerCells() : null
    });
  }

  // Debug mode (Settings): each part of the answer → the cells it fills,
  // numbered from 1 in writing order, so its keys show the whole order.
  function answerCells() {
    const out = new Map();
    [...state().answer].flatMap((ch) => data.kanji[ch].parts.map((p) => p.el)).forEach((id, i) => {
      out.set(id, [...(out.get(id) || []), i + 1]);
    });
    return out;
  }

  function renderChoices() {
    if (!playing() || !partsMode()) { choices.replaceChildren(); return; }
    choices.replaceChildren(partsChoices());
  }

  // A keyboard at the bottom, as in Wordle: floating above it any message
  // and the power bar; then the clues, and the parts with Delete and Guess.
  function renderPicker() {
    const on = playing() && partsMode();
    picker.classList.toggle('is-keyboard', on);
    if (!on) { picker.replaceChildren(); return; }
    picker.replaceChildren(float, hints, choices);
    renderChoices();
  }

  // ── Guessing ───────────────────────────────────────────────────────

  function submit() {
    if (!partsMode()) return;
    if (ui.cells.includes(null)) {
      say('error', t('game.errors.slots', { cells: ui.cells.length }));
      return;
    }
    const r = engine.guess(state(), picksBySlot());
    if (r.error) {
      const detail = r.detail || {};
      say('error', t(`game.errors.${r.error}`, { n: [...state().answer].length, cells: ui.cells.length, part: detail.part, cell: detail.cell }));
      return;
    }
    const before = state();
    game = { ...game, state: r.state };
    const row = r.state.guesses.length - 1;
    ui.newRow = row;
    ui.hintsOpen = false;
    ui.cells = emptyCells();
    ui.active = 0;
    prefill();
    // The frames catch up once the row has flipped.
    clearTimeout(frameTimer);
    ui.frameFrom = !reducedMotion() ? before : null;
    if (ui.frameFrom) {
      frameTimer = setTimeout(() => { ui.frameFrom = null; renderBoard(); }, revealTime(r.state.guesses[row]));
    }
    say(null, '');
    live.textContent = rowLabel(r.state.guesses[row], row);

    if (playing()) session.progress(mode, game);
    else finish();

    keepFocus(() => {
      renderHead();
      renderBoard();
      ui.newRow = -1;
      renderHints();
      renderPicker();
    });
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
    if (done.paid) {
      ui.rewards = done.rewards;
      ctx.onWallet();
    }
  }

  // ── Result ─────────────────────────────────────────────────────────

  function streak() {
    const dailyModes = MODES.filter((m) => m.daily && answersFor(data, m).length).map((m) => m.id);
    return stats(store.get().history, { today: localDate(), dailyModes }).currentStreak;
  }

  function renderResultCard() {
    clearInterval(timer);
    if (playing()) { result.replaceChildren(); return; }
    // Just finished: its rewards, shown once as toasts too. A daily shown
    // again: its rewards from the ledger.
    const fresh = !!ui.rewards;
    const rewards = ui.rewards || session.rewardsFor(mode, state());
    const card = renderResult({
      engine, data, mode, game, glyph,
      points: ui.points || engine.points(state()),
      streak: streak(),
      rewards: rewards.map(describe),
      balance: store.points(),
      fresh,
      onPractice: () => (kind === 'practice' ? playAgain() : ctx.onPractice()),
      onHome: ctx.onHome
    });
    result.replaceChildren(card.node);
    // Played from the keyboard: the result takes the focus the keys had.
    if (fresh && !ui.toasted && byKeyboard && (document.activeElement === document.body || !document.activeElement)) {
      const title = card.node.querySelector('#result-title');
      if (title) { title.setAttribute('tabindex', '-1'); title.focus(); }
    }
    if (fresh && !ui.toasted) {
      ui.toasted = true;
      rewards.forEach((entry) => toast(describe(entry)));
    }
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
    clearTimeout(frameTimer);
    ui.frameFrom = null;
    frameShown = null;
    // The tile reveal style (settings.tiles): styles.css keys on it.
    board.setAttribute('data-tiles', store.get().settings.tiles);
    boardDone.replaceChildren();
    doneRows = 0;
    if (playing() && partsMode()) prefill();
    makeKeys();
    renderHead();
    renderBoard();
    renderHints();
    renderPicker();
    renderResultCard();
    // The hints live inside the keyboard (renderPicker).
    root.replaceChildren(el('section', { class: 'game', 'aria-labelledby': 'game-title' },
      head, board, picker, result, live,
      el('p', { class: 'visually-hidden', id: 'game-cells-help' }, t('game.cellsHelp')),
      el('p', { class: 'visually-hidden', id: 'game-keys-help' }, t('game.keysHelp'))));
    renderBoard();   // again, sized now that the board has a width (fitBoard)
  }

  if (!game) {
    root.replaceChildren(el('section', { class: 'card game-soon' },
      el('p', {}, t('game.soon')),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn btn-secondary', type: 'button', onclick: ctx.onHome }, t('game.home')))));
    return { refresh() {}, destroy() {} };
  }

  build();
  // A turned phone or a resized window may fit other sizes.
  let resizeFrame = 0;
  const onResize = () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(renderBoard); };
  window.addEventListener('resize', onResize);
  const onPointer = () => { byKeyboard = false; };
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onPointer);
  return {
    refresh() { ui.message = null; build(); },
    destroy() {
      clearInterval(timer); clearTimeout(resultTimer); clearTimeout(frameTimer); closePowerSheet();
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    }
  };
}
