/*
 * Typing parts on a physical keyboard (2026-11-11, the user agreed). Each
 * of the game's keys takes the physical key in the same place, row by row
 * (rules.js typing.rows), so at a desktop's 11 keys a row the screen's
 * keyboard is laid out like the one under the player's hands: Q to [, A
 * to ', Z to N.
 *
 * A key is found by the character it shows first, so a player on another
 * layout presses what they read; then by its place (KeyboardEvent.code),
 * for a character the layout doesn't give (Shift + ; is :). The character
 * shown is the player's own layout's where the browser says (Chromium's
 * navigator.keyboard), else QWERTY's.
 *
 *   keyCodes(count, cols)      the code for each of count keys, cols a row
 *   keyLabel(code)             the character to show for a code
 *   matchKey(keys, event)      the index of the key an event types, or -1
 *   readLayout(onReady)        asks the browser for the layout, once; returns
 *                              a function that stops onReady being called
 */
import { RULES } from '../registry.js';

// QWERTY's character for each code that isn't a letter.
const QWERTY = { BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/' };

export function fallbackLabel(code) {
  if (typeof code !== 'string') return null;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  return QWERTY[code] || null;
}

// One code per key, or null for a key past the end of its keyboard row
// (or below the last row).
export function keyCodes(count, cols, rows = RULES.typing.rows) {
  const out = [];
  if (!(cols > 0)) return Array.from({ length: count }, () => null);
  for (let i = 0; i < count; i += 1) {
    const row = rows[Math.floor(i / cols)];
    out.push((row && row[i % cols]) || null);
  }
  return out;
}

let layout = null;   // code → character, once the browser has said
let asked = null;
const waiting = new Set();   // who to tell when it has

export function keyLabel(code, map = layout) {
  if (!code) return null;
  const ch = map && typeof map.get === 'function' ? map.get(code) : null;
  return typeof ch === 'string' && ch.length === 1 ? ch.toUpperCase() : fallbackLabel(code);
}

// keys: [{ letter, code }] in keyboard order; event: { key, code }. Two
// keys showing the same letter (a layout's ı and i are both I) go by place.
export function matchKey(keys, event) {
  const typed = typeof event.key === 'string' && event.key.length === 1 ? event.key.toUpperCase() : null;
  if (typed) {
    const byLetter = keys.map((k, i) => (k.letter === typed ? i : -1)).filter((i) => i >= 0);
    if (byLetter.length === 1) return byLetter[0];
  }
  return event.code ? keys.findIndex((k) => k.code === event.code) : -1;
}

// The player's layout, from the browser where it can say (Chromium). Asks
// once; each onReady still waiting runs when the answer changes the
// letters (one already drawn after it came has them).
export function readLayout(onReady = () => {}) {
  if (!asked) {
    const kb = typeof navigator !== 'undefined' ? navigator.keyboard : null;
    asked = kb && typeof kb.getLayoutMap === 'function'
      ? kb.getLayoutMap().then((map) => {
        layout = map;
        waiting.forEach((fn) => fn());
        waiting.clear();
      }, () => waiting.clear())
      : Promise.resolve();
  }
  if (!layout) waiting.add(onReady);
  return () => waiting.delete(onReady);
}
