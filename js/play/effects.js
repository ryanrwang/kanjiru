/*
 * Win effects (settings.effect, js/config/skins.js): what plays when a
 * puzzle is solved. The same pieces play over the board in a game
 * (celebrate) and as each effect's example on the Points page (example).
 * The motion is all CSS (styles.css, "Win effects"); this file builds the
 * pieces and starts them.
 *
 *   const stop = celebrate('petals', { board, row, answer, numeral });
 *   stop();   // leaving early
 *   stage.append(...example('petals', { tiles, drawn, numeral }));
 *
 *   none      nothing
 *   draw      the answer written out with a brush
 *   wave      the solved row's tiles hop one after another
 *   confetti  paper bits in the game's colours tumble down
 *   petals    petals drift down
 *   glow      a gold shine sweeps the solved row
 *   seal      the game's hanko is stamped on
 *   hanabi    fireworks burst
 *
 * A game plays none under reduced motion; the examples show a still.
 */
import { el } from '../dom.js';

// Where pieces start, as a % of the stage: petals and confetti across the
// top (x, and y for the still picture), sparks in bursts (x, y). The board
// is bigger than an example, so it gets more of each.
const PETALS = [[8, 20], [26, 60], [44, 30], [62, 70], [80, 40], [92, 10]];
const BITS = [[6, 15], [18, 55], [30, 25], [42, 70], [54, 10], [66, 50], [78, 30], [90, 65]];
const BURSTS = { small: [[30, 45], [70, 35]], big: [[25, 30], [72, 24], [50, 56]] };
const SPARKS = { small: 8, big: 12 };
// The board's extra pieces sit between the example's.
const more = (list, dx) => [...list, ...list.map(([x, y]) => [(x + dx) % 100, (y + 37) % 100])];

const ROW_EFFECTS = ['wave', 'glow'];   // played on the solved row's own tiles

function pieces(id, big) {
  if (id === 'petals') {
    const list = big ? more(PETALS, 11) : PETALS;
    return el('span', { class: 'fx' }, list.map(([x, y], i) => el('span', {
      class: 'fx-petal', style: { '--i': (i * 5) % PETALS.length, '--x': x, '--y': y }
    })));
  }
  if (id === 'confetti') {
    const list = big ? more(more(BITS, 5), 9) : BITS;
    return el('span', { class: 'fx' }, list.map(([x, y], i) => el('span', {
      class: 'fx-bit', style: { '--i': (i * 3) % BITS.length, '--x': x, '--y': y, '--a': `${(i * 47) % 180}deg` }
    })));
  }
  if (id === 'hanabi') {
    const size = big ? 'big' : 'small';
    const n = SPARKS[size];
    return el('span', { class: 'fx' }, BURSTS[size].flatMap(([x, y], b) => Array.from({ length: n }, (_, i) => el('span', {
      class: 'fx-spark', style: { '--b': b, '--x': x, '--y': y, '--a': `${(360 / n) * i}deg` }
    }))));
  }
  return null;
}

// What an effect's example holds, on the Points page: the solved tiles it
// plays over (or the drawn kanji), then its pieces.
//   tiles    nodes: a solved row
//   drawn    the kanji Brush draw writes
//   numeral  the game's seal (modes.js)
export function example(id, { tiles, drawn, numeral }) {
  if (id === 'draw') return [el('span', { class: 'fx-kanji kanji', lang: 'ja' }, drawn)];
  if (id === 'seal') return [...tiles, el('span', { class: 'fx-seal kanji', lang: 'ja' }, numeral)];
  return [...tiles, pieces(id, false)].filter(Boolean);
}

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// How long an effect plays over the board, in ms: three long transitions
// (.fx-board's --fx-time), or 0 when none plays. The game screen waits for
// it before the page glides down to the result.
export function effectTime(id) {
  if (!id || id === 'none' || reducedMotion()) return 0;
  return (parseFloat(window.TOKENS.active().transition.long) || 0) * 3;
}

// Plays an effect over the board once a game is won. Returns stop(), which
// ends it early; it also ends itself when it's done.
//   board    the board, which the pieces cover
//   row      the solved row, for the effects played on its tiles
//   answer   the word, for Brush draw
//   numeral  the game's seal (modes.js)
export function celebrate(id, { board, row, answer, numeral }) {
  if (!effectTime(id) || !board) return () => {};
  let layer = null;
  if (ROW_EFFECTS.includes(id)) {
    if (row) row.classList.add(`fx-${id}`);
  } else {
    let content = null;
    if (id === 'draw') {
      content = el('span', { class: 'fx-kanji-card' },
        el('span', { class: 'fx-kanji kanji', lang: 'ja', 'data-len': String([...answer].length) }, answer));
    }
    else if (id === 'seal') content = el('span', { class: 'fx-seal kanji', lang: 'ja' }, numeral);
    else content = pieces(id, true);
    if (!content) return () => {};
    layer = el('div', { class: 'fx fx-board is-playing', 'data-effect': id, 'aria-hidden': 'true' },
      content.classList && content.classList.contains('fx') ? [...content.childNodes] : content);
    // How far pieces fall: the board's height.
    layer.style.setProperty('--fx-h', `${board.clientHeight}px`);
    board.append(layer);
  }
  let timer = 0;
  const stop = () => {
    clearTimeout(timer);
    if (layer) layer.remove();
    if (row) row.classList.remove(`fx-${id}`);
  };
  timer = setTimeout(stop, effectTime(id));
  return stop;
}
