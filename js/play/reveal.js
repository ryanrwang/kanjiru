/*
 * What a hint shows when it's used: an animation for each effect
 * (js/config/powers.js), so a hint is something that happens, not just a
 * new line of text.
 *
 * Hints that tell you something play on a card over the board, which stays
 * until the player is done with it (Done at its foot); then the card goes
 * and their clue lights up where it lives. Kanji are drawn the way the
 * kanji guide draws them
 * (js/play/frame.js), bigger, so a card and the board always agree:
 *   revealStrokes  per kanji, its frame, its strokes drawn as 正 tally
 *                  marks (how Japanese counts), then the number
 *   revealLayout   per kanji, its frame's places coming in one by one
 *   revealMeaning  the meaning, written in with a brush wipe, in the
 *                  interface's language where the answer has one
 *   kanji          a guide frame tapped: every frame, with all it knows
 * Hints that change the board play on it:
 *   revealParts    the part drops into its cell, and its key flashes
 *   revealKanji    the kanji's cells drop in, one after another
 *   eliminateParts a broom crosses the keyboard on a band of colour; each
 *                  key it clears shakes, greys and is crossed off
 *   addGuesses     the new row grows in
 *   pointNear      each yellow tile's arrow slides out toward its part,
 *                  one tile after another
 *
 *   const shown = showCard({ board, effect, result, clues, known, glyph, onDone });   // or null
 *     known: the guide's frames (js/play/frame.js), one per kanji
 *   shown.dismiss();
 *   playOnBoard({ effect, result, cells, keyOf, palette, addedRow, arrows });
 *
 * Every time comes from the transition tokens. Under reduced motion the
 * card shows still and the board just changes.
 */
import { POWERS } from '../registry.js';
import { t } from '../i18n.js';
import { el } from '../dom.js';
import { meaningText } from './hints.js';
import { kanjiFrame, strokesLine, frameLabel, zoneCount } from './frame.js';

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

// Stroke count: n strokes drawn as 正 tally marks, and the line the guide
// shows under a frame (strokesLine) counting up with them, all in `draw`
// ms from `start`.
function strokesOf(n, start, draw, timers) {
  const step = n ? draw / n : 0;
  const marks = [];
  for (let k = 0; k < n; k += PER_MARK) marks.push(tallyMark(Math.min(PER_MARK, n - k), start + k * step, step));
  const line = strokesLine(n);
  const number = line.querySelector('.frame-strokes-n');
  if (!reducedMotion()) {
    number.textContent = '0';
    for (let k = 1; k <= n; k += 1) {
      timers.push(setTimeout(() => { number.textContent = String(k); }, start + k * step));
    }
    timers.push(setTimeout(() => number.classList.add('is-done'), start + draw));
  }
  return [el('div', { class: 'tally', 'aria-hidden': 'true' }, marks), line];
}

// Per kanji, its frame (js/play/frame.js) with what's known under it.
// Stroke count (tally) and Layout (build) play one kanji after another,
// each in the same time (the long transition): its strokes drawn, or its
// places coming in.
function kanjiBody({ known, glyph }, { tally = false, build = false }, timers) {
  const draw = ms('long');
  const gap = ms('base');
  const many = known.length > 1;
  let start = 0;
  const items = known.map((k, i) => {
    const zones = build ? zoneCount(k) : 0;
    const frame = kanjiFrame(k, {
      glyph, label: frameLabel(k, { slot: i, many }),
      build: zones && !reducedMotion() ? { first: start, step: draw / zones } : null
    });
    const strokes = k.strokes === null ? null : tally ? strokesOf(k.strokes, start, draw, timers) : strokesLine(k.strokes);
    const item = el('div', { class: 'reveal-item' }, frame, strokes,
      many ? el('p', { class: 'reveal-label', 'aria-hidden': 'true' }, t('game.reveal.kanji', { n: i + 1 })) : null);
    if (tally || build) start += draw + gap;
    return item;
  });
  return {
    body: el('div', { class: 'reveal-items', 'data-count': String(Math.min(known.length, 4)) }, items),
    time: start
  };
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

// Each card: what it draws, from what the hint found. `kanji` is a guide
// frame tapped: every frame, with all it knows.
const CARDS = {
  revealStrokes: (result, ctx) => (result.strokes ? (timers) => kanjiBody(ctx, { tally: true }, timers) : null),
  revealLayout: (result, ctx) => (result.layout ? (timers) => kanjiBody(ctx, { build: true }, timers) : null),
  kanji: (result, ctx) => (ctx.known.length ? (timers) => kanjiBody(ctx, {}, timers) : null),
  revealMeaning: (result, ctx) => () => meaningBody(ctx.clues)
};
// A card's title: its hints' icons and names.
const NAMES = { revealStrokes: 'game.clue.strokes', revealLayout: 'game.clue.layout', revealMeaning: 'game.clue.meaning' };
function titleOf(effect, result) {
  const effects = effect === 'kanji'
    ? [result.strokes ? 'revealStrokes' : null, result.layout ? 'revealLayout' : null].filter(Boolean)
    : [effect];
  if (!effects.length) return [el('span', {}, t('game.clue.guide'))];
  return effects.map((e) => [el('span', { class: 'hint-show-icon', 'aria-hidden': 'true' }, iconOf(e)), el('span', {}, t(NAMES[e]))]);
}

// Keys that leave the card up: moving the focus, and a modifier on its own.
const STAY = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);

// The card over the board for a hint that tells you something, or null
// for one that plays on the board. Tapping the meaning above the keyboard
// or a guide frame opens its card again (effect 'revealMeaning' or
// 'kanji'). It stays until the player is done with it (2026-11-10, the
// user asked): Done at its foot, a tap beside it, or a key (Escape, or a
// game key, which goes on to the game too: the card only steps aside);
// onDone() follows. Done takes the focus, and gives it back after.
export function showCard({ board, effect, result, clues, known = [], glyph, onDone = () => {} }) {
  const make = CARDS[effect] && CARDS[effect](result, { clues, known, glyph });
  if (!make) return null;
  const timers = [];
  const made = make(timers);
  if (!made) return null;
  const back = document.activeElement;
  let gone = false;
  let card = null;
  let done = null;
  const dismiss = () => {
    if (gone) return;
    gone = true;
    timers.forEach(clearTimeout);
    document.removeEventListener('keydown', onKey, true);
    if (card.contains(document.activeElement) && back && back.isConnected) back.focus({ preventScroll: true });
    card.classList.add('is-leaving');
    setTimeout(() => { card.remove(); onDone(); }, reducedMotion() ? 0 : ms('base'));
  };
  // Enter or Space on Done is Done's own; Escape is the card's alone.
  function onKey(event) {
    if (STAY.has(event.key) || (event.target === done && (event.key === 'Enter' || event.key === ' '))) return;
    if (event.key === 'Escape') event.preventDefault();
    dismiss();
  }
  done = el('button', {
    class: 'btn btn-primary hint-show-done', type: 'button', 'data-id': 'card-done', onclick: dismiss
  }, t('game.reveal.done'));
  const title = el('p', { class: 'hint-show-title' }, titleOf(effect, result));
  card = el('div', { class: 'hint-show', 'data-effect': effect },
    el('div', { class: 'hint-show-card', role: 'group', 'aria-label': title.textContent },
      title, made.body, done));
  if (reducedMotion()) card.classList.add('is-still');
  board.querySelectorAll('.hint-show').forEach((old) => old.remove());
  board.append(card);
  done.focus({ preventScroll: true });

  // A tap beside the card closes it; on the card, only Done does.
  card.addEventListener('click', (event) => { if (!event.target.closest('.hint-show-card')) dismiss(); });
  setTimeout(() => { if (!gone) document.addEventListener('keydown', onKey, true); }, 0);
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
//   arrows    the arrows the Arrows hint put on the board's yellow tiles
export function playOnBoard({ effect, result, cells = [], keyOf, palette, addedRow, arrows = [] }) {
  const step = ms('base');
  if (effect === 'revealParts' && result.parts) {
    playOn(cells, 'is-dropped', (node, i) => i * step);
    playOn(result.parts.map((p) => keyOf(p.el)), 'is-flash');
  } else if (effect === 'revealKanji' && result.kanji) {
    playOn(cells, 'is-dropped', (node, i) => i * step);
  } else if (effect === 'eliminateParts' && result.eliminated && palette) {
    if (reducedMotion()) return;
    // Once the hints modal has gone (lead), a broom crosses the keyboard on
    // a band of the accent colour (across); each key it clears shakes off
    // its dust as the broom reaches it, then greys and is crossed off.
    const box = palette.getBoundingClientRect();
    const lead = ms('base');
    const across = ms('long') + ms('reveal');
    const at = (node) => {
      const r = node.getBoundingClientRect();
      return lead + (box.width ? ((r.left + r.width / 2 - box.left) / box.width) * across : 0);
    };
    playOn(result.eliminated.map(keyOf), 'is-swept', at);
    const streak = el('span', {
      class: 'sweep-streak', 'aria-hidden': 'true',
      style: { '--sweep-lead': `${lead}ms`, '--sweep-time': `${across}ms` }
    }, el('span', { class: 'sweep-broom' }, iconOf(effect)));
    palette.append(streak);
    streak.addEventListener('animationend', (event) => { if (event.target === streak) streak.remove(); });
  } else if (effect === 'addGuesses' && addedRow) {
    playOn([addedRow], 'is-added');
  } else if (effect === 'pointNear') {
    playOn(arrows, 'is-pointed', (node, i) => ms('base') + i * step);
  }
}
