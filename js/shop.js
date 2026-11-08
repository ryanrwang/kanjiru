/*
 * The shop: hints and locked looks bought with points. It opens from the
 * points in the header (and the start screen's hints and looks); in a game,
 * the sheet of a hint you don't hold sells one too (js/play/hints.js).
 *
 * Every price, hold limit and unlock is in js/config/ (powers.js, skins.js).
 * A purchase is a ledger entry (js/ledger.js); a skin bought also goes into
 * save.unlocked. Buying always takes two taps: Buy, then the confirm that
 * names the price and what's left.
 *
 *   openShop({ focus: 'power:sweep' | 'skin:theme:urushi', onChange })
 *   powerOffer(id), buyPower(id)        also used by the game screen
 *   isUnlocked(slot, item)
 */
import { POWERS, POWER, SLOTS, SKINS, ACHIEVEMENT, ECONOMY } from './registry.js';
import { t } from './i18n.js';
import { el } from './dom.js';
import * as store from './store.js';
import { stats, progress } from './engine/stats.js';
import { localDate } from './engine/daily.js';
import { bump } from './toast.js';

const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const pts = (n) => t('currency.amount', { n });

// ── Rules ────────────────────────────────────────────────────────────

// Free, bought, or unlocked by an achievement the save has.
export function isUnlocked(slot, item, save = store.get()) {
  const u = item.unlock;
  return u.type === 'free'
    || (save.unlocked[slot] || []).includes(item.id)
    || (u.type === 'achievement' && !!save.achievements[u.id]);
}

// Whether a power can be bought now: { cost, held, why, need }.
//   why   null (it can), 'not-for-sale' (earned only), 'full' (held at its
//         limit) or 'short' (need: the points still missing)
export function powerOffer(id, save = store.get()) {
  const p = POWER[id];
  const held = store.held(save)[id] || 0;
  const have = store.points(save);
  const out = { cost: p.cost, held, have, why: null, need: 0 };
  if (p.cost === null) out.why = 'not-for-sale';
  else if (held >= p.hold) out.why = 'full';
  else if (have < p.cost) { out.why = 'short'; out.need = p.cost - have; }
  return out;
}

// Whether a skin can be bought now: { cost, owned, why, need }.
//   why   null, 'owned', 'achievement' (earned, not bought), 'soon' (not
//         built yet) or 'short'
export function skinOffer(slot, item, save = store.get()) {
  const have = store.points(save);
  const out = { cost: item.unlock.cost || 0, owned: isUnlocked(slot, item, save), have, why: null, need: 0 };
  if (out.owned) out.why = 'owned';
  else if (item.unlock.type !== 'points') out.why = 'achievement';
  else if (item.soon) out.why = 'soon';
  else if (have < out.cost) { out.why = 'short'; out.need = out.cost - have; }
  return out;
}

// Buys one of a power: the ledger entry, or null when it can't be bought.
export function buyPower(id) {
  if (powerOffer(id).why) return null;
  let entry = null;
  store.update((s) => { entry = store.enter(s, 'buy', { pts: -POWER[id].cost, hints: { [id]: 1 }, what: id }); });
  return entry;
}

export function buySkin(slot, id) {
  const item = (SKINS[slot] || []).find((x) => x.id === id);
  if (!item || skinOffer(slot, item).why) return null;
  let entry = null;
  store.update((s) => {
    entry = store.enter(s, 'buy', { pts: -item.unlock.cost, what: `${slot}/${id}` });
    s.unlocked[slot] = [...new Set([...(s.unlocked[slot] || []), id])];
  });
  return entry;
}

// ── The sheet ────────────────────────────────────────────────────────

let dialog = null;
let onChange = () => {};
// confirm: the item asking "Spend …?"; done: { key, text } after a purchase.
const ui = { confirm: null, done: null };

export function openShop(options = {}) {
  if (options.onChange) onChange = options.onChange;
  if (!dialog) {
    dialog = el('dialog', { class: 'sheet shop-sheet', 'aria-labelledby': 'shop-title' });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    document.body.append(dialog);
  }
  ui.confirm = null;
  ui.done = null;
  render();
  dialog.showModal();
  const item = options.focus && dialog.querySelector(`[data-key="${options.focus}"]`);
  if (item) {
    item.scrollIntoView({ block: 'center' });
    item.classList.add('is-focus');
    const button = item.querySelector('button:not(:disabled)');
    if (button) button.focus();
  }
}

function render(focusKey = null) {
  const save = store.get();
  const close = el('button', {
    class: 'icon-btn', type: 'button', 'aria-label': t('shop.close'), title: t('shop.close'),
    onclick: () => dialog.close()
  });
  close.innerHTML = ICON_CLOSE;
  const values = stats(save.history, { today: localDate() });
  const lockedSkins = SLOTS.flatMap((slot) => (SKINS[slot.id] || [])
    .filter((item) => item.unlock.type !== 'free')
    .map((item) => skinItem(slot, item, save, values)));

  dialog.replaceChildren(el('div', { class: 'sheet-body' },
    el('header', { class: 'sheet-head' },
      el('h2', { class: 'sheet-title', id: 'shop-title' }, t('shop.title')),
      close),
    el('p', { class: 'shop-balance' },
      el('span', { class: 'shop-balance-amount' }, `${ECONOMY.currency.icon} ${pts(store.points(save))}`)),
    el('p', { class: 'sheet-intro' }, t('shop.intro')),
    el('section', { class: 'sheet-section', 'aria-labelledby': 'shop-hints' },
      el('h3', { class: 'sheet-section-title', id: 'shop-hints' }, t('shop.hints')),
      el('div', { class: 'shop-list' }, POWERS.map((p) => powerItem(p, save)))),
    lockedSkins.length ? el('section', { class: 'sheet-section', 'aria-labelledby': 'shop-looks' },
      el('h3', { class: 'sheet-section-title', id: 'shop-looks' }, t('shop.looks')),
      el('div', { class: 'shop-list' }, lockedSkins)) : null));

  if (focusKey) {
    const target = dialog.querySelector(`[data-key="${focusKey}"] [data-focus]`) || dialog.querySelector(`[data-key="${focusKey}"] button`);
    if (target) target.focus();
  }
}

// The two-tap purchase: Buy shows this; Buy for … pays.
function confirmRow(key, { cost, have, name }, pay) {
  return el('div', { class: 'shop-confirm' },
    el('p', {}, t('shop.confirm', { cost, have, left: have - cost, name })),
    el('div', { class: 'btn-row' },
      el('button', { class: 'btn btn-primary btn-small', type: 'button', 'data-focus': '', onclick: pay },
        t('shop.confirmYes', { cost })),
      el('button', {
        class: 'btn btn-ghost btn-small', type: 'button',
        onclick: () => { ui.confirm = null; render(key); }
      }, t('shop.cancel'))));
}

function buyButton(key, why) {
  return el('button', {
    class: 'btn btn-secondary btn-small', type: 'button', disabled: !!why,
    onclick: () => { ui.confirm = key; ui.done = null; render(key); }
  }, t('shop.buy'));
}

// After a purchase: redraw, show what's left, and the points going down.
function bought(key, cost, text) {
  ui.confirm = null;
  ui.done = { key, text };
  render(key);
  bump(dialog.querySelector('.shop-balance-amount'), -cost);
  onChange();
}

function whyText(offer, hold) {
  if (offer.why === 'full') return t('shop.full', { hold });
  if (offer.why === 'short') return t('shop.short', { n: offer.need });
  if (offer.why === 'soon') return t('shop.soon');
  return '';
}

function powerItem(p, save) {
  const key = `power:${p.id}`;
  const offer = powerOffer(p.id, save);
  const name = t(`power.${p.id}.name`);
  const confirming = ui.confirm === key && !offer.why;
  const pay = () => {
    const entry = buyPower(p.id);
    if (entry) bought(key, p.cost, t('shop.bought', { name, n: store.held()[p.id] || 0, left: store.points() }));
  };
  return el('div', { class: 'shop-item', 'data-key': key },
    el('span', { class: 'shop-icon', 'aria-hidden': 'true' }, p.icon),
    el('div', { class: 'shop-body' },
      el('p', { class: 'shop-name' },
        el('span', {}, name),
        el('span', { class: 'shop-price' }, p.cost === null ? t('powers.earnedOnly') : pts(p.cost))),
      el('p', { class: 'shop-desc' }, t(`power.${p.id}.desc`)),
      el('p', { class: 'shop-meta' }, [t('shop.have', { n: offer.held, hold: p.hold }), whyText(offer, p.hold)].filter(Boolean).join(t('reward.sep'))),
      confirming ? confirmRow(key, { cost: p.cost, have: offer.have, name }, pay) : null,
      ui.done && ui.done.key === key ? el('p', { class: 'status-line is-ok', role: 'status' }, ui.done.text) : null),
    confirming || p.cost === null ? null : el('div', { class: 'shop-action' }, buyButton(key, offer.why)));
}

function skinIcon(slot, item) {
  if (slot.id !== 'theme') return el('span', { class: 'shop-icon', 'aria-hidden': 'true' }, slot.icon);
  const c = window.TOKENS.resolve(item.id, window.TOKENS.look().scheme).color;
  return el('span', { class: 'shop-icon shop-swatch', 'aria-hidden': 'true', style: { background: c.bg.page } },
    [c.text.accent, c.feedback.hit, c.feedback.near].map((bg) => el('span', { class: 'swatch-dot', style: { background: bg } })));
}

function skinItem(slot, item, save, values) {
  const key = `skin:${slot.id}:${item.id}`;
  const offer = skinOffer(slot.id, item, save);
  const name = t(`skin.${slot.id}.${item.id}`);
  const confirming = ui.confirm === key && !offer.why;
  const inUse = save.settings[slot.id] === item.id;
  const unlock = item.unlock;
  const pay = () => {
    const entry = buySkin(slot.id, item.id);
    if (entry) bought(key, unlock.cost, t('shop.boughtSkin', { name, left: store.points() }));
  };
  const use = () => {
    store.update((s) => { s.settings[slot.id] = item.id; });
    ui.done = { key, text: t('shop.using', { name }) };
    render(key);
    onChange();
  };

  // How to get it: its price, or the achievement and how far along you are.
  let price = pts(unlock.cost);
  const meta = [t(`slot.${slot.id}`)];
  if (unlock.type === 'achievement') {
    const a = ACHIEVEMENT[unlock.id];
    price = t('shop.byAchievement');
    if (!offer.owned && a) {
      meta.push(t('shop.earn', { name: t(`achievement.${a.id}.name`), desc: t(`achievement.${a.id}.desc`) }));
      const now = progress(a.test, values);
      if ('atLeast' in a.test) meta.push(t('achievements.progress', { n: now.value, goal: now.goal }));
    }
  }
  if (offer.owned) meta.push(item.soon ? t('shop.ownedSoon') : t('shop.owned'));
  else if (offer.why === 'soon' || offer.why === 'short') meta.push(whyText(offer));

  let action = null;
  if (offer.owned && !item.soon) {
    action = inUse
      ? el('span', { class: 'pill' }, t('shop.inUse'))
      : el('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: use }, t('shop.use'));
  } else if (!offer.owned && unlock.type === 'points' && !item.soon && !confirming) {
    action = buyButton(key, offer.why);
  }

  return el('div', { class: 'shop-item', 'data-key': key },
    skinIcon(slot, item),
    el('div', { class: 'shop-body' },
      el('p', { class: 'shop-name' }, el('span', {}, name), el('span', { class: 'shop-price' }, price)),
      el('p', { class: 'shop-meta' }, meta.join(t('reward.sep'))),
      confirming ? confirmRow(key, { cost: unlock.cost, have: offer.have, name }, pay) : null,
      ui.done && ui.done.key === key ? el('p', { class: 'status-line is-ok', role: 'status' }, ui.done.text) : null),
    action ? el('div', { class: 'shop-action' }, action) : null);
}
