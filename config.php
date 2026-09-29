<?php
declare(strict_types=1);

/*
 * B2BFX FORM CONFIG
 * Update these values before going live.
 */
const CONTACT_TO_EMAIL = 'YOUR_CONTACT_EMAIL@example.com';
const CAREER_TO_EMAIL  = 'YOUR_CAREERS_EMAIL@example.com';

/*
 * Keep this as an address on your own domain when possible.
 * Example: hello@b2bfx.in
 */
const FROM_EMAIL = 'forms@b2bfx.in';
const FROM_NAME  = 'B2BFX Website';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_POST_BYTES   = 8 * 1024 * 1024; // keep multipart requests bounded
const UPLOAD_DIR = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';

function json_response(bool $ok, string $message, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => $ok,
        'message' => $message,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

function clean_text(?string $value, int $max = 2000): string {
    $value = trim((string)$value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
}

function clean_email(?string $value): string {
    $email = trim((string)$value);
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
}

function app_origin_ok(): bool {
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') return true;

    $originHost = parse_url($origin, PHP_URL_HOST);
    $originPort = parse_url($origin, PHP_URL_PORT);
    $requestHost = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
    if (!$originHost || !$requestHost) return false;

    // Compare host and, when explicitly supplied, port. This keeps local/staging hosts
    // testable while still rejecting cross-origin form posts in production.
    $requestName = $requestHost;
    $requestPort = null;
    if (str_contains($requestHost, ':') && !str_starts_with($requestHost, '[')) {
        [$requestName, $requestPort] = array_pad(explode(':', $requestHost, 2), 2, null);
    }
    if (strcasecmp($originHost, $requestName) !== 0) return false;

    if ($originPort !== null && $requestPort !== null && (int)$originPort !== (int)$requestPort) return false;
    return true;
}

function ensure_upload_dir(): void {
    if (!is_dir(UPLOAD_DIR)) {
        @mkdir(UPLOAD_DIR, 0750, true);
    }
}
?>
