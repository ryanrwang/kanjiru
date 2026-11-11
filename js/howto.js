/*
 * How to play, on the play page: a short animation of one game, played out
 * on a small board. The answer is 時間, whose parts in writing order are
 * 日 土 寸 門 日. Three guesses are typed in part by part and revealed in
 * the player's own tile reveal (settings.tiles), with a line under the board
 * saying what each step shows, then 時間 appears, and it starts again.
 *
 *   const guide = howTo({ open, tiles });   // guide.node; guide.stop()
 *
 * open: shown open (a new player) or folded to its title (after a game;
 * app.js decides); either way it sits above the play card. It plays only
 * while open and on screen; under reduced motion it shows the three rows at
 * once, every line listed. The board is a picture (aria-hidden): the text
 * above it and the colours' key under it, in the same box, say the same for
 * screen readers.
 */
import { t } from './i18n.js';
import { el, smoothFold } from './dom.js';

const ANSWER = '時間';
// Each guess: [part, mark] per cell, and the line shown after its reveal.
const ROWS = [
  { parts: [['口', 'miss'], ['日', 'near'], ['寸', 'hit'], ['木', 'miss'], ['月', 'miss']], typing: 'howto.step.type', after: 'howto.step.colours' },
  { parts: [['日', 'hit'], ['土', 'hit'], ['寸', 'hit'], ['日', 'near'], ['門', 'near']], typing: 'howto.step.use', after: 'howto.step.closer' },
  { parts: [['日', 'hit'], ['土', 'hit'], ['寸', 'hit'], ['門', 'hit'], ['日', 'hit']], typing: 'howto.step.split', after: 'howto.step.solved' }
];

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ms = (v) => parseFloat(v) || 0;

export function howTo({ open = true, tiles = 'flip' } = {}) {
  const answer = el('span', { class: 'demo-answer kanji', lang: 'ja' }, ANSWER);
  const rows = ROWS.map(() => el('div', { class: 'demo-row' },
    el('span', { class: 'demo-slot' }, Array.from({ length: 5 }, (_, i) => {
      const cell = el('span', { class: 'tile is-cell demo-cell', lang: 'ja' });
      cell.style.setProperty('--i', i);
      return cell;
    }))));
  const line = el('p', { class: 'demo-line' });
  const board = el('div', { class: 'demo-board', 'aria-hidden': 'true' },
    el('div', { class: 'demo-answer-row' }, answer), rows, line);
  // The colours' key, in the box under the little game (2026-11-11, the
  // user asked), and read out: the board itself is hidden from readers.
  const legend = el('ul', { class: 'demo-legend' },
    ['hit', 'near', 'miss'].map((state) =>
      el('li', {}, el('span', { class: `legend-dot is-${state}-bg`, 'aria-hidden': 'true' }), t(`howto.${state}`))));

  // It eases open and shut (js/dom.js smoothFold()).
  const details = smoothFold(el('details', { class: 'card fold howto', open },
    el('summary', { class: 'fold-summary' },
      el('h2', { class: 'fold-title', id: 'howto-title' }, t('howto.title')),
      el('span', { class: 'fold-chevron', 'aria-hidden': 'true' })),
    el('div', { class: 'fold-body' },
      el('p', { class: 'howto-lead' }, t('howto.lead')),
      el('p', { class: 'howto-text' }, t('howto.body')),
      el('div', { class: 'demo', 'data-tiles': tiles }, board, legend),
      // With a mouse, the keys can be typed too (styles.css .howto-keys).
      el('p', { class: 'howto-keys' }, t('howto.keys')))));

  // ── The animation ──────────────────────────────────────────────────

  let timer = 0;
  let playing = false;
  const cellsOf = (r) => [...rows[r].querySelectorAll('.demo-cell')];

  function clear() {
    rows.forEach((row, r) => {
      row.classList.remove('is-new');
      cellsOf(r).forEach((cell) => { cell.className = 'tile is-cell demo-cell'; cell.textContent = ''; });
    });
    answer.classList.remove('is-shown');
    say('');
  }

  function say(key) {
    line.textContent = key ? t(key, { answer: ANSWER }) : '';
    line.classList.toggle('is-shown', !!key);
  }

  function fill(r, marks) {
    cellsOf(r).forEach((cell, i) => {
      const [part, mark] = ROWS[r].parts[i];
      cell.textContent = part;
      cell.className = `tile is-cell demo-cell${marks ? ` is-${mark}` : ' is-typed'}`;
    });
  }

  // Every row at once, revealed: under reduced motion, or as the still
  // picture before it starts.
  function still() {
    ROWS.forEach((row, r) => fill(r, true));
    answer.classList.add('is-shown');
    line.textContent = '';
    line.classList.remove('is-shown');
  }

  // Steps run one after another; each returns how long until the next.
  // Quick enough to watch through (about 11 s a round): a part every 200 ms,
  // the row's reveal at the board's own pace (styles.css --reveal-stagger),
  // and each line held 1.2 s.
  function steps() {
    const tr = window.TOKENS.active().transition;
    const css = getComputedStyle(board);
    const type = ms(tr.base);
    const stagger = ms(css.getPropertyValue('--reveal-stagger')) || ms(tr.fast);
    const reveal = (ms(css.getPropertyValue('--reveal-time')) || ms(tr.reveal)) + stagger * (ROWS[0].parts.length - 1);
    const hold = ms(tr.message) * 0.4;
    const list = [() => { clear(); return type; }];
    ROWS.forEach((row, r) => {
      list.push(() => { say(row.typing); return type; });
      row.parts.forEach(([part], i) => list.push(() => {
        const cell = cellsOf(r)[i];
        cell.textContent = part;
        cell.classList.add('is-typed');
        return type;
      }));
      list.push(() => {
        fill(r, true);
        rows[r].classList.add('is-new');
        return reveal;
      });
      list.push(() => {
        rows[r].classList.remove('is-new');
        if (r === ROWS.length - 1) answer.classList.add('is-shown');
        say(row.after);
        return hold;
      });
    });
    list.push(() => ms(tr.message) * 0.3);
    return list;
  }

  function run(list = steps(), at = 0) {
    if (!playing || !details.isConnected) { playing = false; return; }
    const step = at < list.length ? list[at] : null;
    if (!step) { run(steps(), 0); return; }
    timer = setTimeout(() => run(list, at + 1), step());
  }

  function start() {
    if (playing || reducedMotion()) return;
    playing = true;
    run();
  }

  function stop() {
    playing = false;
    clearTimeout(timer);
  }

  still();
  // Plays while open and on screen.
  const watcher = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && details.open) start();
      else if (!entry.isIntersecting) stop();
    });
  }, { threshold: 0.5 }) : null;
  if (watcher) watcher.observe(board);
  details.addEventListener('toggle', () => {
    if (!details.open) { stop(); still(); return; }
    if (!watcher) start();
    else { watcher.unobserve(board); watcher.observe(board); }   // checks it's on screen
  });
  if (!watcher && open) start();

  return {
    node: details,
    stop() { stop(); if (watcher) watcher.disconnect(); }
  };
}
