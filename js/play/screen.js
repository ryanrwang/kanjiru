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
 * The level (js/config/levels.js; the Settings switches) changes the board:
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
 *
 * The board keeps the rows already drawn, so a new row's reveal plays once
 * and redrawing the keyboard never replays it.
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
      class: 'icon-btn', type: 'button', title: t('game.home'), 'aria-label': t('game.home'), onclick: ctx.onHome
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
      class: `icon-btn hints-btn${ui.hintsOpen ? ' is-open' : ''}`, type: 'button',
      title: label, 'aria-label': label,
      'aria-expanded': String(ui.hintsOpen), 'aria-controls': 'game-powers',
      onclick: () => { ui.hintsOpen = !ui.hintsOpen; renderHead(); renderHints(); }
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
        type: 'button', lang: 'ja',
        'aria-pressed': String(i === ui.active),
        'aria-label': t(label, { cell: cellName(i), part: id }),
        onclick: () => selectCell(i)
      }, id ? glyph(known ? shown.get(i).form : id) : null);
    }));
    return el('div', { class: 'board-row is-next', role: 'group', 'aria-label': t('game.cells', { n: filled, cells: ui.cells.length }) },
      el('span', { class: 'row-tiles' }, laidOut(perSlot)));
  }

  // A row not reached yet.
  function blankRow() {
    const perSlot = cellCounts().map((count) => Array.from({ length: count }, () => el('span', { class: 'tile is-cell is-blank' })));
    return el('div', { class: 'board-row is-blank', 'aria-hidden': 'true' },
      el('span', { class: 'row-tiles' }, laidOut(perSlot)));
  }

  // A place's name over its run of n cells (styles.css .shape-place); the
  // short name when the run is narrower than a base cell.
  function placeLabel({ pos, n }) {
    const tk = window.TOKENS.active();
    const size = CELL_SIZES.find(([id]) => id === board.dataset.cell);
    const cell = parseFloat(tk.layout[size ? size[1] : 'cell']);
    const wide = n * cell + (n - 1) * parseFloat(tk.spacing.xs) >= parseFloat(tk.layout.cell);
    const node = el('span', { class: 'shape-place', title: t(`pos.${pos}`) }, t(`${wide ? 'pos' : 'posShort'}.${pos}`));
    node.style.setProperty('--n', n);
    return node;
  }

  // Guided: each cell's place, above the board.
  function renderShape() {
    const pl = places();
    board.classList.toggle('has-shape', !!pl);
    if (!pl) { shape.replaceChildren(); return; }
    const groups = pl.map((slot) => {
      const out = [];
      slot.forEach((pos, i) => {
        if (i && slot[i - 1] === pos) { out[out.length - 1].n += 1; return; }
        out.push({ pos, n: 1 });
      });
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

  // Largest first: the board takes the biggest cells and frame that fit.
  const CELL_SIZES = [['xl', 'cellXl'], ['lg', 'cellLg'], ['md', 'cellMd'], ['base', 'cell'], ['sm', 'cellSm'], ['xs', 'cellXs']];
  const FRAME_SIZES = [['base', 'frame'], ['sm', 'frameSm']];
  // When the keyboard isn't up (the game is over), the rows may take this
  // share of the screen's height.
  const ROWS_HEIGHT = 0.5;

  // Sizes the board to the space and the answer, so it works for any number
  // of kanji and parts. Cells are the largest size whose rows fit the width
  // on one line and, with the head, frames, place names and keyboard, the
  // screen's height, as in Wordle. With the split shown, each kanji's frame
  // sits above its cells, no wider than them, and if even the smallest
  // cells are too wide, rows wrap between kanji (data-wrap). Without it, a
  // solved kanji takes a line of cell height above its cells.
  // Sizes are layout tokens; styles.css keys on data-cell and data-frame.
  function fitBoard() {
    if (!partsMode()) {
      ['cell', 'frame', 'wrap'].forEach((k) => board.removeAttribute(`data-${k}`));
      return;
    }
    const tk = window.TOKENS.active();
    const px = (v) => parseFloat(v) || 0;
    const xs = px(tk.spacing.xs);
    const sm = px(tk.spacing.sm);
    const md = px(tk.spacing.md);
    const counts = groupCounts();
    const pl = splitShown() ? places() : null;
    // Per group: its place changes, each a wider gap (laidOut).
    const turns = counts.map((n, s) => (pl ? pl[s].filter((pos, i) => i && pos !== pl[s][i - 1]).length : 0));
    const slotWidth = (c, s) => counts[s] * c + (counts[s] - 1) * xs + turns[s] * sm;
    const slotWidths = (c) => counts.map((n, s) => slotWidth(c, s));
    // Hard's word hangs off the right; the same room on the left keeps the cells centred.
    const made = madeShown() ? 2 * (sm + px(tk.spacing['2xl'])) : 0;
    const rowWidth = (c) => slotWidths(c).reduce((a, b) => a + b, 0) + (counts.length - 1) * md + made;
    const width = board.clientWidth;
    const rows = state().rows;
    const cells = CELL_SIZES.map(([id, key]) => ({ id, px: px(tk.layout[key]) }));
    const frameSizes = FRAME_SIZES.map(([id, key]) => ({ id, px: px(tk.layout[key]) }));
    // Each frame no wider than its kanji's cells (the smallest if none fits).
    const frameOfSize = (c) => {
      const narrowest = Math.min(...slotWidths(c));
      return frameSizes.find((x) => x.px <= narrowest) || frameSizes[frameSizes.length - 1];
    };
    const frameFor = (c) => frameOfSize(c).id;
    // Height: everything else on the screen while the keyboard is up, plus
    // the frames (with their count) and place names; else a share of the
    // screen. The clues count, since they stay once found; the power bar
    // comes and goes, so it doesn't. The message floats over the board,
    // so it takes no room.
    const keyboard = picker.isConnected && picker.classList.contains('is-keyboard');
    const clueRows = hints.querySelector('.clues');
    const others = keyboard
      ? head.offsetHeight + picker.offsetHeight - hints.offsetHeight + 2 * md
        + (clueRows ? clueRows.offsetHeight : 0) + (pl ? px(tk.spacing.lg) + xs : 0)
      : 0;
    const solvedAny = engine.clues(state()).solved.length > 0;
    const framesHeight = (c) => (splitShown()
      ? frameOfSize(c).px + xs + (level().countLeft ? md + xs : 0)
      : (solvedAny ? c + xs : 0));
    const rowsHeight = (c, lines) => rows * lines * c + (rows * lines - 1) * xs;
    const fitsHeight = (c, lines = 1) => (keyboard
      ? others + framesHeight(c) + rowsHeight(c, lines) <= window.innerHeight
      : rowsHeight(c, lines) <= window.innerHeight * ROWS_HEIGHT);

    let pick = null;
    const tall = cells.filter((c) => fitsHeight(c.px));
    for (const c of (tall.length ? tall : cells.slice(-1))) {
      if (rowWidth(c.px) <= width) { pick = { cell: c.id, frame: frameFor(c.px) }; break; }
    }
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
      const fits = (x) => Math.max(...slotWidths(x.px)) + made <= width;
      const c = cells.find((x) => fits(x) && fitsHeight(x.px, lines(x.px)))
        || [...cells].reverse().find(fits) || cells[cells.length - 1];
      pick = { cell: c.id, frame: frameFor(c.px), wrap: true };
    }
    board.dataset.cell = pick.cell;
    board.dataset.frame = pick.frame;
    board.toggleAttribute('data-wrap', !!pick.wrap);
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
    guessButton = el('button', { class: 'btn btn-primary', type: 'button', onclick: submit }, t('game.guess'));
    deleteButton = el('button', {
      class: 'btn btn-secondary key-delete', type: 'button', title: t('game.delete'), 'aria-label': t('game.delete'),
      onclick: deletePart
    });
    deleteButton.innerHTML = DELETE;
  }

  // A tapped part fills the selected cell, then the next empty cell is
  // selected (the selection stays put when all are full).
  function addPart(id) {
    ui.cells[ui.active] = id;
    const n = ui.cells.length;
    for (let k = 1; k < n; k += 1) {
      const i = (ui.active + k) % n;
      if (!ui.cells[i]) { ui.active = i; break; }
    }
    say(null, '');
    renderBoard();
    renderChoices();
  }

  function selectCell(i) {
    ui.active = i;
    renderBoard();
    renderChoices();
  }

  // Delete empties the selected cell, or when it's already empty, the one
  // before it, which it selects (like a backspace).
  function deletePart() {
    let i = ui.active;
    if (!ui.cells[i] && i > 0) i -= 1;
    ui.cells[i] = null;
    ui.active = i;
    say(null, '');
    renderBoard();
    renderChoices();
  }

  // The palette's keys, in palette order (fewest strokes first).
  //   ids      the tiles to show
  //   marks    tile → its mark (colour)
  //   pressed  id → true when it's in the selected cell
  //   usable   the tiles that can be tapped (the rest dim, keeping their
  //            spot), or null for all
  //   onTap    id → what a tap does
  function palette({ ids, marks, pressed, usable = null, onTap, label }) {
    const tileOf = new Map(data.tiles.map((tile) => [tile.id, tile]));
    const key = (id) => {
      const tile = tileOf.get(id);
      const on = !usable || pressed(id) || usable.has(id);
      const mark = marks.get(id);
      // The most used other form (氵 for 水) shows small in the corner.
      const variants = tile.forms.filter((f) => f.glyph !== id).sort((a, b) => b.uses - a.uses).slice(0, 1);
      return el('button', {
        class: `tile is-cell palette-tile${mark ? ` is-${mark}` : ''}${on ? '' : ' is-out'}`,
        type: 'button', lang: 'ja',
        'aria-pressed': String(pressed(id)),
        disabled: !on,
        'aria-label': mark ? `${id} ${markText(mark)}` : id,
        onclick: () => onTap(id)
      },
        glyph(id),
        variants.length ? el('span', { class: 'palette-variant', 'aria-hidden': 'true' }, variants.map((f) => glyph(f.glyph))) : null);
    };
    return el('div', { class: 'palette', role: 'group', 'aria-label': label }, ids.map(key));
  }

  // The keyboard: every key of the puzzle's palette, always in the same
  // spot. Guided dims the keys no kanji has in the selected cell's place,
  // and names the place above them; tapping a cell switches place.
  function partsChoices() {
    const where = cellPlaces()[ui.active] || { slot: 0, pos: null };
    const guided = splitShown() && where.pos;
    const place = guided ? placeName(where) : null;
    return [
      place ? el('p', { class: 'keyboard-place' }, t('game.palettePlace', { place })) : null,
      palette({
        ids: state().palette,
        marks: knownMarks(),
        pressed: (id) => ui.cells[ui.active] === id,
        usable: guided ? new Set(tilesForPlace(data, state().palette, where.pos)) : null,
        onTap: addPart,
        label: place ? t('game.palettePlace', { place }) : t('game.palette')
      })
    ];
  }

  function renderChoices() {
    if (!playing() || !partsMode()) { choices.replaceChildren(); return; }
    choices.replaceChildren(...partsChoices().filter(Boolean));
  }

  // A keyboard at the bottom, as in Wordle: floating above it any message
  // and the power bar; then the clues, the parts, Delete and Guess.
  function renderPicker() {
    const on = playing() && partsMode();
    picker.classList.toggle('is-keyboard', on);
    if (!on) { picker.replaceChildren(); return; }
    picker.replaceChildren(float, hints, choices, el('div', { class: 'keyboard-keys' }, deleteButton, guessButton));
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
      head, board, picker, result, live));
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
  return {
    refresh() { ui.message = null; build(); },
    destroy() {
      clearInterval(timer); clearTimeout(resultTimer); clearTimeout(frameTimer); closePowerSheet();
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', onResize);
    }
  };
}
