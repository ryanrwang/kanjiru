/*
 * The ledger: every change to points and hints held, as an entry with its
 * own id (docs/DESIGN.md, "The ledger").
 *
 *   ledger   { [id]: { why, at, pts?, hints?, game?, what? } }
 *     why    start        the starting points of a new save
 *            v1           the points and hints a save had before the ledger
 *            game         what a finished game paid
 *            streak       a streak reward (what: its length in days)
 *            achievement  an achievement's reward (what: its id)
 *            drop         a bonus hint after a win
 *            buy          a purchase (what: the power id, or "slot/skin")
 *            use          a hint used in a game
 *     at     'YYYY-MM-DD'
 *     pts    points gained (below 0: spent)
 *     hints  { [powerId]: count gained (below 0: used) }
 *     game   the game it came from, "modeId/historyKey"
 *
 * Points and hints held are summed from the entries, never stored. Two
 * devices' ledgers merge by joining their entries, so what each earned and
 * spent adds up, and merging the same save twice changes nothing.
 *
 * Pure: no storage and no page, so node --test runs it.
 */

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const pad = (n) => String(n).padStart(2, '0');

// Today's local date as 'YYYY-MM-DD'.
export function today(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// A random id, unique enough that two devices never make the same one.
export function newId() {
  const bytes = new Uint8Array(10);
  const c = globalThis.crypto;
  if (c && c.getRandomValues) c.getRandomValues(bytes);
  else bytes.forEach((b, i) => { bytes[i] = Math.floor(Math.random() * 256); });
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

// Adds an entry to a ledger and returns it, with its id. Empty fields (no
// points, no hints) are left out.
export function add(ledger, why, { pts = 0, hints = null, game = null, what = null, at = today() } = {}) {
  const entry = { why, at };
  if (pts) entry.pts = pts;
  const counts = Object.fromEntries(Object.entries(hints || {}).filter(([, n]) => n));
  if (Object.keys(counts).length) entry.hints = counts;
  if (game) entry.game = game;
  if (what !== null && what !== undefined) entry.what = String(what);
  const id = newId();
  ledger[id] = entry;
  return { id, ...entry };
}

const entries = (ledger) => (isObject(ledger) ? Object.values(ledger).filter(isObject) : []);

// The sum of every entry: { points, hints: { [powerId]: n } }. Neither goes
// below 0: a merge can join spends made on both devices from the same points.
export function balance(ledger) {
  let points = 0;
  const hints = {};
  entries(ledger).forEach((e) => {
    points += Number(e.pts) || 0;
    Object.entries(isObject(e.hints) ? e.hints : {}).forEach(([id, n]) => {
      hints[id] = (hints[id] || 0) + (Number(n) || 0);
    });
  });
  Object.keys(hints).forEach((id) => { if (hints[id] <= 0) delete hints[id]; });
  return { points: Math.max(0, points), hints };
}

// What a game paid besides its own points: rewards and drops.
export function rewardsOf(ledger, game) {
  return entries(ledger).filter((e) => e.game === game && e.why !== 'game');
}

// Anything but the starting points (a new save has only those).
export function hasProgress(ledger) {
  return entries(ledger).some((e) => e.why !== 'start');
}

// A v1 save's wallet and hints as one entry. Its id is the same on every
// device, so two devices that both had one keep one: the higher, as v1's
// merge did.
export const V1_ID = 'v1';
export function fromV1(wallet, inventory, at = today()) {
  const hints = Object.fromEntries(Object.entries(isObject(inventory) ? inventory : {})
    .filter(([, n]) => Number(n) > 0).map(([id, n]) => [id, Math.floor(Number(n))]));
  const entry = { why: 'v1', at, pts: Math.max(0, Math.floor(Number(wallet && wallet.points) || 0)) };
  if (Object.keys(hints).length) entry.hints = hints;
  return { [V1_ID]: entry };
}

const size = (e) => (Number(e.pts) || 0)
  + Object.values(isObject(e.hints) ? e.hints : {}).reduce((a, n) => a + (Number(n) || 0), 0);

// Both devices' entries. The same id on both is the same entry (v1's keeps
// the higher). A save with only its starting points adds nothing, so
// merging in a brand-new device can't add points.
export function mergeLedgers(mine = {}, theirs = {}) {
  const out = {};
  const neither = !hasProgress(mine) && !hasProgress(theirs);
  [mine, theirs].forEach((ledger) => {
    if (!isObject(ledger) || !(neither || hasProgress(ledger))) return;
    Object.entries(ledger).forEach(([id, e]) => {
      if (!isObject(e)) return;
      if (!(id in out) || size(e) > size(out[id])) out[id] = e;
    });
  });
  return out;
}
