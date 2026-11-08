/*
 * Buying with points: hints and locked looks. The Points page (js/points.js)
 * sells both; in a game, the sheet of a hint you don't hold sells one too
 * (js/play/hints.js). Every purchase there takes two taps: Buy, then the
 * confirm that names the price and what's left.
 *
 * Every price, hold limit and unlock is in js/config/ (powers.js, skins.js).
 * A purchase is a ledger entry (js/ledger.js); a skin bought also goes into
 * save.unlocked.
 *
 *   isUnlocked(slot, item)
 *   powerOffer(id), buyPower(id)
 *   skinOffer(slot, item), buySkin(slot, id)
 */
import { POWER, SKINS } from './registry.js';
import * as store from './store.js';

// Free, bought, or unlocked by an achievement the save has.
export function isUnlocked(slot, item, save = store.get()) {
  const u = item.unlock;
  return u.type === 'free'
    || (save.unlocked[slot] || []).includes(item.id)
    || (u.type === 'achievement' && !!save.achievements[u.id]);
}

// Whether a power can be bought now: { cost, held, have, why, need }.
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

// Whether a skin can be bought now: { cost, owned, have, why, need }.
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
