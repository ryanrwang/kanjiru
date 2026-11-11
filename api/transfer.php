<?php
/*
 * Kanjiru device transfer: moves a save to another device with a one-time code.
 *
 *   POST transfer.php?action=send      body: the save text (JSON)
 *        200 {"code":"K7M2XP","expiresIn":900}
 *
 *   POST transfer.php?action=receive   body: {"code":"K7M2XP"}
 *        200 {"save":"<the save text>"}
 *
 * Every error is JSON too, {"error":"<id>"} with an HTTP status. The ids are
 * the keys of transfer.errors in js/i18n/*.js, so the player sees them in
 * their language:
 *   method 405, bad-request 400, too-large 413, bad-save 400, bad-code 400,
 *   not-found 404, expired 410, rate-limited 429, server 500
 *
 * Storage: codes/ next to this file. The web can't read it (a deny-all
 * .htaccess this script writes into it, plus the rule in api/.htaccess),
 * Git ignores it and the deploy skips it. Files are named by a hash of the
 * code, so a listing doesn't show codes at a glance; it's the folder being
 * private that keeps them safe, since a 6-character code's hash can be
 * found by trying them all. A code lasts CODE_SECONDS and is deleted the
 * first time it's read; once it has expired its save is emptied, and the
 * empty file stays a while to say "expired".
 *
 * Limits: each address gets RATE_LIMITS requests per RATE_WINDOW (an IPv6
 * /64, one home or phone, counts as one address), and the folder holds at
 * most STORE_BYTES of saves, so it can't be used to fill the disk. Only
 * this site's own pages may call it (sameSite()).
 *
 * Written for PHP 7.4 and up (the site runs PHP 8.2), core functions only.
 */

declare(strict_types=1);

// ── Settings ─────────────────────────────────────────────────────────

const CODE_LENGTH   = 6;
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // no 0/O, 1/I/L
const CODE_SECONDS  = 900;        // 15 minutes
const MAX_BYTES     = 1048576;    // 1 MB: years of daily games
const RATE_WINDOW   = 900;        // seconds
const RATE_LIMITS   = ['send' => 10, 'receive' => 20];   // per IP per window
const SWEEP_AFTER   = 3600;       // expired codes stay this long, to say "expired"
const STORE_BYTES   = 52428800;   // 50 MB of live saves at most; past it, send waits

define('STORE', __DIR__ . '/codes');

// ── Replies ──────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function reply(int $status, array $body): void
{
    $json = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        $status = 500;
        $json = '{"error":"server"}';
    }
    http_response_code($status);
    echo $json;
    exit;
}

function fail(int $status, string $error): void
{
    reply($status, ['error' => $error]);
}

// ── Storage ──────────────────────────────────────────────────────────

const DENY_ALL = <<<'HTACCESS'
# Written by transfer.php: the web must never read this folder.
<IfModule mod_authz_core.c>
    Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
</IfModule>

HTACCESS;

function prepareStore(): void
{
    foreach ([STORE, STORE . '/rate'] as $dir) {
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
            fail(500, 'server');
        }
    }
    if (!is_file(STORE . '/.htaccess') && @file_put_contents(STORE . '/.htaccess', DENY_ALL) === false) {
        fail(500, 'server');
    }
    if (!is_file(STORE . '/index.html')) {
        @file_put_contents(STORE . '/index.html', '');
    }
}

function codePath(string $code): string
{
    return STORE . '/' . hash('sha256', $code) . '.json';
}

// Drops codes long past their expiry, half-read leftovers and old rate counts,
// and empties the saves of codes that have expired: the empty file still
// says "expired" (its time is kept), but no longer takes room.
function sweep(): void
{
    $now = time();
    foreach (glob(STORE . '/*.json') ?: [] as $file) {
        $time = @filemtime($file);
        if ($time !== false && $time < $now - CODE_SECONDS && @filesize($file) > 0) {
            @file_put_contents($file, '');
            @touch($file, $time);
        }
    }
    $old = function (string $pattern, int $age) use ($now): void {
        foreach (glob($pattern) ?: [] as $file) {
            $time = @filemtime($file);
            if ($time !== false && $time < $now - $age) {
                @unlink($file);
            }
        }
    };
    $old(STORE . '/*.json', SWEEP_AFTER);
    $old(STORE . '/*.taking', 60);
    $old(STORE . '/rate/*.json', RATE_WINDOW);
}

// ── Rate limit ───────────────────────────────────────────────────────

// The address requests are counted by. One home or phone on IPv6 has a
// whole /64 to itself (2^64 addresses), so counting each address alone
// would be no limit at all: the first 64 bits count as one. IPv4, and IPv4
// written as IPv6 (::ffff:1.2.3.4), count whole.
function clientKey(): string
{
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
    $packed = @inet_pton($ip);
    if ($packed === false || strlen($packed) !== 16) {
        return $ip;
    }
    if (substr($packed, 0, 12) === str_repeat("\0", 10) . "\xff\xff") {
        return (string) inet_ntop(substr($packed, 12));
    }
    return bin2hex(substr($packed, 0, 8)) . '/64';
}

// Counts this address's requests per action in a sliding window. Receive
// attempts are limited too, so codes can't be guessed. The address is
// stored hashed.
function rateLimit(string $action): void
{
    $file = STORE . '/rate/' . hash('sha256', $action . '|' . clientKey()) . '.json';
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return;   // can't count: let it through rather than block everyone
    }
    flock($handle, LOCK_EX);
    $now = time();
    $times = json_decode((string) stream_get_contents($handle), true);
    $times = array_values(array_filter(is_array($times) ? $times : [], function ($time) use ($now) {
        return is_int($time) && $time > $now - RATE_WINDOW;
    }));
    $limited = count($times) >= RATE_LIMITS[$action];
    if (!$limited) {
        $times[] = $now;
    }
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, (string) json_encode($times));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    if ($limited) {
        header('Retry-After: ' . RATE_WINDOW);
        fail(429, 'rate-limited');
    }
}

// ── Actions ──────────────────────────────────────────────────────────

function readBody(int $limit): string
{
    $length = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
    if ($length > $limit) {
        fail(413, 'too-large');
    }
    $body = file_get_contents('php://input', false, null, 0, $limit + 1);
    if ($body === false) {
        fail(400, 'bad-request');
    }
    if (strlen($body) > $limit) {
        fail(413, 'too-large');
    }
    return $body;
}

function newCode(): string
{
    $alphabet = CODE_ALPHABET;
    $last = strlen($alphabet) - 1;
    $code = '';
    for ($i = 0; $i < CODE_LENGTH; $i++) {
        $code .= $alphabet[random_int(0, $last)];
    }
    return $code;
}

// The bytes of saves waiting to be received.
function storeBytes(): int
{
    $bytes = 0;
    foreach (glob(STORE . '/*.json') ?: [] as $file) {
        $bytes += (int) @filesize($file);
    }
    return $bytes;
}

// A save, as far as the server can tell: a JSON object with a whole version
// number, whose main parts are objects when it has them (js/store.js
// readSave() checks it in full on the device that receives it).
function looksLikeSave($save): bool
{
    if (!is_array($save) || !isset($save['v']) || !is_int($save['v']) || $save['v'] < 1) {
        return false;
    }
    foreach (['settings', 'ledger', 'history'] as $key) {
        if (isset($save[$key]) && !is_array($save[$key])) {
            return false;
        }
    }
    return true;
}

function send(): void
{
    $text = readBody(MAX_BYTES);
    if (!looksLikeSave(json_decode($text, true))) {
        fail(400, 'bad-save');
    }
    // Full: nothing more until codes expire and sweep() empties them.
    if (storeBytes() + strlen($text) > STORE_BYTES) {
        header('Retry-After: ' . CODE_SECONDS);
        fail(503, 'server');
    }
    // 'x' creates the file only if no live code has this name already.
    for ($try = 0; $try < 5; $try++) {
        $code = newCode();
        $handle = @fopen(codePath($code), 'x');
        if ($handle === false) {
            continue;
        }
        $written = fwrite($handle, $text);
        fclose($handle);
        if ($written !== strlen($text)) {
            @unlink(codePath($code));
            fail(500, 'server');
        }
        reply(200, ['code' => $code, 'expiresIn' => CODE_SECONDS]);
    }
    fail(500, 'server');
}

function receive(): void
{
    $body = json_decode(readBody(1024), true);
    $code = is_array($body) && isset($body['code']) && is_string($body['code']) ? $body['code'] : '';
    $code = strtoupper(str_replace([' ', '-'], '', $code));
    if (strlen($code) !== CODE_LENGTH || strspn($code, CODE_ALPHABET) !== CODE_LENGTH) {
        fail(400, 'bad-code');
    }
    // Renaming claims the code: if two devices try at once, only one wins.
    $path = codePath($code);
    $taken = $path . '.' . bin2hex(random_bytes(6)) . '.taking';
    if (!is_file($path) || !@rename($path, $taken)) {
        fail(404, 'not-found');
    }
    $time = @filemtime($taken);
    $save = @file_get_contents($taken);
    @unlink($taken);
    // Expired, or emptied by sweep() once it had.
    if (($time !== false && $time < time() - CODE_SECONDS) || $save === '') {
        fail(410, 'expired');
    }
    if ($save === false) {
        fail(500, 'server');
    }
    reply(200, ['save' => $save]);
}

// ── Start ────────────────────────────────────────────────────────────

// Whether the request comes from this site's own pages. Another site's page
// can make a visitor's browser post here (it can't read the reply), which
// would spend that visitor's tries, and with enough visitors guess at codes
// from many addresses at once. Browsers say where a request comes from:
// Sec-Fetch-Site on https, and Origin on any cross-site POST. A request
// with neither (an old browser, a script) is let through, to the limits.
function sameSite(): bool
{
    $site = isset($_SERVER['HTTP_SEC_FETCH_SITE']) ? strtolower((string) $_SERVER['HTTP_SEC_FETCH_SITE']) : '';
    if ($site !== '') {
        return $site === 'same-origin' || $site === 'none';
    }
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? (string) $_SERVER['HTTP_ORIGIN'] : '';
    $host = isset($_SERVER['HTTP_HOST']) ? strtolower((string) $_SERVER['HTTP_HOST']) : '';
    if ($origin === '' || $host === '') {
        return true;
    }
    $parts = parse_url($origin);
    if (!is_array($parts) || !isset($parts['host'])) {
        return false;   // "null", or not an origin at all
    }
    $from = strtolower($parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
    return $from === $host;
}

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    fail(405, 'method');
}

if (!sameSite()) {
    fail(403, 'bad-request');
}

$action = isset($_GET['action']) ? (string) $_GET['action'] : '';
if (!array_key_exists($action, RATE_LIMITS)) {
    fail(400, 'bad-request');
}

prepareStore();
sweep();
rateLimit($action);

if ($action === 'send') {
    send();
} else {
    receive();
}
