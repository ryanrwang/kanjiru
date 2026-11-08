/*
 * One game: its state, guesses, powers and points. Pure: no DOM, no save.
 *
 *   const engine = createEngine(data);          // data: js/engine/data.js
 *   let game = engine.newGame({ ...daily(data, mode, today()), level });
 *   let r = engine.guess(game, '明');            // a 'kanji' level: { state, scored } or { state, error }
 *   r = engine.guess(game, [['日', '月']]);       // a 'parts' level: tile ids per kanji
 *   r = engine.usePower(r.state, 'strokes');     // { state, result } or { state, error }
 *   engine.points(r.state);                      // { parts, solve, multiplier, total }
 *
 * Every call returns a new state and leaves the old one alone. The state is
 * plain JSON, and `log` replays it: engine.replay(start, state.log).
 *
 * Every mode, level, power and number comes from the config (js/registry.js
 * by default; tests pass their own). Power effects are the only code: one per
 * name in KNOWN_EFFECTS, below in EFFECTS.
 */
import { MODES, POWERS, ECONOMY, RULES, LEVELS, DEFAULT_LEVEL } from '../registry.js';
import { scoreGuess, scoreParts, layoutOf, MARKS } from './score.js';
import { buildPalette, buildable, easiestFirst } from './palette.js';
import { seeded, shuffle, weightedIndex } from './random.js';

export const DEFAULT_CONFIG = {
  modes: MODES, powers: POWERS, economy: ECONOMY, rules: RULES, levels: LEVELS, defaultLevel: DEFAULT_LEVEL
};

const clone = (x) => JSON.parse(JSON.stringify(x));
const key = (ref) => `${ref.slot}:${ref.part}`;
const better = (a, b) => MARKS.indexOf(a) > MARKS.indexOf(b || 'miss');
// A bag of tile ids, order ignored: ['月', '日'] and ['日', '月'] match.
const bagKey = (els) => els.slice().sort().join('+');
const bagsKey = (picks) => picks.map(bagKey).join('/');

// options.isWord(word, mode): turns away guesses that aren't real words
// (step 4 decides whether 2+ kanji modes pass one).
export function createEngine(data, config = DEFAULT_CONFIG, options = {}) {
  const MODE = Object.fromEntries(config.modes.map((m) => [m.id, m]));
  const POWER = Object.fromEntries(config.powers.map((p) => [p.id, p]));
  const LEVEL = Object.fromEntries(config.levels.map((l) => [l.id, l]));
  const { economy, rules } = config;
  const tileOrder = new Map(data.tiles.map((t, i) => [t.id, i]));
  const tileUses = new Map(data.tiles.map((t) => [t.id, t.uses || 0]));

  const slotsOf = (word) => [...word].map((kanji) => ({ kanji, parts: data.kanji[kanji].parts }));
  const answerSlots = (state) => slotsOf(state.answer);
  const modeOf = (state) => MODE[state.mode];
  const levelOf = (state) => LEVEL[state.level];

  // Real kanji by their bag of parts, easiest first: what a 'parts' guess
  // makes. Worked out the first time it's needed.
  let byBag = null;
  const kanjiFrom = (els) => {
    if (!byBag) {
      byBag = new Map();
      Object.keys(data.kanji).sort(easiestFirst(data)).forEach((ch) => {
        const k = bagKey(data.kanji[ch].parts.map((p) => p.el));
        if (!byBag.has(k)) byBag.set(k, []);
        byBag.get(k).push(ch);
      });
    }
    return byBag.get(bagKey(els)) || [];
  };

  // ── Starting ───────────────────────────────────────────────────────

  // start: { modeId, answer, seed, daily, puzzle } (js/engine/daily.js makes
  // these), plus level: a levels.js id (the config's default when missing).
  function newGame(start) {
    const mode = MODE[start.modeId];
    if (!mode) throw new Error(`unknown mode "${start.modeId}"`);
    const level = LEVEL[start.level || config.defaultLevel];
    if (!level) throw new Error(`unknown level "${start.level}"`);
    const chars = [...String(start.answer || '')];
    if (chars.length !== mode.length) throw new Error(`answer "${start.answer}" isn't ${mode.length} kanji`);
    chars.forEach((ch) => { if (!data.kanji[ch]) throw new Error(`answer kanji "${ch}" has no data`); });
    const seed = String(start.seed);
    return {
      mode: mode.id,
      level: level.id,
      answer: start.answer,
      seed,
      daily: !!start.daily,
      puzzle: start.daily ? start.puzzle : null,
      rows: mode.guesses,
      palette: buildPalette({ data, answerKanji: chars, size: mode.palette, rules, rng: seeded(`${seed}:palette`) }),
      status: 'playing',
      guesses: [],
      powers: [],
      revealed: { strokes: false, layout: false, meaning: false, reading: false, parts: [], kanji: [], eliminated: [] },
      found: {},        // best mark per answer part, "slot:part" → mark
      partPoints: 0,    // before multipliers
      log: []
    };
  }

  // ── Guessing ───────────────────────────────────────────────────────

  // Why a guess can't be made, or null. A guess is a word for a 'kanji'
  // level and tile ids per kanji for a 'parts' level (levels.js guess).
  // Codes: over, level (the wrong kind of guess), length, not-kanji, slots,
  // not-in-palette, not-real, repeat, not-a-word.
  function checkGuess(state, input) {
    if (state.status !== 'playing') return 'over';
    return levelOf(state).guess === 'parts' ? checkParts(state, input) : checkWord(state, input);
  }

  function checkWord(state, word) {
    const mode = modeOf(state);
    if (typeof word !== 'string') return 'level';
    const chars = [...word];
    if (chars.length !== mode.length) return 'length';
    if (!chars.every((ch) => data.kanji[ch])) return 'not-kanji';
    if (rules.guessFromPalette && !chars.every((ch) => buildable(data, ch, state.palette))) return 'not-in-palette';
    if (state.guesses.some((g) => g.word === word)) return 'repeat';
    if (options.isWord && !options.isWord(word, mode)) return 'not-a-word';
    return null;
  }

  // picks: [[tileId, …], …], one list per kanji of the answer, as many
  // tiles as that kanji has parts.
  function checkParts(state, picks) {
    const answer = answerSlots(state);
    if (!Array.isArray(picks) || !picks.every(Array.isArray)) return 'level';
    if (picks.length !== answer.length || picks.some((els, s) => els.length !== answer[s].parts.length)) return 'slots';
    const palette = new Set(rules.guessFromPalette ? state.palette : tileOrder.keys());
    if (!picks.every((els) => els.every((id) => palette.has(id)))) return 'not-in-palette';
    const real = levelOf(state).realKanji;
    if (real && !picks.every((els) => kanjiFrom(els).length)) return 'not-real';
    if (state.guesses.some((g) => g.parts && bagsKey(g.parts) === bagsKey(picks))) return 'repeat';
    if (real && options.isWord && answer.length > 1
      && !options.isWord(wordOf(state, picks, scoreParts(picks, answer)), modeOf(state))) return 'not-a-word';
    return null;
  }

  // The kanji a parts guess shows: a solved slot's answer kanji; at a
  // realKanji level, else the easiest real kanji its parts make (written
  // into each scored slot). Returns the whole word, or null when a slot
  // has none.
  function wordOf(state, picks, scored) {
    const real = levelOf(state).realKanji;
    const chars = scored.map((slot, s) => slot.kanji || (real && kanjiFrom(picks[s])[0]) || null);
    chars.forEach((ch, s) => { scored[s].kanji = ch; });
    return chars.every(Boolean) ? chars.join('') : null;
  }

  function guess(state, input) {
    const error = checkGuess(state, input);
    if (error) return { state, error };
    const next = clone(state);
    const parts = levelOf(next).guess === 'parts';
    const picks = parts ? input.map((els) => els.slice()) : null;
    const scored = parts ? scoreParts(picks, answerSlots(next)) : scoreGuess(slotsOf(input), answerSlots(next));
    const word = parts ? wordOf(next, picks, scored) : input;
    scored.forEach((slot) => slot.tiles.forEach((tile) => {
      if (tile.of) markFound(next, tile.of, tile.mark, true);
    }));
    next.guesses.push(parts ? { word, parts: picks, slots: scored } : { word, slots: scored });
    next.log.push({ guess: parts ? picks : input });
    if (scored.every((slot) => slot.solved)) next.status = 'won';
    else if (next.guesses.length >= next.rows) next.status = 'lost';
    return { state: next, scored };
  }

  // Records a better mark for an answer part; pays the difference if `pay`.
  function markFound(state, ref, mark, pay) {
    const was = state.found[key(ref)];
    if (!better(mark, was)) return;
    if (pay) {
      const gain = (economy.perPart[mark] || 0) - (economy.perPart[was] || 0);
      state.partPoints += Math.max(0, gain);
    }
    state.found[key(ref)] = mark;
  }

  // ── What the player knows ──────────────────────────────────────────

  const solvedSlots = (state) => {
    const out = new Set(state.revealed.kanji);
    state.guesses.forEach((g) => g.slots.forEach((slot, s) => { if (slot.solved) out.add(s); }));
    return out;
  };

  // The guess count after which the meaning is free, or null for never.
  const meaningFreeAt = (state) => {
    const free = modeOf(state).freeMeaning;
    return levelOf(state).freeMeaning && free !== null && free !== undefined ? free : null;
  };
  const meaningShown = (state) => {
    const free = meaningFreeAt(state);
    return state.revealed.meaning || (free !== null && state.guesses.length >= free);
  };

  // Answer parts not yet known green, outside solved slots.
  const hiddenParts = (state) => {
    const solved = solvedSlots(state);
    const out = [];
    answerSlots(state).forEach((slot, s) => {
      if (solved.has(s)) return;
      slot.parts.forEach((p, i) => { if (state.found[key({ slot: s, part: i })] !== 'hit') out.push({ slot: s, part: i }); });
    });
    return out;
  };

  // Palette tiles not in the answer and not yet ruled out, most used first.
  const decoysLeft = (state) => {
    const inAnswer = new Set(answerSlots(state).flatMap((slot) => slot.parts.map((p) => p.el)));
    const out = new Set(state.revealed.eliminated);
    state.guesses.forEach((g) => g.slots.forEach((slot) => slot.tiles.forEach((tile) => {
      if (!inAnswer.has(tile.el)) out.add(tile.el);
    })));
    return state.palette
      .filter((id) => !inAnswer.has(id) && !out.has(id))
      .sort((a, b) => (tileUses.get(b) - tileUses.get(a)) || (tileOrder.get(a) - tileOrder.get(b)));
  };

  // What the answer looks like so far, for the hints panel. null = not shown.
  function clues(state) {
    const answer = answerSlots(state);
    const word = answerInfo(state.answer);
    return {
      strokes: state.revealed.strokes ? answer.map((slot) => data.kanji[slot.kanji].strokes) : null,
      layout: state.revealed.layout ? answer.map((slot) => layoutOf(slot.parts)) : null,
      meaning: meaningShown(state) ? word.meanings : null,
      meaningFree: meaningShown(state) && !state.revealed.meaning,
      meaningFreeAt: meaningFreeAt(state),
      reading: state.revealed.reading ? word.reading : null,
      parts: state.revealed.parts.map((ref) => ({ ...ref, ...answer[ref.slot].parts[ref.part] })),
      kanji: state.revealed.kanji.map((slot) => ({ slot, kanji: answer[slot].kanji })),
      eliminated: state.revealed.eliminated.slice(),
      solved: [...solvedSlots(state)].sort((a, b) => a - b)
    };
  }

  // The answer's dictionary info. One kanji: its meanings and on/kun
  // readings; a word: its reading and meanings.
  function answerInfo(word) {
    const chars = [...word];
    if (chars.length === 1) {
      const k = data.kanji[word];
      return { word, meanings: k.meanings || [], reading: { on: k.on || [], kun: k.kun || [] } };
    }
    const w = (data.words && data.words[word]) || {};
    return { word, meanings: w.meanings || [], reading: w.reading || '' };
  }

  // ── Powers ─────────────────────────────────────────────────────────
  //
  // One entry per effect in KNOWN_EFFECTS (js/registry.js):
  //   useful(state, params)            false when it would show nothing new
  //   apply(state, params, rng)  →     what it revealed (state is a copy)

  const EFFECTS = {
    revealStrokes: {
      useful: (s) => !s.revealed.strokes,
      apply: (s) => { s.revealed.strokes = true; return { strokes: clues(s).strokes }; }
    },
    revealLayout: {
      useful: (s) => !s.revealed.layout,
      apply: (s) => { s.revealed.layout = true; return { layout: clues(s).layout }; }
    },
    revealMeaning: {
      useful: (s) => !meaningShown(s),
      apply: (s) => { s.revealed.meaning = true; return { meaning: clues(s).meaning }; }
    },
    revealReading: {
      useful: (s) => !s.revealed.reading,
      apply: (s) => { s.revealed.reading = true; return { reading: clues(s).reading }; }
    },
    revealParts: {
      useful: (s) => hiddenParts(s).length > 0,
      apply: (s, params, rng) => {
        const picks = shuffle(hiddenParts(s), rng).slice(0, Math.max(1, params.count || 1));
        picks.forEach((ref) => { s.revealed.parts.push(ref); markFound(s, ref, 'hit', false); });
        const answer = answerSlots(s);
        return { parts: picks.map((ref) => ({ ...ref, ...answer[ref.slot].parts[ref.part] })) };
      }
    },
    eliminateParts: {
      useful: (s) => decoysLeft(s).length > 0,
      apply: (s, params) => {
        const picks = decoysLeft(s).slice(0, Math.max(1, params.count || 1));
        s.revealed.eliminated.push(...picks);
        return { eliminated: picks };
      }
    },
    addGuesses: {
      useful: () => true,
      apply: (s, params) => { s.rows += Math.max(1, params.count || 1); return { rows: s.rows }; }
    },
    revealKanji: {
      // Never fills the last unsolved kanji: that would solve the puzzle.
      useful: (s) => answerSlots(s).length - solvedSlots(s).size > 1,
      apply: (s, params, rng) => {
        const solved = solvedSlots(s);
        const open = answerSlots(s).map((_, i) => i).filter((i) => !solved.has(i));
        const picks = shuffle(open, rng).slice(0, Math.min(Math.max(1, params.count || 1), open.length - 1));
        const answer = answerSlots(s);
        picks.forEach((slot) => {
          s.revealed.kanji.push(slot);
          answer[slot].parts.forEach((_, part) => markFound(s, { slot, part }, 'hit', false));
        });
        return { kanji: picks.map((slot) => ({ slot, kanji: answer[slot].kanji })) };
      }
    }
  };

  // Why a power can't be used now, or null. Codes: unknown, over, mode,
  // when, useless. Whether the player holds one is the caller's check.
  function canUse(state, powerId) {
    const power = POWER[powerId];
    if (!power || !EFFECTS[power.effect]) return 'unknown';
    if (state.status !== 'playing') return 'over';
    if (modeOf(state).length < (power.minLength || 1)) return 'mode';
    const phase = state.guesses.length === 0 ? 'before' : 'during';
    if (!power.when.includes(phase)) return 'when';
    if (!EFFECTS[power.effect].useful(state, power.params || {})) return 'useless';
    return null;
  }

  function usePower(state, powerId) {
    const error = canUse(state, powerId);
    if (error) return { state, error };
    const power = POWER[powerId];
    const next = clone(state);
    const rng = seeded(`${next.seed}:power:${next.powers.length}`);
    const result = EFFECTS[power.effect].apply(next, power.params || {}, rng);
    next.powers.push(powerId);
    next.log.push({ power: powerId });
    return { state: next, result };
  }

  // ── Replaying, points, results ─────────────────────────────────────

  // Rebuilds a game from its start and log ([{ guess }, { power }, …]).
  function replay(start, log = []) {
    let state = newGame(start);
    log.forEach((step) => {
      const r = 'guess' in step ? guess(state, step.guess) : usePower(state, step.power);
      if (r.error) throw new Error(`replay failed at ${JSON.stringify(step)}: ${r.error}`);
      state = r.state;
    });
    return state;
  }

  // Points so far; the total is what the game pays once it's over.
  function points(state) {
    const mode = modeOf(state);
    const solve = state.status === 'won'
      ? economy.solve.base + economy.solve.perUnusedGuess * Math.max(0, mode.guesses - state.guesses.length)
      : 0;
    const multiplier = (mode.points || 1) * (levelOf(state).points || 1)
      * (state.daily ? economy.dailyMultiplier : economy.practiceMultiplier);
    return { parts: state.partPoints, solve, multiplier, total: Math.round((state.partPoints + solve) * multiplier) };
  }

  // The history entry for the save (js/store.js): what stats.js reads.
  // Its guesses replay through guess(): words, or tile ids for parts guesses.
  function record(state, date) {
    return {
      date,
      guesses: state.guesses.map((g) => g.parts || g.word),
      won: state.status === 'won',
      powers: state.powers.slice(),
      answer: state.answer,
      level: state.level
    };
  }

  // The random bonus hint after a win: a power id, or null. inventory is
  // the save's { powerId: count }; powers held at their limit are skipped.
  function rollDrop(state, inventory = {}, rng = Math.random) {
    if (state.status !== 'won') return null;
    const mode = modeOf(state);
    const perfect = state.guesses.length <= mode.guesses * economy.drops.perfectShare;
    const chance = perfect ? economy.drops.chanceOnPerfect : economy.drops.chanceOnWin;
    if (!(rng() < chance)) return null;
    const open = config.powers.filter((p) => p.drop > 0 && (inventory[p.id] || 0) < p.hold);
    const i = weightedIndex(open.map((p) => p.drop), rng);
    return i < 0 ? null : open[i].id;
  }

  return {
    newGame, guess, checkGuess, usePower, canUse, clues, answerInfo,
    replay, points, record, rollDrop, effects: Object.keys(EFFECTS)
  };
}
