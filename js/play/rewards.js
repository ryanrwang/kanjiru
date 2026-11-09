/*
 * What a finished game pays into the ledger (js/ledger.js) besides its
 * points: streak rewards, a bonus hint, achievements. And how a reward reads
 * on a toast or the result card.
 *
 * Works on a save object (inside store.update), so the whole payout is one
 * write, and tests can run it on a plain object.
 *
 *   const entries = payGame(save, { engine, state, game, date, points, streakBefore });
 *   earnAchievements(save, { date })    // at start-up and after a merge
 *   describe(entry)                     // { icon, title, body } for a toast
 */
import { ACHIEVEMENT, SKINS, POWER, ECONOMY } from '../registry.js';
import { t } from '../i18n.js';
import { stats, newAchievements, streakRewards } from '../engine/stats.js';
import * as ledger from '../ledger.js';

const oneOf = (power) => (power ? { [power]: 1 } : null);

// Marks every achievement the history has earned and the save hasn't, pays
// its reward, and returns the new ledger entries (one per achievement, so
// the result card can show them, reward or not).
export function earnAchievements(save, { date = ledger.today(), game = null } = {}) {
  const values = stats(save.history, { today: date });
  return newAchievements(values, save.achievements).map((a) => {
    save.achievements[a.id] = date;
    const reward = a.reward || {};
    return ledger.add(save.ledger, 'achievement', { pts: reward.points || 0, hints: oneOf(reward.power), game, what: a.id, at: date });
  });
}

// A game just went into history (save.history): pays its points, then the
// streak rewards it reached, a bonus hint and any achievements. Returns the
// new entries besides the game's own points.
//   game          "modeId/historyKey", so the result card can find them again
//   streakBefore  wins in a row before this game went into history
export function payGame(save, { engine, state, game, date, points, streakBefore = 0, rng = Math.random }) {
  const out = [];
  ledger.add(save.ledger, 'game', { pts: points, game, at: date });
  if (state.status === 'won') {
    const after = stats(save.history).currentStreak;
    streakRewards(streakBefore, after).forEach((r) => {
      out.push(ledger.add(save.ledger, 'streak', { pts: r.points || 0, hints: oneOf(r.power), game, what: r.wins, at: date }));
    });
  }
  const drop = engine.rollDrop(state, ledger.balance(save.ledger).hints, rng);
  if (drop) out.push(ledger.add(save.ledger, 'drop', { hints: oneOf(drop), game, at: date }));
  out.push(...earnAchievements(save, { date, game }));
  return out;
}

// What an entry gives, as text: "+50 pts · 🧩 Reveal a part".
export function amounts(entry) {
  const parts = [];
  if (entry.pts > 0) parts.push(t('reward.points', { n: entry.pts }));
  Object.entries(entry.hints || {}).forEach(([id, n]) => {
    if (!POWER[id] || n <= 0) return;
    const name = t(`power.${id}.name`);
    parts.push(n > 1 ? t('reward.hints', { icon: POWER[id].icon, name, n }) : t('reward.hint', { icon: POWER[id].icon, name }));
  });
  return parts;
}

// The skins an achievement unlocks, as [{ slot, item }].
export function skinsFor(achievementId) {
  return Object.entries(SKINS).flatMap(([slot, list]) => list
    .filter((item) => item.unlock.type === 'achievement' && item.unlock.id === achievementId)
    .map((item) => ({ slot, item })));
}

// A reward entry for a toast or the result card: { icon, title, body }.
export function describe(entry) {
  const icons = ECONOMY.rewardIcons;
  const sep = t('reward.sep');
  if (entry.why === 'streak') {
    return { icon: icons.streak, title: t('reward.streak', { n: entry.what }), body: amounts(entry).join(sep) };
  }
  if (entry.why === 'drop') {
    return { icon: icons.drop, title: t('reward.drop'), body: amounts(entry).join(sep) };
  }
  if (entry.why === 'achievement') {
    const a = ACHIEVEMENT[entry.what];
    const unlocks = skinsFor(entry.what).map(({ slot, item }) => t('reward.unlocks', { name: t(`skin.${slot}.${item.id}`) }));
    const body = [...amounts(entry), ...unlocks];
    return {
      icon: icons.achievement,
      title: t('reward.achievement', { name: a ? t(`achievement.${a.id}.name`) : entry.what }),
      body: body.length ? body.join(sep) : (a ? t(`achievement.${a.id}.desc`) : '')
    };
  }
  return { icon: ECONOMY.currency.icon, title: amounts(entry).join(sep), body: '' };
}
