/*
 * Talks to api/transfer.php: sends this device's save for a one-time code,
 * or fetches a save by its code.
 *
 * Every failure is thrown as an Error whose .code is a key of
 * transfer.errors in js/i18n/*.js: the server's own error ids, plus
 * 'offline' when it can't be reached and 'server' when the reply isn't JSON.
 */
const ENDPOINT = new URL('../api/transfer.php', import.meta.url);

function transferError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

async function call(action, body) {
  const url = new URL(ENDPOINT);
  url.searchParams.set('action', action);
  let response = null;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store'
    });
  } catch (e) {
    throw transferError('offline');
  }
  let data = null;
  try { data = await response.json(); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') throw transferError('server');
  if (!response.ok || data.error) throw transferError(String(data.error || 'server'));
  return data;
}

// The save text → { code, expiresIn } (seconds).
export async function sendSave(text) {
  const data = await call('send', text);
  return { code: String(data.code), expiresIn: Number(data.expiresIn) || 0 };
}

// A code → the save text it holds. The server deletes it on this first read.
export async function receiveSave(code) {
  const data = await call('receive', JSON.stringify({ code }));
  return String(data.save);
}

// What the player typed → just the letters and digits, upper case.
// NFKC turns full-width letters from a Japanese keyboard (ＡＢ２) into ASCII.
export function normalizeCode(text) {
  return String(text).normalize('NFKC').toUpperCase().replace(/[^0-9A-Z]/g, '');
}
