/*
 * Registers the service worker (sw.js): offline play once the game has
 * been opened, and never a stale app (see sw.js). Loaded from index.html's
 * <head>, apart from the game, so it can't hold up the first screen.
 *
 * Browsers only allow service workers on https and on localhost, so on the
 * phone's LAN test link (plain http) the game runs without one, as before.
 */
const worker = navigator.serviceWorker;

if (worker && window.isSecureContext) {
  // After the page has loaded, so registering never competes with it.
  const start = () => {
    worker.register(new URL('../sw.js', import.meta.url)).catch((e) => {
      console.warn('[kanjiru] the service worker didn’t register; the game works without it', e);
    });
    // The files this first visit loaded before the worker ran: send them so
    // it keeps them too (it skips any it already has).
    worker.ready.then((registration) => {
      if (!registration.active) return;
      const files = performance.getEntriesByType('resource').map((r) => r.name);
      registration.active.postMessage({ warm: [location.href.split('#')[0], ...files] });
    });
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
