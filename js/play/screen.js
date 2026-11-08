/*
 * The game screen for one mode's daily or practice game: the board, the
 * hints, the parts picker and, once it's over, the result card.
 *
 *   const screen = openGame(root, { data, engine, glyph, mode, kind, ...callbacks });
 *   screen.refresh();   // after a language change
 *   screen.destroy();   // when leaving
 *
 * Making a guess depends on the game's level (js/config/levels.js guess;
 * docs/DESIGN.md, "Levels"):
 *   kanji  tap parts on the puzzle's palette to narrow the strip of kanji
 *          built from them, easiest first (narrow() in js/engine/palette.js).
 *          Tapping a kanji puts it in the next row with its meaning; tapping
 *          it again, or Guess, makes the guess. A typed kanji works too.
 *          With a longer answer, each tapped kanji fills the next slot.
 *   parts  like Wordle: every row shows from the start, one cell per part,
 *          grouped by kanji, and the parts sit below as a keyboard with
 *          Delete and Guess keys. One cell of the next row is selected: a
 *          tapped part fills it and the next empty cell is selected; tapping
 *          a cell selects it. No strip, no meanings. Above each kanji's
 *          cells, a frame builds it from the parts found green; with
 *          countLeft, the number of kanji that still fit sits under it.
 *          With places (levels.js; Hard), a line above the board names each
 *          cell's place, and the keyboard shows the selected cell's place's
 *          parts (tilesForPlace in js/engine/palette.js).
 * Hints (the power bar) open from a button in the head; clues already
 * found stay on show under the board.
 *
 * The board keeps the rows already drawn, so a new row's reveal plays once
 * and redrawing the picker never replays it.
 */
import { MODES, POWER, LEVEL } from '../registry.js';
import { t } from '../i18n.js';
import { el } from '../dom.js';
import * as store from '../store.js';
import { narrow, tilesForPlace } from '../engine/palette.js';
import { MARKS } from '../engine/score.js';
import { stats } from '../engine/stats.js';
import { localDate, answersFor } from '../engine/daily.js';
import * as session from './session.js';
import { renderClues, renderPowerBar, whyNot, openPowerSheet, closePowerSheet } from './hints.js';
import { renderResult } from './result.js';

const BULB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>';
const DELETE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 5H9l-7 7 7 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>';
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
  let frameTimer = null;
  let frameShown = null;   // keys the frame last showed, so new ones animate
  let doneRows = 0;

  // Parts that stay put between redraws.
  let input;
  let guessButton;
  let deleteButton;
  // The board: the rows in a column, and at parts levels the kanji frames
  // above them (sized by fitBoard).
  const board = el('div', { class: 'board' });
  const grid = el('div', { class: 'board-grid' });
  const frames = el('div', { class: 'board-frames' });
  const shape = el('div', { class: 'board-shape' });
  const boardDone = el('div', { class: 'board-rows', role: 'list' });
  const boardNext = el('div', { class: 'board-rows' });
  const head = el('div');
  const hints = el('div', { class: 'game-hints', id: 'game-hints' });
  const picker = el('div', { class: 'picker' });
  const message = el('p', { class: 'status-line', role: 'status' });
  const choices = el('div', { class: 'picker-choices' });
  const result = el('div', { class: 'game-result' });
  const live = el('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  grid.append(frames, shape, boardDone, boardNext);
  board.append(grid);

  function freshUi() {
    return {
      picked: [],      // kanji levels: palette tiles picked, in order
      entry: '',       // kanji levels: the next guess, tapped in the strip or typed
      cells: game ? emptyCells() : [],   // parts levels: a tile id or null per cell
      active: 0,       // parts levels: the selected cell, which a tapped part fills
      frameFrom: null, // parts levels: the state the frame shows while a row reveals
      hintsOpen: false, // the power bar is open
      message: null,   // { kind: 'error' | 'info', text }
      newRow: -1,      // the row to reveal
      points: game && game.done ? engine.points(game.state) : null
    };
  }

  const state = () => game.state;
  const playing = () => state().status === 'playing';
  const level = () => LEVEL[state().level];
  const partsMode = () => level().guess === 'parts';
  const meaningOf = (word) => (word && [...word].length === 1 && data.kanji[word]
    ? data.kanji[word].meanings.slice(0, 3).join(t('game.meaningSep')) : '');
  const rowMeaning = (word) => (level().meanings ? meaningOf(word) : '');
  // Mark words: places count unless it's a parts level without them.
  const markText = (mark) => t(`${partsMode() && !level().places ? 'game.markParts' : 'game.mark'}.${mark}`);

  // Parts levels: each kanji of the answer has as many cells as parts.
  // (Declarations, so freshUi() can use them before this line runs.)
  function cellCounts() { return [...game.state.answer].map((ch) => data.kanji[ch].parts.length); }
  function emptyCells() { return Array(cellCounts().reduce((a, b) => a + b, 0)).fill(null); }
  // Each cell's place, per slot, at a level with places; otherwise null.
  const places = () => (partsMode() && level().places
    ? [...state().answer].map((ch) => data.kanji[ch].parts.map((p) => p.pos)) : null);
  // Cells, one group per kanji (kept together when rows wrap), with a gap
  // where the place changes.
  const laidOut = (perSlot) => {
    const pl = places();
    return perSlot.map((nodes, s) => el('span', { class: 'row-slot' },
      nodes.map((node, i) => [pl && i && pl[s][i] !== pl[s][i - 1] ? el('span', { class: 'cell-gap' }) : null, node])));
  };
  // How many kanji still fit (engine.fits), for the next row; one state at a time.
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
  const placeName = ({ slot, pos }, i) => {
    const name = pos ? t(`pos.${pos}`) : String(i + 1);
    return cellCounts().length > 1 ? t('game.placeOfSlot', { n: slot + 1, place: name }) : name;
  };

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
      // Parts levels show every row instead.
      partsMode() ? null : el('span', { class: 'pill game-count', title: t('game.countTitle') },
        t('game.count', { n: s.guesses.length, rows: s.rows })),
      playing() ? hintsButton() : null));
  }

  // Opens and closes the power bar (renderHints).
  function hintsButton() {
    const node = el('button', {
      class: `icon-btn hints-btn${ui.hintsOpen ? ' is-open' : ''}`, type: 'button',
      title: t('game.powers.title'), 'aria-label': t('game.powers.title'),
      'aria-expanded': String(ui.hintsOpen), 'aria-controls': 'game-hints',
      onclick: () => { ui.hintsOpen = !ui.hintsOpen; renderHead(); renderHints(); }
    });
    node.innerHTML = BULB;
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

  function guessRow(g, i, reveal) {
    let n = 0;
    const perSlot = g.slots.map((slot) => slot.tiles.map((tile) => tileNode(tile, n++)));
    const row = g.parts
      ? el('div', { class: `board-row${reveal ? ' is-new' : ''}`, role: 'listitem', 'aria-label': rowLabel(g, i) },
        el('span', { class: 'row-tiles', 'aria-hidden': 'true' }, laidOut(perSlot)))
      : el('div', { class: `board-row${reveal ? ' is-new' : ''}`, role: 'listitem', 'aria-label': rowLabel(g, i) },
        el('span', { class: 'row-kanji kanji', lang: 'ja', 'aria-hidden': 'true' }, g.word || ''),
        el('span', { class: 'row-tiles', 'aria-hidden': 'true' }, perSlot.map((nodes, s) => [s ? el('span', { class: 'row-gap' }) : null, nodes])),
        el('span', { class: 'row-meaning', 'aria-hidden': 'true' }, rowMeaning(g.word)));
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
      el('span', { class: 'row-meaning' }, word ? meaningOf(word)
        : [...state().answer].length > 1 ? t('game.nextHintWord', { n: [...state().answer].length }) : t('game.nextHint')));
  }

  // Parts levels: the next row's cells. Each is a button that selects it;
  // the selected one takes the next tapped part.
  function pendingCells() {
    let n = 0;
    const filled = ui.cells.filter(Boolean).length;
    const where = cellPlaces();
    const perSlot = cellCounts().map((count) => Array.from({ length: count }, () => {
      const i = n++;
      const id = ui.cells[i];
      const place = placeName(where[i], i);
      return el('button', {
        class: `tile is-cell is-pending ${id ? 'is-filled' : 'is-empty'}${i === ui.active ? ' is-active' : ''}`,
        type: 'button', lang: 'ja',
        'aria-pressed': String(i === ui.active),
        'aria-label': id ? t('game.cellFilled', { place, part: id }) : t('game.cellEmpty', { place }),
        onclick: () => selectCell(i)
      }, id ? glyph(id) : null);
    }));
    return el('div', { class: 'board-row is-next', role: 'group', 'aria-label': t('game.cells', { n: filled, cells: ui.cells.length }) },
      el('span', { class: 'row-tiles' }, laidOut(perSlot)));
  }

  // Parts levels: a row not reached yet.
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

  // At a level with places: each cell's place, above the board.
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

  // ── Board size (parts levels) ──────────────────────────────────────

  // Largest first: the board takes the biggest cells and frame that fit.
  const CELL_SIZES = [['xl', 'cellXl'], ['lg', 'cellLg'], ['md', 'cellMd'], ['base', 'cell'], ['sm', 'cellSm'], ['xs', 'cellXs']];
  const FRAME_SIZES = [['base', 'frame'], ['sm', 'frameSm']];
  // When the keyboard isn't up (the game is over), the rows may take this
  // share of the screen's height.
  const ROWS_HEIGHT = 0.5;

  // Parts levels: sizes the board to the space and the answer, so it works
  // for any number of kanji and parts. Cells are the largest size whose rows
  // fit the width on one line and, with the head, frames, place names and
  // keyboard, the screen's height, as in Wordle. Each kanji's frame sits
  // above its cells, no wider than them. If even the smallest cells are too
  // wide, rows wrap between kanji (data-wrap).
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
    const counts = cellCounts();
    const pl = places();
    // Per kanji: its place changes, each a wider gap (laidOut).
    const turns = counts.map((n, s) => (pl ? pl[s].filter((pos, i) => i && pos !== pl[s][i - 1]).length : 0));
    const slotWidth = (c, s) => counts[s] * c + (counts[s] - 1) * xs + turns[s] * sm;
    const slotWidths = (c) => counts.map((n, s) => slotWidth(c, s));
    const rowWidth = (c) => slotWidths(c).reduce((a, b) => a + b, 0) + (counts.length - 1) * md;
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
    // Height: everything else on the screen while the keyboard is up (its
    // hints and message come and go, so they don't count), plus the frames
    // (with their count) and place names; else a share of the screen.
    const keyboard = picker.isConnected && picker.classList.contains('is-keyboard');
    const others = keyboard
      ? head.offsetHeight + picker.offsetHeight - hints.offsetHeight - message.offsetHeight + 2 * md
        + (pl ? px(tk.spacing.lg) + xs : 0)
      : 0;
    const framesHeight = (c) => frameOfSize(c).px + xs + (level().countLeft ? md + xs : 0);
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
      const fits = (x) => Math.max(...slotWidths(x.px)) <= width;
      const c = cells.find((x) => fits(x) && fitsHeight(x.px, lines(x.px)))
        || [...cells].reverse().find(fits) || cells[cells.length - 1];
      pick = { cell: c.id, frame: frameFor(c.px), wrap: true };
    }
    board.dataset.cell = pick.cell;
    board.dataset.frame = pick.frame;
    board.toggleAttribute('data-wrap', !!pick.wrap);
  }

  // ── Kanji frame (parts levels) ─────────────────────────────────────

  // Where each place sits in the frame: top and bottom span the width;
  // left, inner and right share the middle; outer, whole and none cover it all.
  const COVER = ['outer', 'whole', 'none'];
  function frameAreas(order) {
    const mid = ['left', 'inner', 'right'].filter((pos) => order.includes(pos));
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

  // One frame per kanji of the answer: its shape, with each part found green
  // (by a guess or a power: state.found) in its place, and a dot for each
  // part still hidden. A solved kanji shows whole. While a row reveals, the
  // frame shows the state before it (ui.frameFrom), then catches up.
  // The frames are laid out like a row (styles.css), so above the rows each
  // one centres over its kanji's cells: a slot n cells and g place gaps wide.
  function renderFrame() {
    if (!partsMode()) { frames.replaceChildren(); return; }
    const s = ui.frameFrom || state();
    const pl = places();
    const counts = cellCounts();
    const solved = new Set(engine.clues(s).solved);
    const seen = new Set();
    const isNew = (k) => { seen.add(k); return frameShown !== null && !frameShown.has(k); };
    // How many kanji still fit each slot (countLeft), under its frame.
    const fit = level().countLeft ? (s === state() ? fitsNow() : engine.fits(s).map((list) => list.length)) : null;
    const slots = [...s.answer].map((ch, slot) => {
      const node = el('span', { class: 'frame-slot' },
        frameOf(s, ch, slot, solved.has(slot), isNew),
        fit && !solved.has(slot) ? el('span', { class: 'frame-count', title: t('game.fitTitle') }, t('game.fitCount', { n: fit[slot] })) : null);
      node.style.setProperty('--n', counts[slot]);
      node.style.setProperty('--g', pl ? pl[slot].filter((pos, i) => i && pos !== pl[slot][i - 1]).length : 0);
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
    const found = (i) => s.found[`${slot}:${i}`] === 'hit';
    const said = parts.filter((p, i) => found(i)).map((p) => t('game.framePart', { part: p.form || p.el, place: t(`pos.${p.pos}`) }));
    return el('span', {
      class: `kanji-frame${order.includes('outer') ? ' has-outer' : ''}`,
      style: frameAreas(order),
      role: 'img',
      'aria-label': t('game.frameLabel', { parts: said.length ? said.join(t('game.listSep')) : t('game.frameEmpty') })
    }, order.map((pos) => {
      const here = parts.map((p, i) => ({ p, i })).filter(({ p }) => p.pos === pos);
      const cover = COVER.includes(pos);
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

    const next = [];
    if (partsMode()) {
      // Every row, like Wordle: the next one, then blanks.
      if (s.status === 'playing') next.push(pendingCells());
      const blanks = s.rows - s.guesses.length - (s.status === 'playing' ? 1 : 0);
      for (let k = 0; k < blanks; k += 1) next.push(blankRow());
    } else if (s.status === 'playing') {
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

  // Clues already found always show; the power bar only while it's open
  // (the Hints button in the head).
  function renderHints() {
    if (!playing()) { hints.replaceChildren(); return; }
    hints.replaceChildren(...[
      renderClues({ engine, state: state(), mode, glyph }),
      ui.hintsOpen ? renderPowerBar({ engine, state: state(), inventory: store.get().inventory, onPick: pickPower }) : null
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

  // Parts levels with places: the marks for one place's parts. A part
  // tried in this place shows the mark it got here, so green means "right
  // here". Otherwise a part in the answer shows yellow (it's somewhere) and
  // one ruled out shows grey.
  function placeMarks(g) {
    const known = knownMarks();
    if (!g.pos) return known;
    const s = state();
    const here = new Map();
    const note = (id, mark) => { if (!here.has(id) || rank(mark) > rank(here.get(id))) here.set(id, mark); };
    s.guesses.forEach((guess) => {
      const slot = guess.slots[g.slot];
      if (slot) slot.tiles.forEach((tile) => { if (tile.pos === g.pos) note(tile.el, tile.mark); });
    });
    engine.clues(s).parts.forEach((p) => { if (p.slot === g.slot && p.pos === g.pos) note(p.el, 'hit'); });
    const out = new Map();
    known.forEach((mark, id) => out.set(id, here.get(id) || (mark === 'hit' ? 'near' : mark)));
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
    deleteButton = el('button', {
      class: 'btn btn-secondary key-delete', type: 'button', title: t('game.delete'), 'aria-label': t('game.delete'),
      onclick: () => (partsMode() ? deletePart() : deleteKanji())
    });
    deleteButton.innerHTML = DELETE;
  }

  // Parts levels: a tapped part fills the selected cell, then the next
  // empty cell is selected (the selection stays put when all are full).
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

  // Parts levels: Delete empties the selected cell, or when it's already
  // empty, the one before it, which it selects (like a backspace).
  function deletePart() {
    let i = ui.active;
    if (!ui.cells[i] && i > 0) i -= 1;
    ui.cells[i] = null;
    ui.active = i;
    say(null, '');
    renderBoard();
    renderChoices();
  }

  // Kanji levels: Delete takes the last kanji off the guess.
  function deleteKanji() {
    ui.entry = [...ui.entry].slice(0, -1).join('');
    input.value = ui.entry;
    say(null, '');
    renderBoard();
    renderChoices();
  }

  function togglePick(id) {
    ui.picked = ui.picked.includes(id) ? ui.picked.filter((x) => x !== id) : [...ui.picked, id];
    renderChoices();
  }

  // Kanji levels: a tapped kanji fills the guess's next slot (or swaps the
  // last one once all are full), then the picked parts reset for the next
  // kanji. Tapping the last one again makes the guess.
  function choose(ch) {
    const n = [...state().answer].length;
    const chars = [...ui.entry];
    if (chars.length === n && chars[n - 1] === ch) { submit(); return; }
    if (chars.length >= n) chars.length = n - 1;
    chars.push(ch);
    ui.entry = chars.join('');
    input.value = ui.entry;
    if (chars.length < n) ui.picked = [];
    say('info', chars.length < n ? t('game.chosenNext', { n: chars.length + 1 })
      : n === 1 ? t('game.chosen', { kanji: ch, meaning: meaningOf(ch) })
        : t('game.chosenWord', { word: ui.entry, kanji: ch }));
    renderBoard();
    renderChoices();
  }

  function strip(kanji) {
    if (!ui.picked.length) return el('p', { class: 'strip-hint' }, t('game.stripHint'));
    // One kanji: a kanji already guessed can't be picked again.
    const guessed = new Set([...state().answer].length === 1 ? state().guesses.map((g) => g.word) : []);
    const chosen = new Set([...ui.entry]);
    return el('div', { class: 'strip' },
      el('div', { class: 'strip-head' },
        el('span', { class: 'strip-picked', lang: 'ja' }, ui.picked.map((id) => el('span', { class: 'strip-part' }, glyph(id)))),
        el('span', { class: 'strip-count' }, t('game.matches', { n: kanji.length })),
        el('button', {
          class: 'btn btn-ghost btn-small', type: 'button',
          onclick: () => { ui.picked = []; renderChoices(); }
        }, t('game.clear'))),
      el('div', { class: 'strip-kanji' }, kanji.map((ch) => el('button', {
        class: `strip-btn kanji${chosen.has(ch) ? ' is-chosen' : ''}`,
        type: 'button', lang: 'ja',
        disabled: guessed.has(ch),
        'aria-pressed': String(chosen.has(ch)),
        title: meaningOf(ch),
        onclick: () => choose(ch)
      }, ch))));
  }

  // The palette's buttons, by stroke count.
  //   ids      the tiles to show, in palette order
  //   marks    tile → its mark (colour)
  //   pressed  id → true when it's picked
  //   combine  the tiles that still combine with the picks (the rest grey
  //            out), or null for none greyed (parts levels)
  //   onTap    id → what a tap does
  //   strokes  label each stroke count (off for the parts keyboard)
  function palette({ ids, marks, pressed, combine = null, onTap, label, strokes = true }) {
    const tileOf = new Map(data.tiles.map((tile) => [tile.id, tile]));
    const groups = [];
    ids.forEach((id) => {
      const n = tileOf.get(id).strokes;
      if (!groups.length || groups[groups.length - 1].n !== n) groups.push({ n, ids: [] });
      groups[groups.length - 1].ids.push(id);
    });
    const tileButton = (id) => {
      const tile = tileOf.get(id);
      const picked = pressed(id);
      const usable = !combine || picked || combine.has(id);
      const mark = marks.get(id);
      // The most used other form (氵 for 水) shows small in the corner.
      const variants = tile.forms.filter((f) => f.glyph !== id).sort((a, b) => b.uses - a.uses).slice(0, 1);
      return el('button', {
        class: `tile is-cell palette-tile${mark ? ` is-${mark}` : ''}${usable ? '' : ' is-out'}`,
        type: 'button', lang: 'ja',
        'aria-pressed': String(picked),
        disabled: !usable,
        'aria-label': mark ? `${id} ${markText(mark)}` : id,
        onclick: () => onTap(id)
      },
        glyph(id),
        variants.length ? el('span', { class: 'palette-variant', 'aria-hidden': 'true' }, variants.map((f) => glyph(f.glyph))) : null);
    };
    return el('div', { class: 'palette', role: 'group', 'aria-label': label },
      groups.map((g) => el('div', { class: 'palette-group' },
        strokes ? el('span', { class: 'palette-strokes', title: t('game.strokes', { n: g.n }) }, String(g.n)) : null,
        g.ids.map(tileButton))));
  }

  // Parts levels: the keyboard. With places (Hard), only the selected
  // cell's place's parts, named above them; tapping a cell switches place.
  function partsChoices() {
    const where = cellPlaces()[ui.active] || { slot: 0, pos: null };
    const place = where.pos ? placeName(where, ui.active) : null;
    return [
      place ? el('p', { class: 'keyboard-place' }, t('game.palettePlace', { place })) : null,
      palette({
        ids: where.pos ? tilesForPlace(data, state().palette, where.pos) : state().palette,
        marks: placeMarks(where),
        pressed: (id) => ui.cells[ui.active] === id,
        onTap: addPart,
        label: place ? t('game.palettePlace', { place }) : t('game.palette'),
        strokes: false
      })
    ];
  }

  function renderChoices() {
    if (!playing()) { choices.replaceChildren(); return; }
    if (partsMode()) { choices.replaceChildren(...partsChoices().filter(Boolean)); return; }
    const { kanji, tiles } = narrow(data, state().palette, ui.picked);
    choices.replaceChildren(strip(kanji), palette({
      ids: state().palette,
      marks: knownMarks(),
      pressed: (id) => ui.picked.includes(id),
      combine: tiles,
      onTap: togglePick,
      label: t('game.palette')
    }));
  }

  // Parts levels: a keyboard at the bottom, as in Wordle: the clues and
  // hints (so they show above it), any message, the parts, then Delete and
  // Guess. Kanji levels: the entry first, with the hints above the picker.
  function renderPicker() {
    const parts = partsMode();
    picker.classList.toggle('is-keyboard', parts && playing());
    if (!playing()) { picker.replaceChildren(); return; }
    picker.replaceChildren(...(parts
      ? [hints, message, choices, el('div', { class: 'keyboard-keys' }, deleteButton, guessButton)]
      : [el('div', { class: 'entry' }, input, deleteButton, guessButton), message, choices]));
    renderChoices();
  }

  // ── Guessing ───────────────────────────────────────────────────────

  function submit() {
    const parts = partsMode();
    const word = (ui.entry || '').trim();
    if (parts ? ui.cells.includes(null) : !word) {
      say('error', t(parts ? 'game.errors.slots' : 'game.errors.empty', { cells: ui.cells.length }));
      return;
    }
    const r = engine.guess(state(), parts ? picksBySlot() : word);
    if (r.error) { say('error', t(`game.errors.${r.error}`, { n: [...state().answer].length, cells: ui.cells.length })); return; }
    const before = state();
    game = { ...game, state: r.state };
    const row = r.state.guesses.length - 1;
    ui.newRow = row;
    ui.picked = [];
    ui.entry = '';
    ui.cells = emptyCells();
    ui.active = 0;
    // The frame catches up once the row has flipped.
    clearTimeout(frameTimer);
    ui.frameFrom = parts && !reducedMotion() ? before : null;
    if (ui.frameFrom) {
      frameTimer = setTimeout(() => { ui.frameFrom = null; renderFrame(); }, revealTime(r.state.guesses[row]));
    }
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
    clearTimeout(frameTimer);
    ui.frameFrom = null;
    frameShown = null;
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
    // Parts levels keep the hints inside the keyboard (renderPicker).
    root.replaceChildren(el('section', { class: 'game', 'aria-labelledby': 'game-title' },
      head, board, partsMode() ? null : hints, picker, result, live));
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
