/*
 * Interface languages.
 *
 * No user-facing text lives in code or in the catalogues. Catalogues hold
 * ids and rules; js/i18n/<lang>.js holds the words, keyed by those ids
 * (mode.k1.name, power.sweep.desc, skin.theme.ai …).
 *
 * Adding a language: copy en.js to <lang>.js, translate it, and add an entry
 * to LANGUAGES. validate() in js/registry.js lists any missing keys.
 *
 * This covers the interface. Game content comes from the dictionaries in
 * English; the answers' meanings in other languages are written by hand
 * (data/meanings-ja.json, compiled by tools/compile_game.py), and the
 * Meaning hint shows them in the interface's language.
 */
import en from './i18n/en.js';
import ja from './i18n/ja.js';

// label: shown on the toggle when this language is next, in its own script.
// switchTo: the toggle's accessible name, also in this language.
export const LANGUAGES = [
  { id: 'en', name: 'English', label: 'EN', switchTo: 'Switch to English', strings: en },
  { id: 'ja', name: '日本語',  label: 'あ',  switchTo: '日本語に切り替える', strings: ja }
];

const BASE = LANGUAGES[0];
let current = BASE;

function lookup(strings, key) {
  return key.split('.').reduce(
    (node, part) => (node && typeof node === 'object' ? node[part] : undefined),
    strings
  );
}

// t('play.meta', { guesses: 6, mult: 1.5 }) → "6 guesses · ×1.5 pts"
// Falls back to English, then to the key itself, so a gap never breaks the page.
export function t(key, params = {}) {
  let text = lookup(current.strings, key);
  if (typeof text !== 'string') text = lookup(BASE.strings, key);
  if (typeof text !== 'string') return key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

export function has(langId, key) {
  const language = LANGUAGES.find((l) => l.id === langId);
  return !!language && typeof lookup(language.strings, key) === 'string';
}

// The device's preferred language, if we have it; English otherwise.
export function detect() {
  const prefs = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || ''];
  for (const pref of prefs) {
    const match = LANGUAGES.find((l) => pref.toLowerCase().startsWith(l.id));
    if (match) return match.id;
  }
  return BASE.id;
}

// Pass a saved choice, or null to follow the device.
export function setLang(id) {
  current = LANGUAGES.find((l) => l.id === id) || LANGUAGES.find((l) => l.id === detect()) || BASE;
  document.documentElement.lang = current.id;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = t('meta.description');
  return current.id;
}

export function lang() {
  return current.id;
}

// The language the toggle switches to (cycles, so a third language just works).
export function nextLanguage() {
  return LANGUAGES[(LANGUAGES.indexOf(current) + 1) % LANGUAGES.length];
}

function keysOf(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? keysOf(value, path) : [path];
  });
}

// Every English key another language is missing, as "ja: power.sweep.desc".
export function missingStrings() {
  const keys = keysOf(BASE.strings);
  return LANGUAGES.slice(1).flatMap((l) =>
    keys.filter((key) => !has(l.id, key)).map((key) => `${l.id}: ${key}`));
}
