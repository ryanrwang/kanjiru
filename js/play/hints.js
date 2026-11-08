/*
 * Hints on the game screen: what the player knows about the answer (clues),
 * the powers they hold, and the sheet that uses one.
 *
 * Clue icons are the icons of the powers that reveal them (js/config/powers.js),
 * so nothing here names a power.
 */
import { POWERS } from '../registry.js';
import { t } from '../i18n.js';
import { el } from '../dom.js';

const iconOf = (effect) => (POWERS.find((p) => p.effect === effect) || {}).icon || '';
const list = (items) => items.filter(Boolean).join(t('game.listSep'));

// Kun readings: 'あか.るい' → あか + るい (okurigana muted), '-' kept.
function kun(reading) {
  const [stem, tail] = reading.split('.');
  return el('span', { class: 'reading' }, stem, tail ? el('span', { class: 'okurigana' }, tail) : null);
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
      el('span', { lang: 'ja' }, reading.kun.map((r, i) => [i ? '、' : '', kun(r)]))));
  }
  return out;
}

// A part as a tile with its position underneath.
export function partTile(part, glyph, mark = '') {
  return el('span', { class: 'part-chip' },
    el('span', { class: `tile is-cell${mark ? ` is-${mark}` : ''}`, lang: 'ja' }, glyph(part.form || part.el)),
    el('span', { class: 'part-pos' }, t(`pos.${part.pos}`)));
}

function clue(effect, label, body, tag) {
  return el('div', { class: 'clue' },
    el('span', { class: 'clue-icon', 'aria-hidden': 'true' }, iconOf(effect)),
    el('span', { class: 'clue-label' }, label, tag ? el('span', { class: 'clue-tag' }, tag) : null),
    el('span', { class: 'clue-body' }, body));
}

// The clues known so far, or null when there are none.
export function renderClues({ engine, state, mode, glyph }) {
  const c = engine.clues(state);
  const many = [...state.answer].length > 1;
  const perSlot = (values, show) => values.map((v, i) => (many ? `${i + 1}: ${show(v)}` : show(v)));
  const rows = [];

  if (c.meaning) {
    rows.push(clue('revealMeaning', t('game.clue.meaning'), c.meaning.join(t('game.meaningSep')), c.meaningFree ? t('game.clue.free') : null));
  } else if (c.meaningFreeAt !== null && state.status === 'playing') {
    rows.push(el('div', { class: 'clue is-soon' },
      el('span', { class: 'clue-icon', 'aria-hidden': 'true' }, iconOf('revealMeaning')),
      el('span', { class: 'clue-body' }, t('game.clue.meaningSoon', { n: c.meaningFreeAt }))));
  }
  if (c.reading) rows.push(clue('revealReading', t('game.clue.reading'), readingNodes(c.reading)));
  if (c.strokes) rows.push(clue('revealStrokes', t('game.clue.strokes'), list(perSlot(c.strokes, String))));
  if (c.layout) {
    rows.push(clue('revealLayout', t('game.clue.layout'),
      perSlot(c.layout, (positions) => positions.map((p) => t(`pos.${p}`)).join(t('game.layoutSep'))).join(' / ')));
  }
  if (c.parts.length) {
    rows.push(clue('revealParts', t('game.clue.parts'),
      el('span', { class: 'part-chips' }, c.parts.map((p) => partTile(p, glyph, 'hit')))));
  }
  if (c.kanji.length) {
    rows.push(clue('revealKanji', t('game.clue.kanji'),
      el('span', { lang: 'ja' }, c.kanji.map((k) => `${k.slot + 1}: ${k.kanji}`).join(t('game.listSep')))));
  }
  if (c.eliminated.length) {
    rows.push(clue('eliminateParts', t('game.clue.eliminated'), t('game.clue.eliminatedCount', { n: c.eliminated.length })));
  }
  return rows.length ? el('div', { class: 'clues', 'aria-live': 'polite' }, rows) : null;
}

// The powers this answer's length allows, as buttons with the count held.
export function renderPowerBar({ engine, state, inventory, onPick }) {
  const offered = POWERS.filter((p) => (p.minLength || 1) <= [...state.answer].length);
  if (!offered.length || state.status !== 'playing') return null;
  return el('div', { class: 'power-bar' },
    el('span', { class: 'power-bar-title' }, t('game.powers.title')),
    el('div', { class: 'power-chips' }, offered.map((p) => {
      const held = inventory[p.id] || 0;
      const ready = held > 0 && !engine.canUse(state, p.id);
      const name = t(`power.${p.id}.name`);
      return el('button', {
        class: `power-chip${ready ? '' : ' is-off'}`,
        type: 'button',
        title: name,
        'aria-label': `${name} · ${t('powers.have', { n: held })}`,
        onclick: () => onPick(p.id)
      },
        el('span', { 'aria-hidden': 'true' }, p.icon),
        el('span', { class: 'power-chip-count', 'aria-hidden': 'true' }, String(held)));
    })));
}

// Why a power can't be used now, as text, or ''.
export function whyNot(engine, state, power, held) {
  if (!held) return t('game.powers.why.none');
  const code = engine.canUse(state, power.id);
  if (!code) return '';
  if (code === 'when') return t(power.when.includes('before') ? 'game.powers.why.before' : 'game.powers.why.during');
  return t(`game.powers.why.${code}`, { n: power.minLength || 1 });
}

// The sheet for one power: what it does, how many you hold, and Use.
let sheet = null;
export function openPowerSheet({ power, held, why, onUse }) {
  if (!sheet) {
    sheet = el('dialog', { class: 'sheet power-sheet', 'aria-labelledby': 'power-sheet-title' });
    sheet.addEventListener('click', (event) => { if (event.target === sheet) sheet.close(); });
    document.body.append(sheet);
  }
  const use = el('button', {
    class: 'btn btn-primary', type: 'button', disabled: !!why,
    onclick: () => { sheet.close(); onUse(); }
  }, t('game.powers.use'));
  sheet.replaceChildren(el('div', { class: 'sheet-body' },
    el('header', { class: 'power-sheet-head' },
      el('span', { class: 'power-icon', 'aria-hidden': 'true' }, power.icon),
      el('h2', { class: 'sheet-title', id: 'power-sheet-title' }, t(`power.${power.id}.name`))),
    el('p', {}, t(`power.${power.id}.desc`)),
    el('p', { class: 'sheet-note' }, t('powers.have', { n: held })),
    why ? el('p', { class: 'status-line is-error' }, why) : null,
    el('div', { class: 'btn-row' },
      use,
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => sheet.close() }, t('game.powers.cancel')))
  ));
  sheet.showModal();
  if (!why) use.focus();
}

export function closePowerSheet() {
  if (sheet && sheet.open) sheet.close();
}
