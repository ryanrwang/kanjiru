/*
 * The game screen for one mode's daily or "keep playing" game: the board,
 * the keyboard, the hints and, once it's over, the result card.
 *
 *   const screen = openGame(root, { data, engine, glyph, mode, kind, ...callbacks });
 *   screen.refresh();   // after a language change
 *   screen.destroy({ keep });   // when leaving; keep: for a page of its own,
 *                               // so a game just over shows again on Close
 *
 * Like Wordle (docs/DESIGN.md, "The puzzle" and "Levels"): every row shows
 * from the start, one cell per part of the answer in writing order, and the
 * parts sit below as a keyboard with Delete and Guess keys. One cell of the
 * next row is selected: a tapped part fills it and the next empty cell is
 * selected; tapping a cell selects it. The keyboard keeps the same keys in
 * the same spots for the whole game. A part a power showed (Reveal a part,
 * Reveal a kanji) shows faintly in its empty cell on each new row, and a
 * tap on that cell once selected puts it in; at Hard it must be there
 * (engine.shownCells).
 *
 * Above the rows, the kanji guide: a frame per kanji with all that's known
 * about it (renderFrame, drawn by js/play/frame.js): solved, Guided's shape
 * and parts, Layout's places, and Stroke count's number under it, in a
 * centred row: always in Guided, otherwise once something is known. Once
 * the split is known (Guided, or the Layout hint) each kanji's cells keep
 * close together, with a wide gap between kanji (grouped()).
 *
 * The level (js/config/levels.js; the play card's switches) changes the board:
 *   Normal      one row of cells: where one kanji ends is for the player to
 *               work out. A kanji shows above its cells once it's solved.
 *   Guided      (showSplit) each kanji's cells apart, their places named, a
 *               frame per kanji built from the parts found green, and the
 *               keys that can't go in the selected cell dimmed (tilesForPlace in js/engine/palette.js).
 *   Hard        (realKanji) each row shows the kanji its parts make.
 * The site header reads 漢 › Play (漢 › the answer once the result shows),
 * with the hints held as a pill on the right (app.js asks head()). It opens the hints
 * modal (js/play/hints.js): each hint, how many you hold, and Use, which
 * asks once more. A hint used plays its animation (js/play/reveal.js), on
 * a card over the board or on the board itself, and its clue stays on
 * show above the keyboard. A hint you hold none of can be bought there
 * (js/shop.js). When the game ends, its rewards show as toasts and on the
 * result card.
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
import { MODES, POWER, LEVEL, ECONOMY } from '../registry.js';
import { t } from '../i18n.js';
import { el } from '../dom.js';
import * as store from '../store.js';
import { tilesForPlace } from '../engine/palette.js';
import { MARKS } from '../engine/score.js';
import { stats, games } from '../engine/stats.js';
import { localDate, answersFor } from '../engine/daily.js';
import * as session from './session.js';
import { renderClues, hintsFor, whyNot, openHints, closeHints } from './hints.js';
import { kanjiFrame, strokesLine, frameLabel, guideShown as framesShow, knownKanji } from './frame.js';
import { showCard, playOnBoard } from './reveal.js';
import { renderResult } from './result.js';
import { describe } from './rewards.js';
import { powerOffer, buyPower } from '../shop.js';
import { toast } from '../toast.js';
import { ask, closeAsk } from '../confirm.js';
import { celebrate, effectTime } from './effects.js';

// The ask before ending a game early: End game under the keyboard
// (endGame below) and the flag beside Continue on the play page (app.js).
// Give up, or in a game that isn't a daily, a new puzzle; an × to stay
// (2026-11-10, the user asked: no Cancel, no guesses line, short notes).
// Resolves to the option's id, or null.
export function askEnd(state) {
  return ask({
    icon: '🏳️',
    title: t('game.end.title'),
    closeX: true,
    options: [
      { id: 'give-up', name: t('game.end.giveUp'), desc: t('game.end.giveUpDesc'), danger: true },
      state.daily ? null : { id: 'new', name: t('game.end.new'), desc: t('game.end.newDesc') }
    ].filter(Boolean)
  });
}

const FLAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/></svg>';

const DELETE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 5H9l-7 7 7 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>';

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rank = (mark) => MARKS.indexOf(mark);

// A transition token's easing (cubic-bezier(x1, y1, x2, y2)) as a function
// of time, 0 to 1, for motion CSS can't do, like scrolling the page.
function easing(css) {
  const m = /cubic-bezier\(([^)]+)\)/.exec(css || '');
  if (!m) return (x) => x;
  const [x1, y1, x2, y2] = m[1].split(',').map(Number);
  const at = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (x) => {
    let lo = 0;
    let hi = 1;
    let s = x;
    for (let i = 0; i < 24; i += 1) {
      s = (lo + hi) / 2;
      if (at(x1, x2, s) < x) lo = s; else hi = s;
    }
    return at(y1, y2, s);
  };
}

// Calls step(p) once a frame for time ms, p going 0 to 1 by ease, and last
// with 1. Returns stop().
function tween(time, ease, step) {
  const start = performance.now();
  let frame = 0;
  const tick = (now) => {
    const x = time > 0 ? Math.min(1, Math.max(0, (now - start) / time)) : 1;
    step(x === 1 ? 1 : ease(x));
    if (x < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

// The row being typed when the screen last closed (Settings or Points opened
// from the header, which are pages of their own): back in the same game at
// the same guess, it's still there.
let draft = null;

// The game just over, kept when the screen closes for a page of its own
// (Spend them on the result opens Points; Settings, Credits), so Close
// comes back to its result instead of a new puzzle (2026-11-10, the user
// asked). The play page forgets it (forgetEnded(), app.js): Play from
// there starts afresh.
let ended = null;
export function forgetEnded() { ended = null; }

// callbacks: onHome(), onPractice() (daily → keep playing), onWallet()
// (points or hints held changed, or the game ended: the header redraws,
// asking head()), onReload() (a new day: open the route again).
export function openGame(root, ctx) {
  const { data, engine, glyph, mode, kind } = ctx;
  // options.skip: an answer a new practice game mustn't be (New puzzle).
  const open = (options = {}) => (kind === 'practice'
    ? session.openPractice(engine, data, mode, options)
    : session.openDaily(engine, data, mode));

  const back = ended && ended.mode === mode.id && ended.kind === kind ? ended : null;
  ended = null;
  let game = back ? back.game : open();
  let ui = freshUi();
  // Back at a game just over: its result as it was, without its toasts or
  // its points rising again (again), and the board where it was (held).
  if (back) Object.assign(ui, { points: back.points, rewards: back.rewards, toasted: back.toasted, again: back.toasted, held: back.held });
  const draftKey = () => `${mode.id}/${kind}/${game.start.answer}/${game.state.guesses.length}/${ui.cells.length}`;
  if (game && draft && draft.key === draftKey()) {
    ui.cells = draft.cells;
    ui.active = draft.active;
  }
  draft = null;
  let timer = null;
  let resultTimer = null;
  let frameTimer = null;
  let frameShown = null;   // keys the frame last showed, so new ones animate
  let stopFx = () => {};   // ends the win effect playing over the board
  let stopGlide = () => {};   // calls off the page's glide to the result
  let doneRows = 0;
  // Whether the rows drawn have the Arrows hint's arrows, and are grouped
  // by kanji (grouped()): a change redraws them.
  let doneArrows = false;
  let doneGrouped = false;
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
  const hints = el('div', { class: 'game-hints' });
  const picker = el('div', { class: 'picker' });
  // Floats above the keyboard: the message.
  const float = el('div', { class: 'picker-float' });
  const message = el('p', { class: 'status-line', role: 'status' });
  float.append(message);
  let card = null;   // the hint card over the board (js/play/reveal.js)
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
      message: null,   // { kind: 'error' | 'info', text }
      rowError: null,  // why the guess can't be made, under its row (sayRow)
      newRow: -1,      // the row to reveal
      points: game && game.done ? engine.points(game.state) : null,
      // What the game paid besides its points (session.finish), and whether
      // their toasts have shown.
      rewards: null,
      toasted: false,
      again: false,    // back at a game just over (ended): its result shown before
      // The board's size when the game ended here (showResult), kept until
      // the window's width changes (fitBoard).
      held: null
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
  // Whether the board shows where each kanji ends: Guided, or once the
  // Layout hint showed each kanji's shape (2026-11-10, the user asked).
  // Then each kanji's cells keep close together, with a wide gap between
  // kanji; otherwise the cells are one even row.
  const grouped = () => partsMode() && (splitShown() || !!engine.clues(state()).layout);
  // The cells' groups on the board: one per kanji when grouped, else one
  // for the whole word.
  const groupCounts = () => (grouped() ? cellCounts() : [cellCounts().reduce((a, b) => a + b, 0)]);
  // Each cell's place, per slot, when the board shows places (Guided, or an
  // old level with places); otherwise null.
  const places = () => (partsMode() && (level().showSplit || level().places)
    ? [...state().answer].map((ch) => data.kanji[ch].parts.map((p) => p.pos)) : null);
  // Cells in their groups (kept together when rows wrap), with a gap where
  // the place changes when places show.
  const laidOut = (perSlot) => {
    if (!grouped()) return el('span', { class: 'row-slot' }, perSlot.flat());
    const pl = places();
    return perSlot.map((nodes, s) => el('span', { class: 'row-slot' },
      nodes.map((node, i) => [pl && i && pl[s][i] !== pl[s][i - 1] ? el('span', { class: 'cell-gap' }) : null, node])));
  };
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

  // The cells powers showed: cell → its part (engine.shownCells). A new
  // row doesn't start with them filled in (the user found that pushy,
  // 2026-11-10): each shows faintly in its empty cell instead, and a tap on
  // that cell once it's selected puts it in.
  const shownNow = () => new Map(engine.shownCells(state()).map((c) => [c.cell, c]));

  // ── Head ───────────────────────────────────────────────────────────

  // What the site header shows during a game (app.js): while it's on, the
  // hints held, which open the hints modal. Nothing under 漢 › Play: the
  // level and kind went (2026-11-10, the user asked).
  function head() {
    const s = state();
    const save = store.get();
    const on = playing() && partsMode();
    return {
      playing: on,
      held: hintsFor(s).reduce((n, p) => n + (store.held()[p.id] || 0), 0),
      // The first game's tip: the welcome bonus buys a hint, from here.
      // Gone once closed or the hints opened (hintTipSeen), after the first
      // game, or once the bonus is spent.
      tip: on && !save.settings.hintTipSeen && games(save.history).length === 0
        && store.points(save) >= ECONOMY.startingPoints,
      // The answer, for the header's crumb in Play's place, once the game
      // is over and its result shows (not while the last row reveals; the
      // user asked, 2026-11-11).
      answer: !playing() && result.hasChildNodes() ? s.answer : null
    };
  }

  // Ends the game early, at any time (End game, under the keyboard):
  // give up (a loss, the answer shows) or, in a game that isn't a daily, a
  // new puzzle (this one isn't recorded).
  async function endGame() {
    if (!playing()) return;
    const pick = await askEnd(state());
    if (!pick || !playing()) return;
    if (card) card.dismiss();
    if (pick === 'new') {
      const skipped = state().answer;
      session.skipPractice(mode);
      playAgain({ skip: skipped });
      say('info', t('game.end.skipped'));
      return;
    }
    const r = engine.giveUp(state());
    if (r.error) return;
    game = { ...game, state: r.state };
    finish();
    live.textContent = t('game.end.gaveUp');
    byKeyboard = false;
    renderHead();
    renderBoard();
    showResult({ focus: true });
  }
  const renderHead = () => ctx.onWallet();

  // ── Board ──────────────────────────────────────────────────────────

  // A scored tile; way ('left' or 'right', the Arrows hint) adds an arrow
  // at that edge, pointing to where its part lies.
  function tileNode(tile, i, way = null) {
    const node = el('span', { class: `tile is-cell is-${tile.mark}${way ? ' has-way' : ''}`, lang: 'ja' },
      glyph(tile.form), way ? el('span', { class: `tile-way is-${way}`, 'aria-hidden': 'true' }) : null);
    node.style.setProperty('--i', i);
    return node;
  }

  function rowLabel(g, i) {
    const ways = engine.arrows(state(), i);
    const parts = g.slots.flatMap((slot, s) => slot.tiles.map((tile, k) => {
      const way = ways && ways[s][k];
      return `${tile.form} ${markText(tile.mark)}${way ? t('game.listSep') + t(`game.way.${way}`) : ''}`;
    }));
    const list = parts.join(t('game.listSep'));
    return g.word ? t('game.rowLabel', { n: i + 1, word: g.word, parts: list }) : t('game.rowLabelParts', { n: i + 1, parts: list });
  }

  // Hard: the kanji a row's parts make, hanging off its right edge, so the
  // cells stay centred (fitBoard leaves room for it on both sides).
  const madeColumn = (word) => (madeShown() && word ? el('span', { class: 'row-made kanji', lang: 'ja', 'aria-hidden': 'true' }, word) : null);

  function guessRow(g, i, reveal) {
    let n = 0;
    const ways = engine.arrows(state(), i);
    const perSlot = g.slots.map((slot, s) => slot.tiles.map((tile, k) => tileNode(tile, n++, ways && ways[s][k])));
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
  // one takes the next tapped part. A cell holding the part a power showed
  // there is green; an empty one shows that part faintly (a ghost).
  function pendingCells() {
    let n = 0;
    const filled = ui.cells.filter(Boolean).length;
    const shown = shownNow();
    const perSlot = cellCounts().map((count) => Array.from({ length: count }, () => {
      const i = n++;
      const id = ui.cells[i];
      const known = id && shown.has(i) && shown.get(i).el === id;
      const ghost = !id && shown.has(i) ? shown.get(i) : null;
      const label = known ? 'game.cellShown' : id ? 'game.cellFilled' : ghost ? 'game.cellGhost' : 'game.cellEmpty';
      return el('button', {
        class: `tile is-cell is-pending ${known ? 'is-hit' : id ? 'is-filled' : `is-empty${ghost ? ' is-ghost' : ''}`}${i === ui.active ? ' is-active' : ''}`,
        type: 'button', lang: 'ja', 'data-id': `cell-${i}`, 'data-index': i,
        tabindex: i === ui.active ? '0' : '-1',
        'aria-pressed': String(i === ui.active),
        'aria-label': t(label, { cell: cellName(i), part: id || (ghost && ghost.form) }),
        onclick: () => selectCell(i)
      }, id ? glyph(known ? shown.get(i).form : id)
        : ghost ? el('span', { class: 'cell-ghost', 'aria-hidden': 'true' }, glyph(ghost.form)) : null);
    }));
    return el('div', {
      class: `board-row is-next${ui.rowError ? ' is-error' : ''}`, role: 'group', 'aria-describedby': 'game-cells-help',
      'aria-label': t('game.cells', { n: filled, cells: ui.cells.length })
    },
      el('span', { class: 'row-tiles' }, laidOut(perSlot)),
      ui.rowError ? rowErrorNode(ui.rowError) : null);
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
  // when cells are at the base size or smaller. The frames sit in a centred
  // row, no bigger than a cell if they can be. Grouped by kanji, a wide gap
  // (spacing.lg) parts the kanji, and if even the smallest cells are too
  // wide, rows wrap between kanji (data-wrap).
  // Sizes are layout tokens; styles.css keys on the board's data-cell and
  // data-frame, and the keyboard's data-keys.
  function fitBoard() {
    const keyboard = picker.isConnected && picker.classList.contains('is-keyboard');
    // A game just over keeps the board as it was played (showResult): its
    // size, its height and the rows where they were, so nothing moves as
    // the result takes the keyboard's place (styles.css .is-held); until
    // the width changes (a phone's bar coming and going changes only the
    // height).
    const held = partsMode() && !keyboard && ui.held && ui.held.width === window.innerWidth ? ui.held : null;
    board.classList.toggle('is-held', !!held);
    if (held) board.style.setProperty('--held-h', `${held.height}px`);
    else board.style.removeProperty('--held-h');
    if (!partsMode()) {
      ['cell', 'frame', 'wrap'].forEach((k) => board.removeAttribute(`data-${k}`));
      picker.removeAttribute('data-keys');
      return;
    }
    if (held) {
      board.dataset.cell = held.cell;
      board.dataset.frame = held.frame;
      board.toggleAttribute('data-wrap', held.wrap);
      picker.removeAttribute('data-keys');
      sizeResult();
      return;
    }
    const tk = window.TOKENS.active();
    const px = (v) => parseFloat(v) || 0;
    const xs = px(tk.spacing.xs);
    const sm = px(tk.spacing.sm);
    const md = px(tk.spacing.md);
    // Between kanji, when grouped (styles.css .board.is-parts .row-tiles).
    const between = px(tk.spacing.lg);
    const counts = groupCounts();
    const split = splitShown();
    const pl = split ? places() : null;
    // Per group: its place changes, each a wider gap (laidOut).
    const turns = counts.map((n, s) => (pl ? pl[s].filter((pos, i) => i && pos !== pl[s][i - 1]).length : 0));
    const slotWidth = (c, s) => counts[s] * c + (counts[s] - 1) * xs + turns[s] * sm;
    const slotWidths = (c) => counts.map((n, s) => slotWidth(c, s));
    // Hard's word hangs off the right of the rows (styles.css .row-made).
    const made = madeShown() ? sm + px(tk.spacing['2xl']) : 0;
    const rowWidth = (c) => slotWidths(c).reduce((a, b) => a + b, 0) + (counts.length - 1) * between + made;
    const width = board.clientWidth;
    const rows = state().rows;
    const sizes = (list) => list.map(([id, key]) => ({ id, px: px(tk.layout[key]) }));
    const cells = sizes(CELL_SIZES);
    const frameSizes = sizes(FRAME_SIZES);
    const keySizes = sizes(KEY_SIZES);
    // The frames, in a centred row that fits the width, each no bigger
    // than a cell if it can be.
    const kanjiCount = cellCounts().length;
    const framesFor = (c) => {
      const fit = frameSizes.filter((x) => kanjiCount * x.px + (kanjiCount - 1) * md <= width);
      const sizes = fit.length ? fit : frameSizes.slice(-1);
      const small = sizes.filter((x) => x.px <= c);
      return small.length ? small : sizes.slice(-1);
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
      // Everything above the board (the site header), the gap to the
      // keyboard, and the keyboard.
      const above = Math.max(0, board.getBoundingClientRect().top + window.scrollY);
      const fixed = above + md + picker.offsetHeight
        + (pl ? px(tk.spacing.lg) + xs : 0) - keyRows * keyNow;
      others = (k) => fixed + keyRows * k;
    }
    // The kanji guide, when it shows: its frames, the stroke counts under
    // them once Stroke count is used, and the room under it (its margin).
    const guide = guideShown(state());
    const strokesHeight = guide && engine.clues(state()).strokes ? md + xs : 0;
    const guideGap = guide ? parseFloat(getComputedStyle(frames).marginBottom) || 0 : 0;
    const framesHeight = (c, f) => (guide ? f + xs + strokesHeight + guideGap : 0);
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
          if (used && used + between + w > width) { n += 1; used = w; } else used += (used ? between : 0) + w;
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
    sizeResult();
  }

  // The result card's answer row (a game not solved) takes the board's
  // cell size, so its tiles match the rows' (2026-11-10, the user asked).
  function sizeResult() {
    if (board.dataset.cell) result.dataset.cell = board.dataset.cell;
    else result.removeAttribute('data-cell');
  }

  // ── Kanji guide ────────────────────────────────────────────────────

  // The kanji guide (2026-11-10): one frame per kanji of the answer, above
  // the rows, holding everything known about it from the level and the
  // hints (js/play/frame.js, the same frame the hint cards and history
  // draw), so it works with none, any or all of them:
  //   solved       the kanji itself, on green (a guess, or Reveal a kanji)
  //   parts found  each part found green (by a guess or a power:
  //                state.found) where it sits in the kanji
  //   its shape    Guided, or the Layout hint: a box per place, with a dot
  //                for each part still hidden (the same frame either way)
  //   Stroke count its strokes, on a line under the frame
  // The frames sit in a centred row over the rows (the user asked for
  // that over each frame above its kanji's cells, 2026-11-10). In Guided
  // they're always there; otherwise they show once something is known: a
  // part found green is enough (2026-11-10, the user asked).
  // Tapping a frame opens the kanji card (js/play/reveal.js). While a row
  // reveals, the guide shows the state before it (ui.frameFrom), then
  // catches up.
  function knownOf(s) {
    const c = engine.clues(s);
    const solved = new Set(c.solved);
    return knownKanji(s.answer, data, {
      found: (slot, i) => s.found[`${slot}:${i}`] === 'hit',
      solved: (slot) => solved.has(slot),
      shape: splitShown() || !!c.layout,
      strokes: !!c.strokes
    });
  }

  function guideShown(s) {
    return partsMode() && framesShow(knownOf(s), splitShown());
  }

  function renderFrame() {
    const s = ui.frameFrom || state();
    const show = guideShown(s);
    board.classList.toggle('has-guide', show);
    // Not shown yet: whatever shows first is new, and comes in.
    if (!show) { frames.replaceChildren(); frameShown = new Set(); return; }
    const seen = new Set();
    const known = knownOf(s);
    const slots = known.map((k, slot) => {
      const isNew = (key) => {
        const id = `${slot}:${key}`;
        seen.add(id);
        return frameShown !== null && !frameShown.has(id);
      };
      return el('button', {
        class: 'frame-slot', type: 'button', 'data-id': `frame-${slot}`, title: t('game.clue.again'),
        onclick: () => openClue('kanji')
      },
        kanjiFrame(k, { glyph, isNew, label: frameLabel(k, { slot, many: known.length > 1 }) }),
        k.strokes !== null ? strokesLine(k.strokes) : null,
        el('span', { class: 'visually-hidden' }, t('game.clue.again')));
    });
    frames.classList.add('is-centred');
    frames.dataset.effects = 'revealStrokes revealLayout revealKanji';
    frames.replaceChildren(el('span', { class: 'frame-row' }, slots));
    frameShown = seen;
  }

  function renderBoard() {
    const s = state();
    board.classList.toggle('is-parts', partsMode());
    board.classList.toggle('is-flat', partsMode() && !grouped());
    board.classList.toggle('has-made', madeShown());
    if (board.isConnected) fitBoard();
    renderFrame();
    renderShape();
    boardDone.setAttribute('aria-label', t('game.board'));
    const arrowsOn = engine.clues(s).arrows;
    const groupedOn = grouped();
    if (doneRows > s.guesses.length || arrowsOn !== doneArrows || groupedOn !== doneGrouped) {
      boardDone.replaceChildren();
      doneRows = 0;
      doneArrows = arrowsOn;
      doneGrouped = groupedOn;
    }
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

  // What the hints found shows above the keyboard (js/play/hints.js); the
  // clue a card just showed lights up once the card has gone (reveal()),
  // and a tap on it opens its card again.
  function renderHints() {
    if (!playing()) { hints.replaceChildren(); return; }
    hints.replaceChildren(...[renderClues({ engine, state: state(), onOpen: openClue })].filter(Boolean));
  }

  // A clue's card again: the kanji (the guide's frames, bigger: solved,
  // Guided's parts, layout, strokes) or the meaning. Tapped again while it
  // shows, it closes.
  function openClue(which) {
    const c = engine.clues(state());
    if (card && card.which === which) { card.dismiss(); return; }
    if (card) card.dismiss();
    const shown = showCard({
      board, effect: which, clues: c, known: knownOf(state()), glyph,
      result: { strokes: c.strokes, layout: c.layout },
      onDone: () => { if (card === shown) card = null; }
    });
    if (shown) { shown.which = which; card = shown; }
  }

  // The hints modal (the pill in the header): Use asks once more; a hint
  // you hold none of and could use now can be bought there.
  function pickHints() {
    if (!playing() || !partsMode()) return;
    openHints({
      powers: hintsFor(state()),
      read: (id) => {
        const held = store.held()[id] || 0;
        const free = hintsFree();
        return {
          held,
          free,
          points: store.points(),
          why: whyNot(engine, state(), POWER[id], free ? 1 : held),
          offer: engine.canUse(state(), id) ? null : powerOffer(id)
        };
      },
      ask: () => store.get().settings.confirmHintBuy !== false,
      onBuy: (id, { never }) => {
        if (!buyPower(id)) return false;
        if (never) store.update((s) => { s.settings.confirmHintBuy = false; });
        renderHead();
        return true;
      },
      onUse: (id) => usePower(id)
    });
  }

  // Debug mode (Settings): every hint is free, held or not, and using one
  // spends nothing (2026-11-10, the user asked, for testing).
  const hintsFree = () => !!store.get().settings.debug;

  function usePower(id) {
    const free = hintsFree();
    if (!free && !(store.held()[id] > 0)) return;
    const before = state();
    const r = engine.usePower(before, id);
    if (r.error) { say('error', whyNot(engine, before, POWER[id], 1)); return; }
    if (!free) session.spendPower(id);
    game = { ...game, state: r.state };
    session.progress(mode, game);
    const { effect } = POWER[id];
    live.textContent = t('game.powers.used', { name: t(`power.${id}.name`) });
    renderHead();
    renderHints();   // before the board, which fits around the clues
    renderBoard();
    renderChoices();
    reveal(effect, r.result, before);
  }

  // The hint's animation (js/play/reveal.js): a card over the board for one
  // that tells you something, whose clue lights up when it goes; else on
  // the board: the cells it filled, the keys it swept (and a message saying
  // how many, for an eye that's on the board), the row it added.
  function reveal(effect, result, before) {
    if (card) card.dismiss();
    const shown = showCard({
      board, effect, result, clues: engine.clues(state()), known: knownOf(state()), glyph,
      onDone: () => {
        if (card === shown) card = null;
        // Its clue lights up where it now lives: the meaning above the
        // keyboard, the strokes and layout on the kanji guide's frames.
        const nodes = [...hints.querySelectorAll(`[data-effects~="${effect}"]`),
          ...(frames.dataset.effects || '').split(' ').includes(effect) ? frames.querySelectorAll('.kanji-frame') : []];
        if (reducedMotion()) return;
        nodes.forEach((node) => {
          node.classList.add('is-glow');
          node.addEventListener('animationend', () => node.classList.remove('is-glow'), { once: true });
        });
      }
    });
    card = shown;
    if (card) return;
    const shownBefore = new Set(engine.shownCells(before).map((c) => c.cell));
    const cells = engine.shownCells(state()).filter((c) => !shownBefore.has(c.cell))
      .map((c) => boardNext.querySelector(`[data-index="${c.cell}"]`));
    playOnBoard({
      effect, result, cells,
      keyOf: (id) => choices.querySelector(`[data-key="${CSS.escape(id)}"]`),
      palette: choices.querySelector('.palette'),
      addedRow: boardNext.lastElementChild,
      arrows: [...boardDone.querySelectorAll('.tile-way')]
    });
    if (effect === 'eliminateParts' && result.eliminated) say('info', t('game.powers.swept', { n: result.eliminated.length }));
    if (effect === 'pointNear') say('info', result.arrows ? t('game.powers.pointed', { n: result.arrows }) : t('game.powers.pointLater'));
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
  const messageTime = () => parseFloat(window.TOKENS.active().transition.message) || 0;
  function say(kind, text) {
    clearTimeout(messageTimer);
    clearRowError();
    ui.message = text ? { kind, text } : null;
    message.className = `status-line${ui.message && ui.message.kind === 'error' ? ' is-error' : ''}`;
    message.textContent = text || '';
    if (text) messageTimer = setTimeout(() => say(null, ''), messageTime());
  }

  // A guess that can't be made (2026-11-11, the user asked): the row being
  // entered shakes, its cells edged red, with why under it, until the next
  // key or a moment, like say().
  function sayRow(text) {
    say(null, '');
    ui.rowError = text;
    live.textContent = text;
    const row = boardNext.querySelector('.board-row.is-next');
    if (row) {
      row.classList.add('is-error');
      row.append(rowErrorNode(text));
      row.classList.remove('is-shake');
      void row.offsetWidth;
      row.classList.add('is-shake');
    }
    messageTimer = setTimeout(() => say(null, ''), messageTime());
  }

  const rowErrorNode = (text) => el('p', { class: 'row-error', 'aria-hidden': 'true' }, text);

  function clearRowError() {
    if (!ui.rowError) return;
    ui.rowError = null;
    const row = boardNext.querySelector('.board-row.is-next');
    if (!row) return;
    row.classList.remove('is-error', 'is-shake');
    row.querySelectorAll('.row-error').forEach((node) => node.remove());
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

  // Tapping the selected cell again puts in the part a hint showed there.
  function selectCell(i) {
    const ghost = shownNow().get(i);
    if (ui.active === i && !ui.cells[i] && ghost) { addPart(ghost.el); return; }
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
    // Drawn again: no longer on its way out (showResult).
    picker.inert = false;
    picker.classList.remove('is-leaving');
    const on = playing() && partsMode();
    picker.classList.toggle('is-keyboard', on);
    if (!on) { picker.replaceChildren(); return; }
    // Under the keys, End game: quiet, as it's rarely wanted (it was a flag
    // in the header until 2026-11-10; the user asked).
    const end = el('button', { class: 'btn btn-ghost btn-small picker-end', type: 'button', 'data-id': 'end-game', onclick: endGame });
    end.innerHTML = FLAG;
    end.append(t('game.end.open'));
    picker.replaceChildren(float, hints, choices, el('div', { class: 'picker-foot' }, end));
    renderChoices();
  }

  // ── Guessing ───────────────────────────────────────────────────────

  function submit() {
    if (!partsMode()) return;
    if (ui.cells.includes(null)) {
      sayRow(t('game.errors.slots', { cells: ui.cells.length }));
      return;
    }
    const r = engine.guess(state(), picksBySlot());
    if (r.error) {
      const detail = r.detail || {};
      sayRow(t(`game.errors.${r.error}`, { n: [...state().answer].length, cells: ui.cells.length, part: detail.part, cell: detail.cell }));
      return;
    }
    const before = state();
    game = { ...game, state: r.state };
    const row = r.state.guesses.length - 1;
    ui.newRow = row;
    if (card) card.dismiss();
    ui.cells = emptyCells();
    ui.active = 0;
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
    const over = !playing();

    keepFocus(() => {
      renderBoard();
      ui.newRow = -1;
      // The last guess: the keyboard stays where it is, still, until the
      // result takes its place (showResult), so nothing moves while the
      // row reveals.
      if (!over) {
        renderHints();
        renderPicker();
      }
    });
    if (over) picker.inert = true;
    renderHead();
    const shown = boardDone.lastElementChild;
    if (shown) shown.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    // The result, and on a win its effect, wait for the last row's reveal.
    if (over) {
      const wait = reducedMotion() ? 0 : revealTime(r.state.guesses[row]);
      resultTimer = setTimeout(showResult, wait);
    }
  }

  // The end of a game (its last row revealed, or given up): the keyboard
  // fades where it is, then goes, and the result card rises into its place.
  // The board stays as it was played (ui.held, fitBoard): same size, same
  // place (2026-11-10: the user found the old switch jumpy on desktop, the
  // board leaping up and its tiles shrinking). Anything that still moves
  // glides (settle). Then, on a win, its effect, and the page glides down
  // to the card (glideToResult). focus: the result's title takes the focus
  // (End game).
  function showResult({ focus = false } = {}) {
    clearTimeout(resultTimer);
    const calm = reducedMotion();
    const swap = () => {
      const before = grid.getBoundingClientRect().top;
      ui.held = {
        cell: board.dataset.cell, frame: board.dataset.frame, wrap: board.hasAttribute('data-wrap'),
        height: board.getBoundingClientRect().height, width: window.innerWidth
      };
      renderHints();
      renderPicker();
      renderBoard();
      renderResultCard({ arriving: !calm });
      renderHead();   // the crumb names the answer now it's shown
      settle(grid, before);
      const won = state().status === 'won';
      if (won) playWin();
      // On a win the effect plays first, the glide ending as it does.
      const effect = won ? effectTime(store.get().settings.effect) : 0;
      glideToResult(Math.max(0, effect - (parseFloat(window.TOKENS.active().transition.long) || 0)));
      if (focus) {
        const title = result.querySelector('#result-title');
        if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
      }
    };
    picker.inert = true;
    if (calm || !picker.classList.contains('is-keyboard')) { swap(); return; }
    picker.classList.add('is-leaving');
    resultTimer = setTimeout(swap, parseFloat(window.TOKENS.active().transition.base) || 0);
  }

  // Once the game is over, after wait ms, one eased motion brings the
  // result card into sight (2026-11-10, the user asked: it was out of sight
  // below the board, and a first try that only scrolled wasn't smooth). The
  // board lets go of the height it had with the keyboard up (ui.held), so
  // its rows and the card move up into the room the keyboard left; and if
  // the card still isn't all in sight, the page scrolls down to it at the
  // same pace, but no further than leaves half the grid in sight
  // (scrollGoal). Scrolling, a tap or a key calls it off where it is.
  function glideToResult(wait) {
    stopGlide();
    const tr = window.TOKENS.active().transition;
    const time = reducedMotion() ? 0 : parseFloat(tr.long) || 0;
    const events = ['wheel', 'touchstart', 'keydown'];
    const off = () => stopGlide();
    let pending = 0;
    let stopTween = () => {};
    stopGlide = () => {
      clearTimeout(pending);
      stopTween();
      events.forEach((type) => window.removeEventListener(type, off));
      stopGlide = () => {};
    };
    events.forEach((type) => window.addEventListener(type, off, { passive: true }));
    pending = setTimeout(() => {
      if (!result.isConnected || !result.firstElementChild) { stopGlide(); return; }
      // Where it all ends, measured with the board at its own height.
      const held = board.classList.contains('is-held');
      const from = board.getBoundingClientRect().height;
      if (held) board.style.removeProperty('--held-h');
      const to = board.getBoundingClientRect().height;
      const top = window.scrollY;
      const goal = scrollGoal();
      if (held) board.style.setProperty('--held-h', `${from}px`);
      stopTween = tween(time, easing(tr.glide), (p) => {
        if (held) {
          const h = from + (to - from) * p;
          board.style.setProperty('--held-h', `${h}px`);
          if (ui.held) ui.held.height = h;
        }
        if (goal !== null) window.scrollTo(0, top + (goal - top) * p);
        if (p === 1) stopGlide();
      });
    }, wait);
  }

  // How far down the page goes to show the result card under the site
  // header (which sticks): all of the card if it fits, else its top; but
  // never so far that less than half the grid is in sight, or the last row
  // played (a win's solved row) goes under the header. null when the card
  // is in sight already.
  function scrollGoal() {
    const head = document.querySelector('.app-header');
    const under = head ? head.getBoundingClientRect().bottom : 0;
    const gap = parseFloat(window.TOKENS.active().spacing.md) || 0;
    const card = result.getBoundingClientRect();
    const rows = grid.getBoundingClientRect();
    const last = boardDone.lastElementChild;
    const need = Math.min(card.top - under - gap, card.bottom + gap - window.innerHeight);
    const most = Math.min(rows.top + rows.height / 2 - under,
      last ? last.getBoundingClientRect().top - under - gap : Infinity,
      document.documentElement.scrollHeight - window.innerHeight - window.scrollY);
    const by = Math.min(need, most);
    return by > 0 ? window.scrollY + by : null;
  }

  // Slides a node from where it was (its top, before) to where it is now.
  function settle(node, before) {
    const dy = before - node.getBoundingClientRect().top;
    if (!dy || reducedMotion() || !node.animate) return;
    const tr = window.TOKENS.active().transition;
    node.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }],
      { duration: parseFloat(tr.slow) || 0, easing: tr.ease });
  }

  // The win effect in use (settings.effect) over the board (js/play/effects.js).
  function playWin() {
    stopFx();
    stopFx = celebrate(store.get().settings.effect, {
      board, row: boardDone.lastElementChild, answer: state().answer, numeral: mode.numeral
    });
  }

  // How long a row takes to reveal: one tile's time in the reveal in use
  // (styles.css --reveal-time on the board's [data-tiles]), then a step
  // more for each tile after the first.
  function revealTime(g) {
    const ms = (v) => parseFloat(v) || 0;
    const tr = window.TOKENS.active().transition;
    const one = ms(getComputedStyle(board).getPropertyValue('--reveal-time')) || ms(tr.reveal);
    const tiles = g.slots.reduce((n, slot) => n + slot.tiles.length, 0);
    return one + ms(tr.base) * Math.max(0, tiles - 1);
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

  // arriving: just finished, so the card rises in (styles.css .is-arriving).
  function renderResultCard({ arriving = false } = {}) {
    clearInterval(timer);
    result.classList.toggle('is-arriving', arriving);
    if (playing()) { result.replaceChildren(); return; }
    // Just finished: its rewards, shown once as toasts too. A daily shown
    // again: its rewards from the ledger.
    const fresh = !!ui.rewards && !ui.again;
    const rewards = ui.rewards || session.rewardsFor(mode, state());
    const card = renderResult({
      engine, data, mode, game, glyph,
      points: ui.points || engine.points(state()),
      streak: streak(),
      rewards: rewards.map(describe),
      balance: store.points(),
      fresh,
      // The tile reveal in use: the answer's row (a game not solved) plays
      // it as the card arrives.
      tiles: store.get().settings.tiles,
      reveal: arriving,
      onPractice: () => (kind === 'practice' ? playAgain() : ctx.onPractice()),
      onHome: ctx.onHome
    });
    result.replaceChildren(card.node);
    // Played from the keyboard: the result takes the focus the keys had,
    // leaving the scrolling to glideToResult.
    if (fresh && !ui.toasted && byKeyboard && (document.activeElement === document.body || !document.activeElement)) {
      const title = card.node.querySelector('#result-title');
      if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
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

  function playAgain(options = {}) {
    game = open(options);
    if (!game) { ctx.onHome(); return; }
    ui = freshUi();
    build();
    // The header shows this game's: End game and the hints, not the points.
    renderHead();
    window.scrollTo(0, 0);
  }

  // ── Whole screen ───────────────────────────────────────────────────

  function build() {
    stopFx();
    stopGlide();
    clearTimeout(resultTimer);
    clearTimeout(frameTimer);
    ui.frameFrom = null;
    frameShown = null;
    // The tile reveal style (settings.tiles): styles.css keys on it.
    board.setAttribute('data-tiles', store.get().settings.tiles);
    boardDone.replaceChildren();
    doneRows = 0;
    makeKeys();
    renderBoard();
    renderHints();
    renderPicker();
    renderResultCard();
    // The clues live inside the keyboard (renderPicker). The section is
    // named by the header's crumb (app.js).
    root.replaceChildren(el('section', { class: 'game', 'aria-labelledby': 'game-title' },
      board, picker, result, live,
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
    head,
    openHints: pickHints,
    // keep: closing for a page of its own (app.js), so a game just over is
    // kept to come back to (ended).
    destroy({ keep = false } = {}) {
      if (playing() && ui.cells.some(Boolean)) draft = { key: draftKey(), cells: ui.cells.slice(), active: ui.active };
      ended = keep && !playing()
        ? { mode: mode.id, kind, game, points: ui.points, rewards: ui.rewards, toasted: ui.toasted, held: ui.held }
        : null;
      clearInterval(timer); clearTimeout(resultTimer); clearTimeout(frameTimer); closeHints(); closeAsk(); stopFx(); stopGlide();
      if (card) card.dismiss();
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    }
  };
}
