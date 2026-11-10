/*
 * Every game played, newest first, under the play card (app.js): the
 * answer with its reading and meaning, how it ended (solved in n, not
 * solved, given up), the level, the day, and a small square per cell per
 * guess, in the colours it scored.
 *
 *   const card = historyCard({ save, data, engine, shown, onMore });   // or null
 *
 * shown: how many games to list (PAGE more each time Show more is tapped).
 * The squares are scored again from the saved guesses (score.js
 * scoreOrder), so they follow the parts data: a game whose guesses no longer
 * fit the answer's parts (the data changed, or a game from the retired Easy
 * level, which guessed kanji) lists without them.
 */
import { LEVEL } from './registry.js';
import { t, lang } from './i18n.js';
import { el } from './dom.js';
import { games } from './engine/stats.js';
import { keyTime } from './engine/daily.js';
import { scoreOrder } from './engine/score.js';

export const PAGE = 20;

// Newest first: by day, then by when a day's games finished.
export function playedGames(history) {
  return games(history).sort((a, b) =>
    String(b.date).localeCompare(String(a.date)) || keyTime(b.key) - keyTime(a.key));
}

// Each guess's marks, cell by cell, or null when they can't be worked out.
export function marksOf(entry, data) {
  if (!Array.isArray(entry.guesses) || !entry.guesses.length || !entry.answer) return null;
  const chars = [...entry.answer];
  if (chars.some((ch) => !data.kanji[ch])) return null;
  const answer = chars.map((ch) => ({ kanji: ch, parts: data.kanji[ch].parts }));
  try {
    return entry.guesses.map((picks) => {
      if (!Array.isArray(picks) || !picks.every(Array.isArray)) throw new Error('not a parts guess');
      return scoreOrder(picks, answer).flatMap((slot) => slot.tiles.map((tile) => tile.mark));
    });
  } catch (e) {
    return null;
  }
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

function item(g, data, engine) {
  let info = null;
  try { info = engine.answerInfo(g.answer); } catch (e) { info = null; }
  const reading = info && typeof info.reading === 'string' ? info.reading : '';
  const meaning = info && info.meanings.length ? info.meanings[0] : '';
  const marks = marksOf(g, data);
  const sep = t('reward.sep');
  const level = LEVEL[g.level] ? t(`level.${g.level}.name`) : '';
  return el('li', { class: `history-item${g.won ? ' is-won' : ''}` },
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
    }, marks.flat().map((mark) => el('span', { class: `history-sq is-${mark}-bg` }))) : null);
}

export function historyCard({ save, data, engine, shown = PAGE, onMore }) {
  const all = playedGames(save.history).filter((g) => g.answer);
  if (!all.length || !data || !engine) return null;
  const won = all.filter((g) => g.won).length;
  const left = all.length - shown;
  return el('section', { class: 'card history', 'aria-labelledby': 'history-title' },
    el('header', { class: 'history-head' },
      el('h2', { class: 'history-title', id: 'history-title' }, t('history.title')),
      el('span', { class: 'history-count' }, t('history.count', { n: all.length, won }))),
    el('ol', { class: 'history-list' }, all.slice(0, shown).map((g) => item(g, data, engine))),
    left > 0 ? el('div', { class: 'btn-row' },
      el('button', { class: 'btn btn-secondary', type: 'button', 'data-id': 'history-more', onclick: onMore },
        t('history.more', { n: Math.min(PAGE, left) }))) : null);
}
