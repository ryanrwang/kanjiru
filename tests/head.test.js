/*
 * index.html's <head> against the files it names (step 8a): the module and
 * data preloads match what the app really loads, the home-screen icons and
 * the share image exist at their stated sizes, and the service worker never
 * touches the transfer API.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const head = read('index.html').split('</head>')[0];

// Every <link rel="…"> in the head: [{ rel, href, as, … }].
const links = [...head.matchAll(/<link\b([^>]*)>/g)].map(([, attrs]) =>
  Object.fromEntries([...attrs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, v ?? ''])));
const meta = (key) => {
  const m = head.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`));
  return m ? m[1] : null;
};

// Every module app.js loads, following static imports (and re-exports).
function importGraph(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const src = read(file);
    for (const [, spec] of src.matchAll(/^\s*(?:import|export)\b[^'"]*?['"](\.{1,2}\/[^'"]+)['"]/gm)) {
      queue.push(posix.join(posix.dirname(file), spec));
    }
  }
  return seen;
}

// A PNG's size from its header.
function pngSize(path) {
  const b = readFileSync(join(ROOT, path));
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${path} is a PNG`);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

test('modulepreload lists exactly the modules app.js imports', () => {
  const listed = new Set(links.filter((l) => l.rel === 'modulepreload').map((l) => l.href));
  const loaded = importGraph('app.js');
  const missing = [...loaded].filter((f) => !listed.has(f));
  const extra = [...listed].filter((f) => !loaded.has(f));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] },
    'index.html: add a <link rel="modulepreload" href="…"> for each missing module, and remove the extra ones');
});

test('the data preloads are the files loadData() fetches, in fetch mode', () => {
  const src = read('js/engine/data.js');
  const base = src.match(/loadData\(base = '([^']+)'\)/)[1];
  const fetched = [...src.matchAll(/get\('([^']+)'\)/g)].map(([, p]) => base + p).sort();
  const preloads = links.filter((l) => l.rel === 'preload' && l.as === 'fetch');
  assert.deepEqual(preloads.map((l) => l.href).sort(), fetched);
  // fetch() is a CORS request, so a preload without crossorigin isn't reused.
  preloads.forEach((l) => assert.ok('crossorigin' in l, `${l.href} needs crossorigin`));
});

test('the manifest and its icons', () => {
  const link = links.find((l) => l.rel === 'manifest');
  const manifest = JSON.parse(read(link.href));
  for (const key of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons']) assert.ok(manifest[key], key);
  // Relative, so the app also installs from a worktree or another folder.
  for (const key of ['id', 'start_url', 'scope']) assert.ok(!manifest[key].startsWith('/'), `${key} is relative`);
  const purposes = new Set();
  manifest.icons.forEach((icon) => {
    assert.ok(existsSync(join(ROOT, icon.src)), icon.src);
    assert.equal(pngSize(icon.src), icon.sizes, icon.src);
    purposes.add(`${icon.purpose}:${icon.sizes}`);
  });
  ['any:192x192', 'any:512x512', 'maskable:512x512'].forEach((p) => assert.ok(purposes.has(p), p));
  const touch = links.find((l) => l.rel === 'apple-touch-icon');
  assert.equal(pngSize(touch.href), '180x180');
});

test('the share image is 1200 x 630 and in this repo', () => {
  const url = meta('og:image');
  const live = 'https://www.ryanrwang.com/apps/kanjiru/';
  assert.ok(url.startsWith(live), 'og:image is absolute, on the live app');
  assert.equal(pngSize(url.slice(live.length)), `${meta('og:image:width')}x${meta('og:image:height')}`);
  assert.equal(`${meta('og:image:width')}x${meta('og:image:height')}`, '1200x630');
  assert.equal(meta('twitter:card'), 'summary_large_image');
  for (const key of ['og:title', 'og:description', 'og:url', 'og:image:alt']) assert.ok(meta(key), key);
});

// sw.js in a sandbox: which requests it answers (respondWith) and which it
// leaves to the network untouched.
function serviceWorker(location = 'https://www.ryanrwang.com/apps/kanjiru/sw.js') {
  const listeners = {};
  const self = { location: new URL(location), addEventListener: (type, fn) => { listeners[type] = fn; } };
  vm.runInNewContext(read('sw.js'), { self, URL, caches: { open: () => new Promise(() => {}) }, fetch: () => {}, console });
  return (url, method = 'GET') => {
    let answered = false;
    listeners.fetch({ request: { url, method, mode: 'cors' }, respondWith: () => { answered = true; } });
    return answered;
  };
}

test('the service worker never touches the transfer API or the review page', () => {
  const answers = serviceWorker();
  const app = 'https://www.ryanrwang.com/apps/kanjiru/';
  assert.equal(answers(`${app}api/transfer.php`), false);
  assert.equal(answers(`${app}api/transfer.php`, 'POST'), false);
  assert.equal(answers(`${app}api/transfer.php?code=ABC234`), false);
  assert.equal(answers(`${app}review/`), false);
  assert.equal(answers(`${app}review/review.php`), false);
  // The game's own files are network first.
  ['', 'app.js', 'js/store.js', 'data/game/answers.json', 'styles.css', 'manifest.webmanifest']
    .forEach((path) => assert.equal(answers(app + path), true, path));
  assert.equal(answers('https://fonts.gstatic.com/s/notosansjp/v57/x.woff2'), true);
  assert.equal(answers('https://example.com/other.js'), false);
});

test('the service worker works from a worktree folder too', () => {
  const answers = serviceWorker('http://localhost:8098/.claude/worktrees/x/apps/kanjiru/sw.js');
  assert.equal(answers('http://localhost:8098/.claude/worktrees/x/apps/kanjiru/api/transfer.php'), false);
  assert.equal(answers('http://localhost:8098/.claude/worktrees/x/apps/kanjiru/app.js'), true);
});
