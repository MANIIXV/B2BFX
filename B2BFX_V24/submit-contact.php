<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, 'Method not allowed.', 405);
}
if (!app_origin_ok()) {
    json_response(false, 'Invalid origin.', 403);
}

if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_POST_BYTES) {
    json_response(false, 'Request is too large.', 413);
}

/* Honeypot */
if (clean_text($_POST['website'] ?? '', 200) !== '') {
    json_response(true, 'Thanks. Your enquiry has been received.');
}

$name    = clean_text($_POST['name'] ?? '', 120);
$brand   = clean_text($_POST['brand'] ?? '', 160);
$email   = clean_email($_POST['email'] ?? '');
$phone   = clean_text($_POST['phone'] ?? '', 60);
$service = clean_text($_POST['service'] ?? '', 120);
$budget  = clean_text($_POST['budget'] ?? '', 80);
$message = clean_text($_POST['message'] ?? '', 5000);

if ($name === '' || $brand === '' || $email === '') {
    json_response(false, 'Please complete the required fields.', 422);
}
if (!filter_var(CONTACT_TO_EMAIL, FILTER_VALIDATE_EMAIL)) {
    json_response(false, 'Contact email is not configured yet.', 500);
}

$subject = 'B2BFX Project Enquiry — ' . $brand;
$body = "New B2BFX Project Enquiry\n\n"
      . "Name: {$name}\n"
      . "Brand / Business: {$brand}\n"
      . "Email: {$email}\n"
      . "Phone: {$phone}\n"
      . "Service: {$service}\n"
      . "Budget: {$budget}\n\n"
      . "Project Brief:\n{$message}\n";

$headers = [
    'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
];

$sent = @mail(CONTACT_TO_EMAIL, $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    json_response(false, 'Your message could not be sent right now. Please email us directly.', 500);
}

json_response(true, 'Thanks — your project enquiry has been sent.');
?>
