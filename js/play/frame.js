/*
 * One kanji's frame (docs/DESIGN.md, "The kanji guide"): the one way the
 * game draws what's known about a kanji of the answer. The board's kanji
 * guide, the hint cards (Stroke count, Layout, a frame tapped) and the
 * games in history all draw it, so a kanji looks the same wherever it shows.
 *
 *   kanjiFrame(known, { glyph, isNew, build, label })   the frame
 *   strokesLine(n)                                      its stroke count, under it
 *   frameLabel(known, { slot, many })                   what a screen reader hears
 *   guideShown(knowns, split)                           whether a guide has anything to show
 *   knownKanji(answer, data, { ... })                   the known list, from what the game knows
 *
 * known, one per kanji: what the level and the hints have told, each
 * drawn the same way whichever told it:
 *   kanji     the kanji
 *   solved    true: shown whole, on green (a guess, or Reveal a kanji)
 *   parts     its parts ([{ el, form, pos }])
 *   found(i)  true when part i has been found green (a guess, or Reveal a part)
 *   shape     true when its shape is known (Guided, or the Layout hint): a
 *             dashed box per place, each part found in it and a dot for
 *             each part still hidden. false: only the parts found show,
 *             each where it sits in the kanji, the rest unseen
 *   strokes   its stroke count (Stroke count), or null: a line under the frame
 * Nothing known: an empty frame, dashed.
 *
 * Sizes come from the frame's host (styles.css: --board-frame and the
 * --frame-* font sizes), so the same frame fits the board, a hint's card
 * and a history row.
 */
import { t } from '../i18n.js';
import { el } from '../dom.js';

// Places that cover the whole frame when they hold one part (門 around 日).
// Holding several (立 and 厂 around 生 in 産), they'd pile up past the
// frame, so they take a column of the middle instead, before the inner.
const COVER = ['outer', 'whole', 'none'];

// Where each place sits: top and bottom span the width; left, outer, none,
// inner and right share the middle; a covering place takes it all.
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

// Whether any of a kanji's parts has been found green.
const anyFound = (known) => !!known.parts && known.parts.some((p, i) => !!known.found && known.found(i));

// Whether the frame draws the kanji's parts: its shape is known, or a part
// of it has been found.
const drawsParts = (known) => !!known.parts && (!!known.shape || anyFound(known));

// The known list for an answer, one per kanji (the board, its cards and
// history all build it here):
//   found(slot, i)  part i of kanji `slot` found green
//   solved(slot)    kanji `slot` solved
//   shape           the shape shows (Guided, or Layout used)
//   strokes         Stroke count used
export function knownKanji(answer, data, { found = () => false, solved = () => false, shape = false, strokes = false } = {}) {
  return [...answer].map((ch, slot) => ({
    kanji: ch,
    solved: !!solved(slot),
    parts: data.kanji[ch].parts,
    found: (i) => !!found(slot, i),
    shape: !!shape,
    strokes: strokes ? data.kanji[ch].strokes : null
  }));
}

// How many zones the frame has (the Layout card builds them one by one).
export function zoneCount(known) {
  if (known.solved || !drawsParts(known)) return 0;
  return new Set(known.parts.map((p) => p.pos)).size;
}

//   glyph(text)  a part's glyph (js/play/glyph.js); text where it's left out
//   isNew(key)   true when 'solved' or 'part:<i>' wasn't shown last time: it
//                comes in (the board's guide)
//   build        { first, step }: the zones come in one after another, from
//                `first` ms, `step` ms apart (the Layout card)
//   label        the frame's name for screen readers (frameLabel)
export function kanjiFrame(known, { glyph = (text) => text, isNew = () => false, build = null, label = '' } = {}) {
  const img = { role: 'img', 'aria-label': label || null };
  if (known.solved) {
    return el('span', { class: `kanji-frame is-solved kanji${isNew('solved') ? ' is-new' : ''}`, lang: 'ja', ...img }, known.kanji);
  }
  if (!drawsParts(known)) return el('span', { class: 'kanji-frame is-plain', ...img });
  const { parts } = known;
  const order = [...new Set(parts.map((p) => p.pos))];
  const count = (pos) => parts.filter((p) => p.pos === pos).length;
  const covers = (pos) => COVER.includes(pos) && count(pos) === 1;
  const outer = order.includes('outer') && covers('outer');
  const found = known.found || (() => false);
  // Shape unknown: no places, and the parts not found keep their room unseen.
  const bare = !known.shape;
  return el('span', {
    class: `kanji-frame${outer ? ' has-outer' : ''}${bare ? ' is-bare' : ''}${build ? ' is-building' : ''}`,
    style: frameAreas(order, covers), ...img
  }, order.map((pos, z) => {
    const here = parts.map((p, i) => ({ p, i })).filter(({ p }) => p.pos === pos);
    const cover = covers(pos);
    const zone = el('span', {
      class: `frame-zone is-${pos}${cover ? ' is-cover' : ''}`,
      'data-n': String(Math.min(Math.max(here.length, 1), 4)),
      style: cover ? null : { gridArea: pos }
    }, here.map(({ p, i }) => {
      if (found(i)) return el('span', { class: `frame-part${isNew(`part:${i}`) ? ' is-new' : ''}`, lang: 'ja' }, glyph(p.form || p.el));
      // Its room kept, unseen, so the parts found sit where they would.
      if (bare) return el('span', { class: 'frame-part is-blank', lang: 'ja', 'aria-hidden': 'true' }, glyph(p.form || p.el));
      // An outer part has no room for a dot: the inset inner shows it.
      return cover && pos === 'outer' ? null : el('span', { class: 'frame-part is-hidden' });
    }));
    if (build) zone.style.setProperty('--at', `${build.first + z * build.step}ms`);
    return zone;
  }));
}

// "6 strokes" under a frame; its number is a node of its own, so a card can
// count it up (js/play/reveal.js). Screen readers hear it in the frame's
// name (frameLabel).
export function strokesLine(n) {
  const mark = '⁣';
  const [before, after = ''] = t('game.clue.strokesN', { n: mark }).split(mark);
  return el('span', { class: 'frame-strokes', 'aria-hidden': 'true' },
    before, el('span', { class: 'frame-strokes-n' }, String(n)), after);
}

// The frame's name: which kanji, what it shows, and its strokes.
export function frameLabel(known, { slot = 0, many = false } = {}) {
  let what = null;
  if (known.solved) what = t('game.frameSolved', { kanji: known.kanji });
  else if (drawsParts(known)) {
    const found = known.found || (() => false);
    const told = known.parts.filter((p, i) => found(i)).map((p) => t('game.framePart', { part: p.form || p.el, place: t(`pos.${p.pos}`) }));
    const places = known.shape ? [...new Set(known.parts.map((p) => p.pos))].map((pos) => t(`pos.${pos}`)).join(t('game.layoutSep')) : null;
    what = [places, t('game.frameLabel', { parts: told.length ? told.join(t('game.listSep')) : t('game.frameEmpty') })]
      .filter(Boolean).join(t('game.listSep'));
  } else if (known.strokes === null || known.strokes === undefined) what = t('game.frameUnknown');
  return [many ? t('game.reveal.kanji', { n: slot + 1 }) : null, what,
    known.strokes === null || known.strokes === undefined ? null : t('game.clue.strokesN', { n: known.strokes })]
    .filter(Boolean).join(t('game.listSep'));
}

// A guide shows with the split (Guided), else once anything is known: a
// kanji solved, its strokes, its shape, or a part of it found.
export function guideShown(knowns, split) {
  return split || knowns.some((k) => k.solved || (k.strokes !== null && k.strokes !== undefined) || !!k.shape || anyFound(k));
}
