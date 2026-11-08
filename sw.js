/*
 * Kanjiru's service worker: play offline, and never a stale app.
 *
 * The game's own files go to the network first, every time, so a deploy
 * reaches players on their next visit; a copy of each is kept. Only when
 * the network fails (offline, or the server is down) does the copy answer,
 * so a daily can still be played on a train. The site's .htaccess files
 * make browsers recheck pages, scripts, styles and data on every visit, so
 * "the network" is never a stale HTTP cache either.
 *
 * Never touched: api/ (device transfer codes), review/ (dev only), any
 * .php, and anything that isn't a GET. Those go to the network as if there
 * were no service worker, and are never kept.
 *
 * Fonts: Google's font files have versioned URLs that never change, so
 * they come from the copy when there is one; the font stylesheet is
 * network first, like the game's files.
 *
 * js/service-worker.js registers this file, and sends the files the first
 * visit loaded before this worker was running, so they're kept too.
 *
 * Changing how this file caches: bump VERSION, and old copies are dropped.
 * Removing it: replace this file with one that calls
 * self.registration.unregister(); browsers check it on every visit.
 */
const VERSION = 1;
const SCOPE = new URL('./', self.location).href;   // this folder: the app
const PREFIX = `kanjiru:${SCOPE}:`;                  // worktrees on one server keep apart
const CACHE = `${PREFIX}v${VERSION}`;
const NEVER = ['api/', 'review/'];
const FONT_CSS = 'fonts.googleapis.com';
const FONT_FILES = 'fonts.gstatic.com';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith(PREFIX) && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// How a URL is handled: 'network' first, 'cache' first, or null (left alone).
function strategy(url) {
  if (url.origin === self.location.origin) {
    if (/\.php$/i.test(url.pathname)) return null;
    if (url.href.startsWith(SCOPE) && NEVER.some((p) => url.href.startsWith(SCOPE + p))) return null;
    return 'network';
  }
  if (url.hostname === FONT_CSS) return 'network';
  if (url.hostname === FONT_FILES) return 'cache';
  return null;
}

async function keep(cache, request, response) {
  if (response.ok && response.type !== 'opaque') await cache.put(request, response);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    keep(cache, request, response.clone()).catch(() => {});
    return response;
  } catch (error) {
    const copy = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (copy) return copy;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const copy = await cache.match(request);
  if (copy) return copy;
  const response = await fetch(request);
  keep(cache, request, response.clone()).catch(() => {});
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const how = strategy(new URL(request.url));
  if (how === 'network') event.respondWith(networkFirst(request));
  else if (how === 'cache') event.respondWith(cacheFirst(request));
});

// The page's first visit loaded its files before this worker ran: keep the
// ones it lists that aren't kept yet. { warm: [url, …] }
self.addEventListener('message', (event) => {
  const urls = event.data && Array.isArray(event.data.warm) ? event.data.warm : [];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(urls.map(async (href) => {
      try {
        const url = new URL(href, SCOPE);
        if (!strategy(url) || await cache.match(url.href)) return;
        const cors = url.origin !== self.location.origin;
        const response = await fetch(url.href, cors ? { mode: 'cors', credentials: 'omit' } : {});
        await keep(cache, url.href, response);
      } catch (e) { /* offline again, or not allowed: the next visit keeps it */ }
    }));
  })());
});
