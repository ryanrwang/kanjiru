/*
 * Every game played, newest first, under the play card (app.js): the
 * answer with its reading and meaning, how it ended (solved in n, not
 * solved, given up), the level, the day, and a small square per cell per
 * guess, in the colours it scored. A game opens (a <details>) to its final
 * board: the kanji guide as it ended (js/play/frame.js, the frames the
 * board draws) over every guess, part by part, in its colours, split by
 * kanji where the board showed the split (Guided).
 *
 *   const card = historyCard({ save, data, engine, glyph, shown, onMore, onDelete });   // or null
 *
 * Every game opens; at its foot, Delete (onDelete(game), app.js asks
 * first).
 *
 * shown: how many games to list (PAGE more each time Show more is tapped).
 * The guesses are scored again from the saved parts (score.js scoreOrder),
 * so they follow the parts data: a game whose guesses no longer fit the
 * answer's parts (the data changed, or a game from the retired Easy level,
 * which guessed kanji) lists without its squares or board.
 */
import { LEVEL, POWER } from './registry.js';
import { t, lang } from './i18n.js';
import { el } from './dom.js';
import { games } from './engine/stats.js';
import { keyTime } from './engine/daily.js';
import { scoreOrder, nearWays } from './engine/score.js';
import { kanjiFrame, strokesLine, frameLabel, guideShown, knownKanji } from './play/frame.js';

export const PAGE = 20;

// The games opened, by key, so a redraw (Show more) keeps them open.
const opened = new Set();

// Newest first: by day, then by when a day's games finished.
export function playedGames(history) {
  return games(history).sort((a, b) =>
    String(b.date).localeCompare(String(a.date)) || keyTime(b.key) - keyTime(a.key));
}

// Each guess scored again (scoreOrder: per kanji, its tiles with their
// marks), or null when they can't be worked out.
export function scoredOf(entry, data) {
  if (!Array.isArray(entry.guesses) || !entry.guesses.length || !entry.answer) return null;
  const chars = [...entry.answer];
  if (chars.some((ch) => !data.kanji[ch])) return null;
  const answer = chars.map((ch) => ({ kanji: ch, parts: data.kanji[ch].parts }));
  try {
    return entry.guesses.map((picks) => {
      if (!Array.isArray(picks) || !picks.every(Array.isArray)) throw new Error('not a parts guess');
      return scoreOrder(picks, answer);
    });
  } catch (e) {
    return null;
  }
}

// Each guess's marks, cell by cell, or null when they can't be worked out.
export function marksOf(entry, data) {
  const scored = scoredOf(entry, data);
  return scored && scored.map((guess) => guess.flatMap((slot) => slot.tiles.map((tile) => tile.mark)));
}

// What the kanji guide knew when the game ended (js/play/frame.js): a kanji
// solved by a guess (or every one, on a win), the parts found green, the
// shape where Guided or Layout showed it, and the strokes when Stroke count
// was used. Parts and kanji a hint revealed aren't saved, so they don't show.
export function knownAtEnd(entry, data, scored) {
  const used = new Set((entry.powers || []).map((id) => (POWER[id] || {}).effect));
  const hit = new Set();
  scored.forEach((guess) => guess.forEach((s) => s.tiles.forEach((tile) => {
    if (tile.mark === 'hit' && tile.of) hit.add(`${tile.of.slot}:${tile.of.part}`);
  })));
  return knownKanji(entry.answer, data, {
    found: (slot, i) => hit.has(`${slot}:${i}`),
    solved: (slot) => !!entry.won || scored.some((guess) => guess[slot].solved),
    shape: !!(LEVEL[entry.level] || {}).showSplit || used.has('revealLayout'),
    strokes: used.has('revealStrokes')
  });
}

// 'YYYY-MM-DD' → "10 Nov" in the interface language, with the year when
// it isn't this year's.
function dayText(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(y, m - 1, d);
  const options = { month: 'short', day: 'numeric', ...(y !== new Date().getFullYear() ? { year: 'numeric' } : {}) };
  try { return new Intl.DateTimeFormat(lang(), options).format(date); } catch (e) { return ymd; }
}

function resultText(g) {
  if (g.won) return t('history.won', { n: Array.isArray(g.guesses) ? g.guesses.length : Number(g.guesses) || 0 });
  return g.gaveUp ? t('history.gaveUp') : t('history.lost');
}

// The final board: the guide's frames, then each guess's tiles.
function finalBoard(g, data, glyph, scored) {
  const split = !!(LEVEL[g.level] || {}).showSplit;
  const known = knownAtEnd(g, data, scored);
  const many = known.length > 1;
  const guide = guideShown(known, split)
    ? el('div', { class: 'history-frames' }, known.map((k, slot) => el('div', { class: 'history-frame' },
      kanjiFrame(k, { glyph, label: frameLabel(k, { slot, many }) }),
      k.strokes !== null ? strokesLine(k.strokes) : null)))
    : null;
  // The Arrows hint's arrows, on every guess, when the game used it.
  const pointed = (g.powers || []).some((id) => (POWER[id] || {}).effect === 'pointNear');
  const answer = [...g.answer].map((ch) => ({ kanji: ch, parts: data.kanji[ch].parts }));
  const tile = (tileOf, way) => el('span', { class: `tile is-cell is-${tileOf.mark}${way ? ' has-way' : ''}`, lang: 'ja' },
    glyph(tileOf.form), way ? el('span', { class: `tile-way is-${way}`, 'aria-hidden': 'true' }) : null);
  const rows = scored.map((guess, i) => {
    const ways = pointed ? nearWays(guess, answer) : null;
    const tiles = guess.map((slot, s) => slot.tiles.map((x, k) => tile(x, ways && ways[s][k])));
    const marks = guess.flatMap((slot, s) => slot.tiles.map((x, k) => {
      const way = ways && ways[s][k];
      return `${x.form} ${t(`game.mark.${x.mark}`)}${way ? t('game.listSep') + t(`game.way.${way}`) : ''}`;
    }));
    return el('li', { class: 'history-row', 'aria-label': t('game.rowLabelParts', { n: i + 1, parts: marks.join(t('game.listSep')) }) },
      split ? tiles.map((nodes) => el('span', { class: 'history-slot', 'aria-hidden': 'true' }, nodes))
        : el('span', { class: 'history-slot', 'aria-hidden': 'true' }, tiles.flat()));
  });
  return el('div', { class: 'history-board' }, guide,
    el('ol', { class: 'history-rows', 'aria-label': t('game.board') }, rows));
}

function item(g, data, engine, glyph, onDelete) {
  let info = null;
  try { info = engine.answerInfo(g.answer); } catch (e) { info = null; }
  const reading = info && typeof info.reading === 'string' ? info.reading : '';
  const meaning = info && info.meanings.length ? info.meanings[0] : '';
  const scored = scoredOf(g, data);
  const marks = scored && scored.map((guess) => guess.flatMap((slot) => slot.tiles.map((tile) => tile.mark)));
  const sep = t('reward.sep');
  const level = LEVEL[g.level] ? t(`level.${g.level}.name`) : '';
  const board = !!(scored && glyph);
  const summary = el('summary', { class: 'history-summary' },
    el('span', { class: 'history-word kanji', lang: 'ja' }, g.answer),
    el('div', { class: 'history-info' },
      el('p', { class: 'history-gloss' },
        reading ? el('span', { class: 'history-reading', lang: 'ja' }, reading) : null,
        reading && meaning ? sep : null,
        meaning),
      el('p', { class: 'history-meta' },
        el('span', { class: `history-result${g.won ? ' is-won' : ''}` }, resultText(g)),
        [level, dayText(g.date)].filter(Boolean).map((x) => [sep, x]))),
    marks ? el('span', {
      class: 'history-grid', 'aria-hidden': 'true', style: { '--cols': marks[0].length }
    }, marks.flat().map((mark) => el('span', { class: `history-sq is-${mark}-bg` }))) : el('span'),
    el('span', { class: 'fold-chevron', 'aria-hidden': 'true' }));
  // Opens to the final board (where its guesses can be scored again) and
  // Delete, drawn the first time it's opened.
  const id = `${g.modeId}/${g.key}`;
  const body = () => el('div', { class: 'history-body' },
    board ? finalBoard(g, data, glyph, scored) : null,
    onDelete ? el('div', { class: 'history-actions' },
      el('button', {
        class: 'btn btn-ghost btn-small', type: 'button', 'data-id': `delete-${id}`,
        'aria-label': t('history.deleteLabel', { answer: g.answer }),
        onclick: () => onDelete(g)
      }, t('history.delete'))) : null);
  const fold = el('details', {
    class: 'history-fold', open: opened.has(id),
    ontoggle: (event) => {
      const node = event.currentTarget;
      if (node.open) {
        opened.add(id);
        if (!node.querySelector('.history-body')) node.append(body());
      } else opened.delete(id);
    }
  }, summary, opened.has(id) ? body() : null);
  return el('li', { class: `history-item${g.won ? ' is-won' : ''}`, 'data-game': id }, fold);
}

export function historyCard({ save, data, engine, glyph = null, shown = PAGE, onMore, onDelete = null }) {
  const all = playedGames(save.history).filter((g) => g.answer);
  if (!all.length || !data || !engine) return null;
  const won = all.filter((g) => g.won).length;
  const left = all.length - shown;
  return el('section', { class: 'card history', 'aria-labelledby': 'history-title' },
    el('header', { class: 'history-head' },
      el('h2', { class: 'history-title', id: 'history-title' }, t('history.title')),
      el('span', { class: 'history-count' }, t('history.count', { n: all.length, won }))),
    el('ol', { class: 'history-list' }, all.slice(0, shown).map((g) => item(g, data, engine, glyph, onDelete))),
    left > 0 ? el('div', { class: 'btn-row' },
      el('button', { class: 'btn btn-secondary', type: 'button', 'data-id': 'history-more', onclick: onMore },
        t('history.more', { n: Math.min(PAGE, left) }))) : null);
}
