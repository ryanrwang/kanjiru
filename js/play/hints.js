/*
 * Hints on the game screen: what the player knows about the answer (clues),
 * and the hints modal, opened from the hints pill in the header: every hint
 * with what it does, how many you hold and Use, which asks once more before
 * it spends one. A hint you hold none of shows its price instead
 * (priceButton(), shared with the Points page), which buys it (js/shop.js)
 * after the same confirm the Points page has, unless the player turned it off.
 *
 * Clue icons are the icons of the powers that reveal them (js/config/powers.js),
 * drawn in the player's icons look (js/play/hint-art.js), so nothing here
 * names a power.
 */
import { POWERS, OFFERED_POWERS } from '../registry.js';
import { t, lang } from '../i18n.js';
import { el, openSheet, closeSheet, dismissable } from '../dom.js';
import { bump } from '../toast.js';
import { coin } from '../coin.js';
import { hintIcon } from './hint-art.js';

const pts = (n) => t('currency.amount', { n });

// The power behind a clue, for its icon (js/play/hint-art.js).
const powerOf = (effect) => POWERS.find((p) => p.effect === effect) || null;

const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';

// Kun readings: 'あか.るい' → あか + るい (okurigana muted), '-' kept.
function kun(reading) {
  const [stem, tail] = reading.split('.');
  return el('span', { class: 'reading' }, stem, tail ? el('span', { class: 'okurigana' }, tail) : null);
}

// KANJIDIC can list a reading with and without its okurigana (か.つ and
// かつ for 勝), which read the same on screen. Keep one, in the first one's
// place: the one that marks the okurigana.
export function uniqueKun(readings) {
  const best = new Map();
  readings.forEach((r) => {
    const key = r.replace('.', '');
    if (!best.has(key) || (r.includes('.') && !best.get(key).includes('.'))) best.set(key, r);
  });
  return [...best.values()];
}

export function readingNodes(reading) {
  if (typeof reading === 'string') return [el('span', { lang: 'ja' }, reading)];
  const out = [];
  if (reading.on.length) {
    out.push(el('span', { class: 'reading-group' },
      el('span', { class: 'reading-label' }, t('game.on')),
      el('span', { lang: 'ja' }, reading.on.join('、'))));
  }
  if (reading.kun.length) {
    out.push(el('span', { class: 'reading-group' },
      el('span', { class: 'reading-label' }, t('game.kun')),
      el('span', { lang: 'ja' }, uniqueKun(reading.kun).map((r, i) => [i ? '、' : '', kun(r)]))));
  }
  return out;
}

// The meaning in the interface's language: a hand-written one where the
// answer has it (engine clues().meaningIn), else the dictionary's English.
// { text, lang } or null.
export function meaningText(clues) {
  if (!clues.meaning) return null;
  const local = clues.meaningIn && clues.meaningIn[lang()];
  if (local) return { text: local, lang: lang() };
  return { text: clues.meaning.join(t('game.meaningSep')), lang: 'en' };
}

// A part as a tile with its position underneath.
export function partTile(part, glyph, mark = '') {
  return el('span', { class: 'part-chip' },
    el('span', { class: `tile is-cell${mark ? ` is-${mark}` : ''}`, lang: 'ja' }, glyph(part.form || part.el)),
    el('span', { class: 'part-pos' }, t(`pos.${part.pos}`)));
}

// A clue as a chip: the hint's icon, then what it found. With onOpen, a
// button that opens the clue's card again (js/play/reveal.js); `card` is
// that card's effect.
function chip({ effects, card = effects, body, extra = '', icon = true, onOpen = null }) {
  const attrs = { class: `${extra}`, 'data-effects': effects };
  if (onOpen) Object.assign(attrs, { type: 'button', 'data-id': `clue-${card}`, title: t('game.clue.again'), onclick: () => onOpen(card) });
  return el(onOpen ? 'button' : 'span', attrs,
    icon ? el('span', { class: 'clue-chip-icon' }, hintIcon(powerOf(effects))) : null,
    icon ? el('span', { class: 'visually-hidden' }, t(TITLES[effects] || 'game.clue.meaning')) : null,
    body,
    onOpen ? el('span', { class: 'visually-hidden' }, t('game.clue.again')) : null);
}
const TITLES = { revealMeaning: 'game.clue.meaning', revealReading: 'game.clue.reading' };

// What the hints found that isn't about one kanji, above the keyboard, or
// null when nothing yet: the meaning, in the interface's language, which a
// tap opens on its card again. Everything about one kanji (strokes, layout,
// a revealed kanji) is in the kanji guide above the board (js/play/screen.js),
// parts a hint showed are in their cells and green on their keys, and swept
// parts are grey on the keys. (Reading, retired, still shows for a game
// that used it.)
//   onOpen(card)  a tap on the meaning opens its card again
export function renderClues({ engine, state, onOpen = null }) {
  const c = engine.clues(state);
  const items = [];
  const meaning = meaningText(c);
  if (meaning) {
    items.push(chip({
      effects: 'revealMeaning', extra: 'clue-chip is-meaning', onOpen,
      body: el('span', { class: 'clue-chip-body' }, el('span', { lang: meaning.lang }, meaning.text),
        c.meaningFree ? el('span', { class: 'clue-tag' }, t('game.clue.free')) : null)
    }));
  } else if (c.meaningFreeAt !== null && state.status === 'playing') {
    items.push(chip({
      effects: 'revealMeaning', extra: 'clue-chip is-meaning is-soon',
      body: el('span', { class: 'clue-chip-body' }, t('game.clue.meaningSoon', { n: c.meaningFreeAt }))
    }));
  }
  if (c.reading) items.push(chip({ effects: 'revealReading', extra: 'clue-chip', body: el('span', { class: 'clue-chip-body' }, readingNodes(c.reading)) }));
  return items.length ? el('div', { class: 'clues', 'aria-live': 'polite' }, items) : null;
}

// The hints this answer allows: every offered power long enough for it.
export function hintsFor(state) {
  return OFFERED_POWERS.filter((p) => (p.minLength || 1) <= [...state.answer].length);
}

// Why a power can't be used now, as text, or ''. The rules come first, so
// a power you couldn't use anyway doesn't just say you have none.
export function whyNot(engine, state, power, held) {
  const code = engine.canUse(state, power.id);
  if (code === 'when') return t(power.when.includes('before') ? 'game.powers.why.before' : 'game.powers.why.during');
  if (code) return t(`game.powers.why.${code}`, { n: power.minLength || 1 });
  return held ? '' : t('game.powers.why.none');
}

// One hint as a row (styles.css .hint-row), in the hints modal and on the
// Points page: its icon, name, how many you hold and a button on the first
// line, what it does under them, then a line (why not, or what happened).
//   free  debug mode: every hint free, so "Free" in place of how many
export function hintRow({ power, held, free = false, off = false, action = null, line = null, key = power.id }) {
  const heldText = free ? t('game.powers.freeLabel') : t('game.powers.held', { n: held });
  return el('li', { class: `hint-row${off ? ' is-off' : ''}`, 'data-key': key },
    el('span', { class: 'hint-icon' }, hintIcon(power)),
    el('p', { class: 'hint-name' }, t(`power.${power.id}.name`)),
    el('span', {
      class: `hint-held${held || free ? ' is-held' : ''}`, title: heldText, 'aria-label': heldText
    }, free ? t('game.powers.free') : t('game.powers.count', { n: held })),
    action,
    el('p', { class: 'hint-desc' }, t(`power.${power.id}.desc`)),
    line);
}

// A hint's Buy button, in a hint row: just its price (the user asked for
// the number alone, 2026-11-10); screen readers hear what it buys.
export function priceButton({ power, disabled = false, onclick, id = null }) {
  return el('button', {
    class: 'btn btn-secondary btn-small hint-price', type: 'button', 'data-id': id, disabled,
    'aria-label': t('shop.buyLabel', { name: t(`power.${power.id}.name`), cost: power.cost }),
    onclick
  },
    el('span', { class: 'hint-price-coin', 'aria-hidden': 'true' }, coin()),
    el('span', { 'aria-hidden': 'true' }, pts(power.cost)));
}

// ── The hints modal ──────────────────────────────────────────────────
//
// openHints({ powers, read, ask, onBuy, onUse })
//   powers      the hints to list (hintsFor)
//   read(id)    the latest { held, points, why, offer } for one: why is
//               whyNot() ('' when it can be used now); offer is js/shop.js
//               powerOffer(), or null when it isn't sold here (it can't be
//               used now, or you hold one)
//   ask()       true when buying needs a confirm (settings.confirmHintBuy)
//   onBuy(id, { never })  buys one; true when it did. never: the player
//               ticked Don't ask again
//   onUse(id)   called after the confirm, once the modal has closed
//
// Three views in one dialog: the list, Use's confirm, Buy's confirm. Escape
// or Back from a confirm goes back to the list.

let sheet = null;
let view = null;   // { name: 'list' | 'use' | 'buy', id, focus }

export function openHints({ powers, read, ask, onBuy, onUse }) {
  if (!sheet) {
    sheet = el('dialog', { class: 'sheet hints-sheet', 'aria-labelledby': 'hints-title' });
    dismissable(sheet, { esc: false });
    document.body.append(sheet);
  }
  const power = (id) => powers.find((p) => p.id === id);
  const name = (p) => t(`power.${p.id}.name`);
  let note = null;   // { id, text }: a line under a row after buying
  let spent = 0;     // points to show falling, once

  // Esc steps back to the list first, then closes, fading.
  sheet.oncancel = (event) => {
    event.preventDefault();
    if (view && view.name !== 'list') show('list', view.id);
    else closeSheet(sheet);
  };

  function head(title, points) {
    const close = el('button', {
      class: 'icon-btn', type: 'button', 'data-id': 'hints-close',
      'aria-label': t('game.powers.close'), title: t('game.powers.close'),
      onclick: () => closeSheet(sheet)
    });
    close.innerHTML = CLOSE;
    const pointsNode = el('span', { class: 'hints-points' }, coin(), ' ', pts(points));
    if (spent) { bump(pointsNode, -spent); spent = 0; }
    return el('header', { class: 'sheet-head hints-head' },
      el('h2', { class: 'sheet-title', id: 'hints-title' }, title), pointsNode, close);
  }

  // One row per hint: its icon, name and what it does, how many you hold,
  // and Use (or Buy when you hold none and could use one now).
  function row(p) {
    const { held, free, why, offer } = read(p.id);
    const selling = !free && !held && !!offer && offer.why !== 'not-for-sale';
    const off = !!why && !selling;
    let action;
    if (selling) {
      action = priceButton({
        power: p, id: `buy-${p.id}`, disabled: !!offer.why,
        onclick: () => (ask() ? show('buy', p.id) : buy(p.id, false))
      });
    } else {
      action = el('button', {
        class: 'btn btn-primary btn-small', type: 'button', 'data-id': `use-${p.id}`,
        disabled: !!why, 'aria-describedby': why ? `why-${p.id}` : null,
        onclick: () => show('use', p.id)
      }, t('game.powers.use'));
    }
    let line = null;
    if (note && note.id === p.id) line = el('p', { class: 'hint-note is-ok', role: 'status' }, note.text);
    else if (selling && offer.why) {
      line = el('p', { class: 'hint-why' }, offer.why === 'short' ? t('shop.short', { n: offer.need }) : t('shop.full', { hold: p.hold }));
    } else if (why && !selling) line = el('p', { class: 'hint-why', id: `why-${p.id}` }, why);
    return hintRow({ power: p, held, free, off, action, line });
  }

  function listView() {
    const points = read(powers[0].id).points;
    return [head(t('game.powers.title'), points),
      el('ul', { class: 'hint-list' }, powers.map(row))];
  }

  // Use's confirm: what it does, and how many are left after.
  function useView(p) {
    const { held, free, points } = read(p.id);
    return [head(t('game.powers.title'), points),
      el('div', { class: 'hint-confirm' },
        el('span', { class: 'hint-confirm-icon' }, hintIcon(p, { size: 'lg' })),
        el('h3', { class: 'hint-confirm-title' }, t('game.powers.confirmUse', { name: name(p) })),
        el('p', { class: 'hint-desc' }, t(`power.${p.id}.desc`)),
        el('p', { class: 'sheet-note' }, free ? t('game.powers.freeNote') : t('game.powers.left', { n: held, left: held - 1 }))),
      el('div', { class: 'btn-row' },
        el('button', {
          class: 'btn btn-primary', type: 'button', 'data-id': 'confirm-use',
          onclick: () => { closeSheet(sheet); onUse(p.id); }
        }, t('game.powers.confirmUseYes')),
        el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => show('list', p.id) }, t('game.powers.back')))];
  }

  // Buy's confirm: the price and what's left, and Don't ask again.
  function buyView(p) {
    const { points } = read(p.id);
    const never = el('input', { type: 'checkbox', id: 'hints-never', 'data-id': 'never' });
    return [head(t('game.powers.title'), points),
      el('div', { class: 'hint-confirm' },
        el('span', { class: 'hint-confirm-icon' }, hintIcon(p, { size: 'lg' })),
        el('h3', { class: 'hint-confirm-title' }, t('shop.confirmTitle', { name: name(p) })),
        el('p', {}, t('shop.confirm', { cost: p.cost, have: points, left: points - p.cost, name: name(p) })),
        el('label', { class: 'check-row', for: 'hints-never' }, never, el('span', {}, t('shop.dontAsk')))),
      el('div', { class: 'btn-row' },
        el('button', {
          class: 'btn btn-primary', type: 'button', 'data-id': 'confirm-buy',
          onclick: () => buy(p.id, never.checked)
        }, t('shop.confirmYes', { cost: p.cost })),
        el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => show('list', p.id) }, t('shop.cancel')))];
  }

  function buy(id, never) {
    if (!onBuy(id, { never })) return;
    const p = power(id);
    spent = p.cost;
    note = { id, text: t('game.powers.bought', { n: read(id).held }) };
    show('list', id, `use-${id}`);
  }

  // Draws a view; the focus goes to its first button, or back to the row
  // it came from.
  function show(name, id = null, focus = null) {
    // From one view to another in the open sheet, the new one fades in.
    const swapped = sheet.open && view && view.name !== name;
    view = { name, id };
    const p = id ? power(id) : null;
    const body = name === 'use' ? useView(p) : name === 'buy' ? buyView(p) : listView();
    sheet.replaceChildren(el('div', { class: `sheet-body${swapped ? ' is-swapped' : ''}` }, body));
    const target = (focus && sheet.querySelector(`[data-id="${focus}"]:not(:disabled)`))
      || (name === 'list' && id && sheet.querySelector(`[data-key="${id}"] button:not(:disabled)`))
      || (name !== 'list' && sheet.querySelector('.btn-row .btn-primary'))
      || sheet.querySelector('.hint-row button:not(:disabled)')
      || sheet.querySelector('[data-id="hints-close"]');
    if (target && sheet.open) target.focus();
    return target;
  }

  show('list');
  openSheet(sheet);
  show('list');   // again, so the focus lands now that it's open
}

export function closeHints() {
  if (sheet && sheet.open) closeSheet(sheet);
}
