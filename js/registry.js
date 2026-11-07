/*
 * One door to every catalogue, plus a check that they agree with each other.
 *
 * Everything the game can contain (modes, skins, powers, achievements,
 * economy numbers) is data in js/config/. Code reads it from here and never
 * hard-codes a list, so growing the game means adding entries, not code.
 */
import { MODES } from './config/modes.js';
import { SLOTS, SKINS, DEFAULT_LOOK } from './config/skins.js';
import { POWERS } from './config/powers.js';
import { ECONOMY } from './config/economy.js';
import { ACHIEVEMENTS } from './config/achievements.js';

export { MODES, SLOTS, SKINS, DEFAULT_LOOK, POWERS, ECONOMY, ACHIEVEMENTS };

const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));

export const MODE = byId(MODES);
export const POWER = byId(POWERS);
export const ACHIEVEMENT = byId(ACHIEVEMENTS);

export function skin(slot, id) {
  return (SKINS[slot] || []).find((item) => item.id === id) || null;
}

// What the engine and the stats code implement. A catalogue entry that
// names anything else is a typo or needs code first.
export const KNOWN_EFFECTS = [
  'revealStrokes', 'revealLayout', 'revealMeaning', 'revealReading',
  'revealParts', 'eliminateParts', 'addGuesses', 'revealKanji'
];
export const KNOWN_STATS = [
  'wins', 'bestStreak', 'fastestWin', 'cleanWins', 'collected', 'fullSetDays'
];
const UNLOCK_TYPES = ['free', 'points', 'achievement'];
const WHEN = ['before', 'during'];

// Logs every problem to the console and returns the list. Runs at start-up,
// so a broken id shows up straight away instead of failing quietly in play.
export function validate() {
  const problems = [];
  const say = (msg) => problems.push(msg);

  const checkIds = (list, label) => {
    const seen = new Set();
    list.forEach((item) => {
      if (!item.id) say(`${label} without an id: ${JSON.stringify(item)}`);
      else if (seen.has(item.id)) say(`${label} "${item.id}" is listed twice`);
      seen.add(item.id);
    });
  };

  // Modes
  checkIds(MODES, 'mode');
  const lengths = new Set();
  MODES.forEach((m) => {
    if (!Number.isInteger(m.length) || m.length < 1) say(`mode "${m.id}" has a bad length`);
    if (lengths.has(m.length)) say(`two modes have length ${m.length}`);
    lengths.add(m.length);
    if (!Number.isInteger(m.guesses) || m.guesses < 1) say(`mode "${m.id}" has a bad guess count`);
  });

  // Skins
  SLOTS.forEach((slot) => {
    if (!SKINS[slot.id]) say(`slot "${slot.id}" has no skins`);
    else checkIds(SKINS[slot.id], `${slot.id} skin`);
  });
  Object.keys(SKINS).forEach((key) => {
    if (!SLOTS.some((slot) => slot.id === key)) say(`SKINS.${key} isn't in SLOTS`);
  });
  Object.entries(SKINS).forEach(([slot, list]) => list.forEach((item) => {
    const u = item.unlock || {};
    if (!UNLOCK_TYPES.includes(u.type)) say(`${slot} skin "${item.id}" has an unknown unlock type`);
    if (u.type === 'points' && !(u.cost > 0)) say(`${slot} skin "${item.id}" needs a cost`);
    if (u.type === 'achievement' && !ACHIEVEMENT[u.id]) {
      say(`${slot} skin "${item.id}" unlocks with unknown achievement "${u.id}"`);
    }
  }));
  Object.entries(DEFAULT_LOOK).forEach(([slot, id]) => {
    const item = skin(slot, id);
    if (!item) say(`default ${slot} "${id}" doesn't exist`);
    else if (item.unlock.type !== 'free') say(`default ${slot} "${id}" isn't free`);
  });

  // Theme colours must exist in tokens.js, and every theme there needs an entry here.
  const themes = (window.TOKENS && window.TOKENS.themes) || {};
  (SKINS.theme || []).forEach((t) => {
    if (!themes[t.id]) say(`theme "${t.id}" has no colours in tokens.js`);
  });
  Object.keys(themes).forEach((id) => {
    if (!skin('theme', id)) say(`tokens.js theme "${id}" has no entry in skins.js`);
  });

  // Powers
  checkIds(POWERS, 'power');
  POWERS.forEach((p) => {
    if (!KNOWN_EFFECTS.includes(p.effect)) say(`power "${p.id}" uses unknown effect "${p.effect}"`);
    if (!Array.isArray(p.when) || !p.when.length || p.when.some((w) => !WHEN.includes(w))) {
      say(`power "${p.id}" needs when: ["before"] and/or ["during"]`);
    }
    if (p.cost !== null && !(p.cost > 0)) say(`power "${p.id}" needs a cost or null`);
    if (!(p.hold >= 1)) say(`power "${p.id}" needs hold of 1 or more`);
    if (!(p.drop >= 0)) say(`power "${p.id}" needs a drop weight of 0 or more`);
  });

  // Achievements and rewards
  checkIds(ACHIEVEMENTS, 'achievement');
  ACHIEVEMENTS.forEach((a) => {
    if (!KNOWN_STATS.includes(a.test && a.test.stat)) say(`achievement "${a.id}" tests unknown stat`);
    if (a.reward && a.reward.power && !POWER[a.reward.power]) {
      say(`achievement "${a.id}" rewards unknown power "${a.reward.power}"`);
    }
  });
  ECONOMY.streakRewards.forEach((r) => {
    if (r.power && !POWER[r.power]) say(`streak reward at ${r.days} days gives unknown power "${r.power}"`);
  });

  problems.forEach((msg) => console.warn('[kanjiru config]', msg));
  return problems;
}
