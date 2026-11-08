/*
 * One game: its state, guesses, powers and points. Pure: no DOM, no save.
 *
 *   const engine = createEngine(data);          // data: js/engine/data.js
 *   let game = engine.newGame({ ...daily(data, mode, today()), level });
 *   let r = engine.guess(game, '明');            // a 'kanji' level: { state, scored } or { state, error }
 *   r = engine.guess(game, [['日', '月']]);       // a 'parts' level: tile ids per kanji
 *                                                // (error: { state, error, detail })
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
import { scoreGuess, scoreParts, scoreOrder, layoutOf, MARKS } from './score.js';
import { buildPalette, buildable, easiestFirst } from './palette.js';
import { seeded, shuffle, weightedIndex } from './random.js';

export const DEFAULT_CONFIG = {
  modes: MODES, powers: POWERS, economy: ECONOMY, rules: RULES, levels: LEVELS, defaultLevel: DEFAULT_LEVEL
};

const clone = (x) => JSON.parse(JSON.stringify(x));
const key = (ref) => `${ref.slot}:${ref.part}`;
const better = (a, b) => MARKS.indexOf(a) > MARKS.indexOf(b || 'miss');
// A kanji's parts as a key, order ignored: tile ids, with their places
// when `places` is given (['月', '日'] and ['日', '月'] match without).
const partsKey = (els, places) => (places ? els.map((el, i) => `${el}@${places[i]}`) : els.slice()).sort().join('+');
// A shape: the number of parts, and their places when `withPlaces`.
const shapeKey = (parts, withPlaces) => (withPlaces ? parts.map((p) => p.pos).sort().join('+') : String(parts.length));
const plainMark = (mark) => (mark === 'other' ? 'miss' : mark);

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

  // Each cell's place, per slot, at a 'parts' level with places: the
  // answer's part positions in order. Otherwise null.
  const placesOf = (state) => {
    const level = levelOf(state);
    return level.guess === 'parts' && level.places ? answerSlots(state).map((slot) => slot.parts.map((p) => p.pos)) : null;
  };

  // Every kanji grouped by a key of its parts, easiest first, worked out the
  // first time it's needed: index(name, keyOf) → Map(key → [kanji]).
  const indexes = new Map();
  const index = (name, keyOf) => {
    if (!indexes.has(name)) {
      const map = new Map();
      Object.keys(data.kanji).sort(easiestFirst(data)).forEach((ch) => {
        const k = keyOf(data.kanji[ch].parts);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(ch);
      });
      indexes.set(name, map);
    }
    return indexes.get(name);
  };
  // The real kanji these tiles make (in these places, if given): what a
  // 'parts' guess shows at a realKanji level.
  const kanjiFrom = (els, places = null) =>
    index(places ? 'places' : 'tiles', (parts) => partsKey(parts.map((p) => p.el), places && parts.map((p) => p.pos)))
      .get(partsKey(els, places)) || [];
  const sameShape = (parts, withPlaces) =>
    index(withPlaces ? 'shape+places' : 'shape', (ps) => shapeKey(ps, withPlaces)).get(shapeKey(parts, withPlaces)) || [];
  // The real kanji whose parts are these, in this (writing) order.
  const kanjiInOrder = (els) => index('order', (parts) => parts.map((p) => p.el).join('+')).get(els.join('+')) || [];
  // Order levels: the parts, in order, split into real kanji (any split,
  // fewest kanji, easiest first), or null when no split makes real kanji.
  function splitIntoKanji(els) {
    const best = Array(els.length + 1).fill(null);
    best[0] = [];
    for (let i = 0; i < els.length; i += 1) {
      if (!best[i]) continue;
      for (let j = i + 1; j <= els.length; j += 1) {
        const found = kanjiInOrder(els.slice(i, j));
        if (!found.length) continue;
        const word = [...best[i], found[0]];
        if (!best[j] || word.length < best[j].length) best[j] = word;
      }
    }
    return best[els.length];
  }

  // ── Starting ───────────────────────────────────────────────────────

  // start: { modeId, answer, seed, daily, puzzle } (js/engine/daily.js makes
  // these), plus level: a levels.js id (the config's default when missing).
  function newGame(start) {
    const mode = MODE[start.modeId];
    if (!mode) throw new Error(`unknown mode "${start.modeId}"`);
    const level = LEVEL[start.level || config.defaultLevel];
    if (!level) throw new Error(`unknown level "${start.level}"`);
    const size = Math.round(mode.palette * (level.paletteScale || 1));
    const chars = [...String(start.answer || '')];
    if (!chars.length || (mode.length && chars.length !== mode.length)) throw new Error(`answer "${start.answer}" isn't ${mode.length} kanji`);
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
      palette: buildPalette({ data, answerKanji: chars, size, rules, rng: seeded(`${seed}:palette`) }),
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
  // not-in-palette, not-real, repeat, not-a-word, and with useHints,
  // keep-hit and use-near (hintProblem gives the part and cell).
  function checkGuess(state, input) {
    if (state.status !== 'playing') return 'over';
    return levelOf(state).guess === 'parts' ? checkParts(state, input) : checkWord(state, input);
  }

  function checkWord(state, word) {
    const mode = modeOf(state);
    if (typeof word !== 'string') return 'level';
    const chars = [...word];
    if (chars.length !== [...state.answer].length) return 'length';
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
    const level = levelOf(state);
    const real = level.realKanji;
    if (level.order) {
      // In order, the cells are the word's parts: the same parts in the same cells repeat.
      if (real && !splitIntoKanji(picks.flat())) return 'not-real';
      if (state.guesses.some((g) => g.parts && g.parts.flat().join('+') === picks.flat().join('+'))) return 'repeat';
      const hint = level.useHints ? hintProblem(state, picks) : null;
      return hint ? hint.code : null;
    }
    const places = placesOf(state);
    if (real && !picks.every((els, s) => kanjiFrom(els, places && places[s]).length)) return 'not-real';
    // The same parts in the same places (or, without places, the same parts).
    const key = (p) => p.map((els, s) => partsKey(els, places && places[s])).join('/');
    if (state.guesses.some((g) => g.parts && key(g.parts) === key(picks))) return 'repeat';
    if (real && options.isWord && answer.length > 1
      && !options.isWord(wordOf(state, picks, scoreParts(picks, answer, places)), modeOf(state))) return 'not-a-word';
    return null;
  }

  // Order levels with useHints (Hard), like Wordle's hard mode: what earlier
  // guesses found must be used. Every green stays in its cell, and every
  // part shown green or yellow is in the guess as many times as it was
  // found. The first problem, { code, part, cell }, or null.
  function hintProblem(state, picks) {
    const flat = picks.flat();
    const guesses = state.guesses.filter((g) => g.parts);
    for (const g of guesses) {
      const tiles = g.slots.flatMap((slot) => slot.tiles);
      const i = tiles.findIndex((tile, k) => tile.mark === 'hit' && flat[k] !== tile.el);
      if (i >= 0) return { code: 'keep-hit', part: tiles[i].form, cell: i + 1 };
    }
    for (const g of guesses) {
      const found = new Map();
      g.slots.flatMap((slot) => slot.tiles).forEach((tile) => {
        if (tile.mark === 'hit' || tile.mark === 'near') found.set(tile.el, (found.get(tile.el) || 0) + 1);
      });
      for (const [el, n] of found) {
        if (flat.filter((id) => id === el).length < n) return { code: 'use-near', part: el, cell: null };
      }
    }
    return null;
  }

  // The kanji a parts guess shows: a solved slot's answer kanji; at a
  // realKanji level, else the easiest real kanji its parts make (written
  // into each scored slot). Returns the whole word, or null when a slot
  // has none.
  function wordOf(state, picks, scored) {
    const real = levelOf(state).realKanji;
    if (levelOf(state).order) {
      // The kanji the parts make, in order (realKanji), or the answer once solved.
      if (real) return (splitIntoKanji(picks.flat()) || []).join('') || null;
      return scored.every((slot) => slot.solved) ? state.answer : null;
    }
    const places = placesOf(state);
    const chars = scored.map((slot, s) => slot.kanji || (real && kanjiFrom(picks[s], places && places[s])[0]) || null);
    chars.forEach((ch, s) => { scored[s].kanji = ch; });
    return chars.every(Boolean) ? chars.join('') : null;
  }

  function guess(state, input) {
    const error = checkGuess(state, input);
    if (error) {
      const hint = error === 'keep-hit' || error === 'use-near' ? hintProblem(state, input) : null;
      return { state, error, detail: hint ? { part: hint.part, cell: hint.cell } : {} };
    }
    const next = clone(state);
    const parts = levelOf(next).guess === 'parts';
    const picks = parts ? input.map((els) => els.slice()) : null;
    const scored = !parts ? scoreGuess(slotsOf(input), answerSlots(next))
      : levelOf(next).order ? scoreOrder(picks, answerSlots(next))
        : scoreParts(picks, answerSlots(next), placesOf(next));
    const word = parts ? wordOf(next, picks, scored) : input;
    scored.forEach((slot) => slot.tiles.forEach((tile) => {
      if (tile.of) markFound(next, tile.of, tile.mark, true);
    }));
    next.guesses.push(parts ? { word, parts: picks, slots: scored } : { word, slots: scored });
    // At a countLeft level, each guess keeps how many kanji fit after it.
    if (parts && levelOf(next).countLeft) next.guesses[next.guesses.length - 1].left = fits(next).map((list) => list.length);
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

  // The kanji that still fit everything the player has seen, per slot of
  // the answer, easiest first: the same shape (as many parts, in the same
  // places when cells show places), buildable from the palette, holding
  // the parts powers revealed and none swept away, the revealed stroke
  // count and layout, and giving every 'parts' guess so far the same
  // marks. Meanings and readings aren't checked. A slot a power filled
  // fits only its kanji. `other` marks count as grey: each slot is checked
  // on its own.
  function fits(state) {
    if (levelOf(state).order) return fitsInOrder(state);
    const places = placesOf(state);
    const palette = new Set(state.palette);
    const swept = new Set(state.revealed.eliminated);
    const layout = (parts) => [...new Set(parts.map((p) => p.pos))].sort().join('+');
    const guesses = state.guesses.filter((g) => g.parts);
    return answerSlots(state).map((slot, s) => {
      if (state.revealed.kanji.includes(s)) return [slot.kanji];
      const shown = state.revealed.parts.filter((ref) => ref.slot === s).map((ref) => slot.parts[ref.part]);
      return sameShape(slot.parts, !!places).filter((ch) => {
        const k = data.kanji[ch];
        if (!k.parts.every((p) => palette.has(p.el)) || k.parts.some((p) => swept.has(p.el))) return false;
        if (state.revealed.strokes && k.strokes !== data.kanji[slot.kanji].strokes) return false;
        if (state.revealed.layout && layout(k.parts) !== layout(slot.parts)) return false;
        if (!shown.every((part) => k.parts.some((p) => p.el === part.el && p.pos === part.pos))) return false;
        return guesses.every((g) => {
          const [again] = scoreParts([g.parts[s]], [{ kanji: ch, parts: k.parts }], places && [places[s]]);
          return again.tiles.every((tile, i) => tile.mark === plainMark(g.slots[s].tiles[i].mark));
        });
      });
    });
  }

  // Order levels: the kanji that still fit each slot, from what the cells of
  // that slot showed (a green part is at that place in the kanji's writing
  // order, a part not green there isn't), the parts no guess found in the
  // word at all, and the same palette, powers and shape checks as fits().
  function fitsInOrder(state) {
    const palette = new Set(state.palette);
    const swept = new Set(state.revealed.eliminated);
    const layout = (parts) => [...new Set(parts.map((p) => p.pos))].sort().join('+');
    const guesses = state.guesses.filter((g) => g.parts);
    // A tile every copy of which some guess marked grey isn't in the word.
    const absent = new Set();
    guesses.forEach((g) => {
      const tiles = g.slots.flatMap((slot) => slot.tiles);
      tiles.forEach((tile) => {
        if (tiles.every((other) => other.el !== tile.el || other.mark === 'miss')) absent.add(tile.el);
      });
    });
    return answerSlots(state).map((slot, s) => {
      if (state.revealed.kanji.includes(s)) return [slot.kanji];
      const shown = state.revealed.parts.filter((ref) => ref.slot === s);
      return sameShape(slot.parts, false).filter((ch) => {
        const k = data.kanji[ch];
        if (!k.parts.every((p) => palette.has(p.el)) || k.parts.some((p) => swept.has(p.el) || absent.has(p.el))) return false;
        if (state.revealed.strokes && k.strokes !== data.kanji[slot.kanji].strokes) return false;
        if (state.revealed.layout && layout(k.parts) !== layout(slot.parts)) return false;
        if (!shown.every((ref) => k.parts[ref.part].el === slot.parts[ref.part].el)) return false;
        return guesses.every((g) => g.slots[s].tiles.every((tile, i) => (tile.mark === 'hit') === (k.parts[i].el === tile.el)));
      });
    });
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
      // Cells that show places (or a Guided board) already show the layout.
      useful: (s) => !s.revealed.layout && !placesOf(s) && !levelOf(s).guided,
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
    if ([...state.answer].length < (power.minLength || 1)) return 'mode';
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
    replay, points, record, rollDrop, fits, effects: Object.keys(EFFECTS)
  };
}
