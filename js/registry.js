/*
 * One door to every catalogue, plus a check that they agree with each other.
 *
 * Everything the game can contain (modes, levels, skins, powers, achievements,
 * economy numbers) is data in js/config/. Code reads it from here and never
 * hard-codes a list, so growing the game means adding entries, not code.
 */
import { MODES } from './config/modes.js';
import { SLOTS, SKINS, DEFAULT_LOOK } from './config/skins.js';
import { POWERS } from './config/powers.js';
import { ECONOMY } from './config/economy.js';
import { ACHIEVEMENTS } from './config/achievements.js';
import { RULES } from './config/rules.js';
import { LEVELS, DEFAULT_LEVEL, settingsLevel } from './config/levels.js';
import { has, missingStrings } from './i18n.js';
import { missingMergeRules } from './store.js';

export { MODES, SLOTS, SKINS, DEFAULT_LOOK, POWERS, ECONOMY, ACHIEVEMENTS, RULES, LEVELS, DEFAULT_LEVEL, settingsLevel };

// Where each catalogue entry's text lives in js/i18n/*.js.
export const TEXT_KEYS = {
  mode: (id) => [`mode.${id}.name`],
  level: (id) => [`level.${id}.name`, `level.${id}.desc`],
  slot: (id) => [`slot.${id}`],
  skin: (slot, id) => [`skin.${slot}.${id}`],
  power: (id) => [`power.${id}.name`, `power.${id}.desc`],
  achievement: (id) => [`achievement.${id}.name`, `achievement.${id}.desc`]
};

const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));

export const MODE = byId(MODES);
export const LEVEL = byId(LEVELS);
export const POWER = byId(POWERS);
export const ACHIEVEMENT = byId(ACHIEVEMENTS);

// The hints a player can see, hold, buy and use: every power but the
// retired ones (powers.js), in catalogue order.
export const OFFERED_POWERS = POWERS.filter((p) => !p.retired);

export function skin(slot, id) {
  return (SKINS[slot] || []).find((item) => item.id === id) || null;
}

// What the engine and the stats code implement. A catalogue entry that
// names anything else is a typo or needs code first.
export const KNOWN_EFFECTS = [
  'revealStrokes', 'revealLayout', 'revealMeaning', 'revealReading',
  'revealParts', 'eliminateParts', 'addGuesses', 'revealKanji', 'pointNear'
];
// The hint drawings js/play/hint-art.js has (ART), for powers.js art, and
// the ways an icons look can draw them (skins.js style).
export const KNOWN_ART = ['tally', 'split', 'book', 'arrows', 'broom', 'part', 'plus-one', 'kanji'];
export const ICON_STYLES = ['emoji', 'illustrated', 'seal', 'badge'];
export const KNOWN_STATS = [
  'wins', 'bestStreak', 'fastestWin', 'cleanWins', 'collected', 'hardWins', 'fullSetDays'
];
// Marks a part can get that pay points (js/engine/score.js).
export const MARK_POINTS = ['hit', 'near', 'other'];
// What a guess can be (js/config/levels.js guess).
export const GUESS_KINDS = ['kanji', 'parts'];
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
  const lists = new Set();
  MODES.forEach((m) => {
    if (m.length !== null && !(Number.isInteger(m.length) && m.length >= 1)) say(`mode "${m.id}" needs a length, or null`);
    if (typeof m.answers !== 'string' || !m.answers) say(`mode "${m.id}" needs answers: a list in data/game/answers.json`);
    if (lists.has(m.answers)) say(`two modes play the answer list "${m.answers}"`);
    lists.add(m.answers);
    if (typeof m.listed !== 'boolean') say(`mode "${m.id}" needs listed: true or false`);
    if (!Number.isInteger(m.guesses) || m.guesses < 1) say(`mode "${m.id}" has a bad guess count`);
    if (!Number.isInteger(m.palette) || m.palette < 1) say(`mode "${m.id}" needs a palette size`);
    if (m.freeMeaning !== null && !(Number.isInteger(m.freeMeaning) && m.freeMeaning >= 0)) {
      say(`mode "${m.id}" needs freeMeaning: a guess count, or null for never`);
    }
    if (typeof m.playable !== 'boolean') say(`mode "${m.id}" needs playable: true or false`);
  });

  // Levels
  checkIds(LEVELS, 'level');
  LEVELS.forEach((l) => {
    if (!GUESS_KINDS.includes(l.guess)) say(`level "${l.id}" needs guess: ${GUESS_KINDS.join(' or ')}`);
    ['offered', 'hard', 'guided', 'order', 'places', 'realKanji', 'useHints', 'showSplit', 'countLeft', 'meanings', 'freeMeaning'].forEach((k) => {
      if (typeof l[k] !== 'boolean') say(`level "${l.id}" needs ${k}: true or false`);
    });
    if (!(l.points > 0)) say(`level "${l.id}" needs a points multiplier`);
    if (!(l.paletteScale > 0)) say(`level "${l.id}" needs a paletteScale above 0`);
  });
  if (!LEVEL[DEFAULT_LEVEL] || !LEVEL[DEFAULT_LEVEL].offered) say(`the default level "${DEFAULT_LEVEL}" isn't offered in levels.js`);
  // Every mix of the Settings switches needs exactly one offered level.
  [[false, false], [true, false], [false, true], [true, true]].forEach(([hard, guided]) => {
    const n = LEVELS.filter((l) => l.offered && l.hard === hard && l.guided === guided).length;
    if (n !== 1) say(`levels.js needs one offered level with hard: ${hard}, guided: ${guided} (has ${n})`);
  });

  // Points for marks the engine gives (js/engine/score.js MARKS).
  MARK_POINTS.forEach((mark) => {
    if (!(ECONOMY.perPart[mark] >= 0)) say(`economy.perPart.${mark} needs a number`);
  });
  if (!Array.isArray(RULES.palette.always)) say('rules.palette.always needs a list of tiles');
  if (!Array.isArray(RULES.palette.strokeKeys)) say('rules.palette.strokeKeys needs a list of tiles');
  ['miss', ...MARK_POINTS].forEach((mark) => {
    if (!(RULES.share && RULES.share.marks && RULES.share.marks[mark])) say(`rules.share.marks.${mark} needs a square`);
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
    if ('soon' in item && typeof item.soon !== 'boolean') say(`${slot} skin "${item.id}" needs soon: true or false`);
    if (u.type === 'achievement' && !ACHIEVEMENT[u.id]) {
      say(`${slot} skin "${item.id}" unlocks with unknown achievement "${u.id}"`);
    } else if (u.type === 'achievement' && ACHIEVEMENT[u.id].retired) {
      say(`${slot} skin "${item.id}" unlocks with retired achievement "${u.id}", which can't be earned`);
    }
  }));
  (SKINS.icons || []).forEach((item) => {
    if (!ICON_STYLES.includes(item.style)) say(`icons skin "${item.id}" needs style: ${ICON_STYLES.join(', ')}`);
  });
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
  const semantic = window.TOKENS && window.TOKENS.semantic;
  const badges = semantic ? semantic.color.hint.badge : null;   // tests have no tokens
  POWERS.forEach((p) => {
    if (!KNOWN_EFFECTS.includes(p.effect)) say(`power "${p.id}" uses unknown effect "${p.effect}"`);
    if (!Array.isArray(p.when) || !p.when.length || p.when.some((w) => !WHEN.includes(w))) {
      say(`power "${p.id}" needs when: ["before"] and/or ["during"]`);
    }
    if (p.cost !== null && !(p.cost > 0)) say(`power "${p.id}" needs a cost or null`);
    if (!(p.hold >= 1)) say(`power "${p.id}" needs hold of 1 or more`);
    if (!(p.drop >= 0)) say(`power "${p.id}" needs a drop weight of 0 or more`);
    if ('retired' in p && typeof p.retired !== 'boolean') say(`power "${p.id}" needs retired: true or false`);
    if (p.retired && (p.drop || p.cost !== null)) say(`retired power "${p.id}" can't drop or be bought: drop 0, cost null`);
    if (p.art !== undefined && !KNOWN_ART.includes(p.art)) say(`power "${p.id}" uses unknown art "${p.art}"`);
    if (!p.retired && !p.art) say(`power "${p.id}" needs art: its drawing in js/play/hint-art.js`);
    if (p.art && (badges ? !badges[p.badge] : typeof p.badge !== 'string')) say(`power "${p.id}" needs badge: a colour in tokens.js hint.badge`);
    if (p.becomes && (!p.retired || !POWER[p.becomes.id] || POWER[p.becomes.id].retired || !(p.becomes.n >= 1))) {
      say(`power "${p.id}" becomes: only a retired power becomes n (1 or more) of a power still offered`);
    }
  });
  const retired = (id) => !!(POWER[id] && POWER[id].retired);

  // Achievements and rewards
  checkIds(ACHIEVEMENTS, 'achievement');
  ACHIEVEMENTS.forEach((a) => {
    if (!KNOWN_STATS.includes(a.test && a.test.stat)) say(`achievement "${a.id}" tests unknown stat`);
    if (a.reward && a.reward.power && !POWER[a.reward.power]) {
      say(`achievement "${a.id}" rewards unknown power "${a.reward.power}"`);
    }
    if (a.reward && retired(a.reward.power)) say(`achievement "${a.id}" rewards retired power "${a.reward.power}"`);
    if (a.reward && a.reward.points !== undefined && !(a.reward.points > 0)) say(`achievement "${a.id}" needs reward points above 0`);
    if ('retired' in a && typeof a.retired !== 'boolean') say(`achievement "${a.id}" needs retired: true or false`);
  });
  if (!(ECONOMY.startingPoints >= 0)) say('economy.startingPoints needs a number');
  ['chanceOnPerfect', 'perfectShare'].forEach((k) => {
    if (!(ECONOMY.drops[k] >= 0 && ECONOMY.drops[k] <= 1)) say(`economy.drops.${k} needs a number from 0 to 1`);
  });
  if (typeof ECONOMY.drops.afterHints !== 'boolean') say('economy.drops.afterHints needs true or false');
  ['base', 'perUnusedGuess', 'perUnusedGuessHinted'].forEach((k) => {
    if (!(ECONOMY.solve[k] >= 0)) say(`economy.solve.${k} needs a number from 0`);
  });
  ECONOMY.streakRewards.forEach((r) => {
    if (r.power && !POWER[r.power]) say(`streak reward at ${r.wins} wins gives unknown power "${r.power}"`);
    if (retired(r.power)) say(`streak reward at ${r.wins} wins gives retired power "${r.power}"`);
  });

  // Text: every catalogue entry needs its English text, and every other
  // language needs every English key.
  const needText = [
    ...MODES.flatMap((m) => TEXT_KEYS.mode(m.id)),
    ...LEVELS.flatMap((l) => TEXT_KEYS.level(l.id)),
    ...SLOTS.flatMap((s) => TEXT_KEYS.slot(s.id)),
    ...Object.entries(SKINS).flatMap(([slot, list]) => list.flatMap((item) => TEXT_KEYS.skin(slot, item.id))),
    ...POWERS.flatMap((p) => TEXT_KEYS.power(p.id)),
    ...ACHIEVEMENTS.flatMap((a) => TEXT_KEYS.achievement(a.id))
  ];
  needText.forEach((key) => { if (!has('en', key)) say(`no English text for ${key} in js/i18n/en.js`); });
  missingStrings().forEach((gap) => say(`missing translation ${gap}`));

  // The save: moving devices needs a merge rule for every key.
  missingMergeRules().forEach((key) => say(`save key "${key}" has no merge rule in MERGE (js/store.js)`));

  problems.forEach((msg) => console.warn('[kanjiru config]', msg));
  return problems;
}
