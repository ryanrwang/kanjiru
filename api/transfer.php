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
 * code, so even a leaked file name isn't a working code. A code lasts
 * CODE_SECONDS and is deleted the first time it's read.
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

// Drops codes long past their expiry, half-read leftovers and old rate counts.
function sweep(): void
{
    $now = time();
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

// Counts this IP's requests per action in a sliding window. Receive attempts
// are limited too, so codes can't be guessed. The IP is stored hashed.
function rateLimit(string $action): void
{
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
    $file = STORE . '/rate/' . hash('sha256', $action . '|' . $ip) . '.json';
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

function send(): void
{
    $text = readBody(MAX_BYTES);
    $save = json_decode($text, true);
    if (!is_array($save) || !isset($save['v'])) {
        fail(400, 'bad-save');
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
    if ($time !== false && $time < time() - CODE_SECONDS) {
        fail(410, 'expired');
    }
    if ($save === false) {
        fail(500, 'server');
    }
    reply(200, ['save' => $save]);
}

// ── Start ────────────────────────────────────────────────────────────

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    fail(405, 'method');
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
