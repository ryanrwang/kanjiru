<?php
/*
 * Dev-only: loads and saves the word review in ../data/review.json.
 *
 * Runs only under PHP's built-in server (php -S), never on the live site,
 * and deploy.yml leaves the whole review/ folder out as well.
 *
 * GET  → the saved review (or an empty one)
 * POST → { decisions: { word: "keep"|"cut"|"maybe" }, parts: { kanji: "flag" } }
 */
if (PHP_SAPI !== 'cli-server') {
    http_response_code(404);
    exit;
}

$file = __DIR__ . '/../data/review.json';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo is_file($file) ? file_get_contents($file) : '{"decisions":{},"parts":{}}';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo '{"error":"GET or POST only"}';
    exit;
}

$body = file_get_contents('php://input');
if (strlen($body) > 5000000) {
    http_response_code(413);
    echo '{"error":"Too big"}';
    exit;
}

$data = json_decode($body, true);
if (!is_array($data) || !isset($data['decisions']) || !is_array($data['decisions'])) {
    http_response_code(400);
    echo '{"error":"Expected { decisions: {...} }"}';
    exit;
}

// Keep only known values, so a bad request can't write junk.
$allowed = ['keep', 'cut', 'maybe'];
$out = ['updated' => gmdate('c'), 'decisions' => [], 'parts' => []];

foreach ($data['decisions'] as $word => $decision) {
    $word = (string) $word;
    if ($word !== '' && strlen($word) <= 64 && in_array($decision, $allowed, true)) {
        $out['decisions'][$word] = $decision;
    }
}
foreach (($data['parts'] ?? []) as $kanji => $flag) {
    $kanji = (string) $kanji;
    if (preg_match('/^.$/u', $kanji) && $flag === 'flag') {
        $out['parts'][$kanji] = 'flag';
    }
}

// Sorted, one entry per line: small, readable Git diffs.
ksort($out['decisions'], SORT_STRING);
ksort($out['parts'], SORT_STRING);
if (!$out['parts']) {
    $out['parts'] = new stdClass();
}
if (!$out['decisions']) {
    $out['decisions'] = new stdClass();
}

$json = json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
$tmp = $file . '.tmp';
if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $file)) {
    http_response_code(500);
    echo '{"error":"Could not write data/review.json"}';
    exit;
}

echo json_encode(['ok' => true, 'count' => count((array) $out['decisions'])]);
