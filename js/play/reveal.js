/*
 * What a hint shows when it's used: an animation for each effect
 * (js/config/powers.js), so a hint is something that happens, not just a
 * new line of text.
 *
 * Hints that tell you something play on a card over the board, then the
 * card goes and their clue lights up above the keyboard. Tapping the clue
 * there opens its card again:
 *   revealStrokes  per kanji, the strokes drawn as 正 tally marks (how
 *                  Japanese counts), then the number
 *   revealLayout   per kanji, a square that splits into its places
 *   revealMeaning  the meaning, written in with a brush wipe, in the
 *                  interface's language where the answer has one
 * Hints that change the board play on it:
 *   revealParts    the part drops into its cell, and its key flashes
 *   revealKanji    the kanji's cells drop in, one after another
 *   eliminateParts a sweep crosses the keyboard, greying the keys it clears
 *   addGuesses     the new row grows in
 *
 *   const shown = showCard({ board, effect, result, clues, onDone });   // or null
 *     effect: a hint's effect, or 'kanji' (strokes and layout together)
 *   shown.dismiss();
 *   playOnBoard({ effect, result, cells, keyOf, palette, addedRow });
 *
 * Every time comes from the transition tokens. Under reduced motion the
 * card shows still and the board just changes.
 */
import { POWERS } from '../registry.js';
import { t } from '../i18n.js';
import { el } from '../dom.js';
import { meaningText, layoutGrid } from './hints.js';

const SVG = 'http://www.w3.org/2000/svg';
const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ms = (key) => parseFloat(window.TOKENS.active().transition[key]) || 0;
const iconOf = (effect) => (POWERS.find((p) => p.effect === effect) || {}).icon || '';

// One 正 tally mark: its five strokes in writing order (top, the middle
// down, the short bar right, the left leg, the base), in a 24 box.
const TALLY = ['M4 4H20', 'M12 4V20', 'M12 12H18', 'M6 12V20', 'M3 20H21'];
const PER_MARK = TALLY.length;

function tallyMark(strokes, first, step) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'tally-mark');
  TALLY.slice(0, strokes).forEach((d, i) => {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '1');
    path.style.setProperty('--at', `${first + i * step}ms`);
    svg.append(path);
  });
  return svg;
}

const kanjiLabel = (count, i) => (count > 1 ? t('game.reveal.kanji', { n: i + 1 }) : null);

// Layout: a square that splits into its places, one after another
// (layoutGrid in js/play/hints.js): top and bottom span it, the middle
// places share a row, and an outer part frames an inset inner one.
function layoutBox(positions, first, step) {
  const g = layoutGrid(positions);
  const zone = (pos, i, extra = {}) => {
    const node = el('span', { class: `layout-zone is-${pos}`, style: extra }, t(`pos.${pos}`));
    node.style.setProperty('--at', `${first + i * step}ms`);
    return node;
  };
  if (g.outer) {
    return el('span', { class: 'layout-box has-outer' },
      zone('outer', 0),
      el('span', { class: 'layout-inner' }, g.rest.map((pos, i) => zone(pos, i + 1))));
  }
  return el('span', { class: 'layout-box', style: g.style }, g.order.map((pos, i) => zone(pos, i, { gridArea: pos })));
}

// Stroke count: n strokes drawn as 正 tally marks, the number counting up
// with them, all in `draw` ms from `start`.
function strokesOf(n, start, draw, timers) {
  const step = n ? draw / n : 0;
  const marks = [];
  for (let k = 0; k < n; k += PER_MARK) marks.push(tallyMark(Math.min(PER_MARK, n - k), start + k * step, step));
  const number = el('span', { class: 'reveal-number' }, reducedMotion() ? String(n) : '0');
  if (!reducedMotion()) {
    for (let k = 1; k <= n; k += 1) {
      timers.push(setTimeout(() => { number.textContent = String(k); }, start + k * step));
    }
    timers.push(setTimeout(() => number.classList.add('is-done'), start + draw));
  }
  return [el('div', { class: 'tally' }, marks),
    el('p', { class: 'reveal-figure' }, number, el('span', { class: 'reveal-unit' }, t('game.reveal.strokesUnit', { n })))];
}

// Per kanji, one after another, each in the same time (the long
// transition): its layout splitting, its strokes drawn, or both at once.
// A kanji guide frame tapped shows all it knows, a solved kanji whole.
function kanjiBody({ strokes = null, layout = null, kanji = null }, timers) {
  const count = (strokes || layout || kanji).length;
  const draw = ms('long');
  const gap = ms('base');
  let start = 0;
  const items = Array.from({ length: count }, (_, i) => {
    const places = layout ? new Set(layout[i]).size : 0;
    const solved = kanji && kanji[i];
    const item = el('div', { class: 'reveal-item' },
      solved ? el('span', { class: 'reveal-kanji kanji', lang: 'ja' }, solved)
        : layout ? layoutBox(layout[i], start, places ? draw / places : 0) : null,
      strokes ? strokesOf(strokes[i], start, draw, timers) : null,
      kanjiLabel(count, i) ? el('p', { class: 'reveal-label' }, kanjiLabel(count, i)) : null);
    start += draw + gap;
    return item;
  });
  return { body: el('div', { class: 'reveal-items' }, items), time: start };
}

// Meaning: written in from the left, like a brush across the page.
function meaningBody(clues) {
  const meaning = meaningText(clues);
  if (!meaning) return null;
  return {
    body: el('p', { class: 'reveal-meaning', lang: meaning.lang }, meaning.text),
    time: ms('long')
  };
}

// Each card: what it draws, from what the hint found. `kanji` is the
// kanji clue reopened: the strokes and layout known so far, together.
const CARDS = {
  revealStrokes: (result) => (result.strokes ? (timers) => kanjiBody({ strokes: result.strokes }, timers) : null),
  revealLayout: (result) => (result.layout ? (timers) => kanjiBody({ layout: result.layout }, timers) : null),
  kanji: (result) => (result.strokes || result.layout || (result.kanji || []).some(Boolean)
    ? (timers) => kanjiBody(result, timers) : null),
  revealMeaning: (result, clues) => () => meaningBody(clues)
};
// A card's title: its hints' icons and names.
const NAMES = { revealStrokes: 'game.clue.strokes', revealLayout: 'game.clue.layout', revealMeaning: 'game.clue.meaning' };
function titleOf(effect, result) {
  const effects = effect === 'kanji'
    ? [result.strokes ? 'revealStrokes' : null, result.layout ? 'revealLayout' : null].filter(Boolean)
    : [effect];
  if (!effects.length) return el('span', {}, t('game.clue.guide'));
  return effects.map((e) => [el('span', { class: 'hint-show-icon' }, iconOf(e)), el('span', {}, t(NAMES[e]))]);
}

// The card over the board for a hint that tells you something, or null
// for one that plays on the board. Tapping a clue above the keyboard opens
// its card again (effect 'kanji' or 'revealMeaning'). It goes by itself once it's had time
// to be read (transition.message after the animation), or on a tap or key;
// onDone() follows.
export function showCard({ board, effect, result, clues, onDone = () => {} }) {
  const make = CARDS[effect] && CARDS[effect](result, clues);
  if (!make) return null;
  const timers = [];
  const made = make(timers);
  if (!made) return null;
  const card = el('div', { class: 'hint-show', 'aria-hidden': 'true', 'data-effect': effect },
    el('div', { class: 'hint-show-card' },
      el('p', { class: 'hint-show-title' }, titleOf(effect, result)),
      made.body,
      el('p', { class: 'hint-show-tap' }, t('game.reveal.tap'))));
  if (reducedMotion()) card.classList.add('is-still');
  board.querySelectorAll('.hint-show').forEach((old) => old.remove());
  board.append(card);

  let gone = false;
  const dismiss = () => {
    if (gone) return;
    gone = true;
    timers.forEach(clearTimeout);
    document.removeEventListener('keydown', dismiss, true);
    card.classList.add('is-leaving');
    setTimeout(() => { card.remove(); onDone(); }, reducedMotion() ? 0 : ms('base'));
  };
  card.addEventListener('click', dismiss);
  // A key goes on to the game too: the card only steps aside.
  setTimeout(() => { if (!gone) document.addEventListener('keydown', dismiss, true); }, 0);
  timers.push(setTimeout(dismiss, (reducedMotion() ? 0 : made.time) + ms('message')));
  return { dismiss };
}

// Plays a one-off animation class on nodes, each waiting its turn (--at),
// and takes it off once done.
function playOn(nodes, cls, at = () => 0) {
  if (reducedMotion()) return;
  nodes.forEach((node, i) => {
    if (!node) return;
    node.style.setProperty('--at', `${at(node, i)}ms`);
    node.classList.add(cls);
    node.addEventListener('animationend', () => node.classList.remove(cls), { once: true });
  });
}

// Hints that change the board, after it has been redrawn:
//   cells     the next row's cells the hint filled, in order
//   keyOf(id) a key on the keyboard
//   palette   the keyboard's key grid
//   addedRow  the row an extra guess added
export function playOnBoard({ effect, result, cells = [], keyOf, palette, addedRow }) {
  const step = ms('base');
  if (effect === 'revealParts' && result.parts) {
    playOn(cells, 'is-dropped', (node, i) => i * step);
    playOn(result.parts.map((p) => keyOf(p.el)), 'is-flash');
  } else if (effect === 'revealKanji' && result.kanji) {
    playOn(cells, 'is-dropped', (node, i) => i * step);
  } else if (effect === 'eliminateParts' && result.eliminated && palette) {
    if (reducedMotion()) return;
    // The sweep crosses the keyboard in the long transition; each key it
    // clears greys as it passes.
    const box = palette.getBoundingClientRect();
    const across = ms('long');
    const at = (node) => {
      const r = node.getBoundingClientRect();
      return box.width ? ((r.left + r.width / 2 - box.left) / box.width) * across : 0;
    };
    playOn(result.eliminated.map(keyOf), 'is-swept', at);
    const streak = el('span', { class: 'sweep-streak', 'aria-hidden': 'true' });
    palette.append(streak);
    streak.addEventListener('animationend', () => streak.remove(), { once: true });
  } else if (effect === 'addGuesses' && addedRow) {
    playOn([addedRow], 'is-added');
  }
}
