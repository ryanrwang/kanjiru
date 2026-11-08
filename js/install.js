/*
 * Adding Kanjiru to the home screen (docs/DESIGN.md, "Saving and devices").
 *
 * iOS Safari clears a site's saved progress after 7 days without a visit;
 * a home-screen app keeps it. On iOS the home-screen app also has storage of
 * its own, apart from Safari's, so it starts empty: progress moves there with
 * a code (Settings). Chrome on Android shares its storage with the app.
 *
 *   installed()        running from the home screen, or installed just now
 *   platform()         'ios', 'android' or 'other'
 *   canPrompt()        the browser offered its own install prompt (Chrome, Edge)
 *   promptInstall()    shows it; resolves true when the player installs
 *   onInstallChange(fn) fn() when the prompt becomes available or the app
 *                      is installed, so the page can redraw
 *   installSteps(p)    the steps for platform p, as nodes
 *   tipDue(save)       the play page's tip shows: a phone with progress, not
 *                      installed, and not put off lately (RULES.installTip)
 *
 * Shown in two places: a tip on the play page (app.js) and a section in
 * Settings (js/settings.js), which stays for anyone not installed.
 */
import { RULES } from './registry.js';
import { t } from './i18n.js';
import { el } from './dom.js';
import { hasProgress } from './store.js';
import { localDate, addDays } from './engine/daily.js';

let deferred = null;       // Chrome's beforeinstallprompt, kept for the button
let justInstalled = false;
const listeners = new Set();
const changed = () => listeners.forEach((fn) => fn());

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferred = event;
  changed();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  justInstalled = true;
  changed();
});

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function installed() {
  return justInstalled
    || window.navigator.standalone === true
    || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}

export function platform() {
  const ua = navigator.userAgent || '';
  // iPadOS asks for desktop sites, so it says Macintosh; touch gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

export function canPrompt() {
  return !!deferred && !installed();
}

export async function promptInstall() {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  event.prompt();
  let accepted = false;
  try { accepted = (await event.userChoice).outcome === 'accepted'; } catch (e) { accepted = false; }
  if (accepted) justInstalled = true;
  changed();
  return accepted;
}

// The steps for one platform, as a numbered list.
export function installSteps(p) {
  const keys = p === 'ios' ? ['share', 'add', 'move'] : ['menu', 'keeps'];
  return el('ol', { class: 'install-steps' }, keys.map((key) => el('li', {}, t(`install.${p}.${key}`))));
}

export function tipDue(save) {
  if (installed() || platform() === 'other' || !hasProgress(save)) return false;
  const later = save.settings.installLater;
  return !later || localDate() >= addDays(later, RULES.installTip.laterDays);
}
