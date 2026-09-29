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
    json_response(true, 'Thanks. Your application has been received.');
}

$name      = clean_text($_POST['name'] ?? '', 120);
$email     = clean_email($_POST['email'] ?? '');
$phone     = clean_text($_POST['phone'] ?? '', 60);
$role      = clean_text($_POST['role'] ?? '', 120);
$portfolio = clean_text($_POST['portfolio'] ?? '', 500);
$message   = clean_text($_POST['message'] ?? '', 5000);

if ($name === '' || $email === '' || $role === '') {
    json_response(false, 'Please complete the required fields.', 422);
}
if (!filter_var(CAREER_TO_EMAIL, FILTER_VALIDATE_EMAIL)) {
    json_response(false, 'Careers email is not configured yet.', 500);
}

$attachmentPath = '';
$attachmentName = '';

if (isset($_FILES['resume']) && $_FILES['resume']['error'] !== UPLOAD_ERR_NO_FILE) {
    $file = $_FILES['resume'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        json_response(false, 'Resume upload failed. Please try again.', 422);
    }
    if ((int)$file['size'] > MAX_UPLOAD_BYTES) {
        json_response(false, 'Resume must be 5 MB or smaller.', 422);
    }

    $allowed = [
        'pdf'  => ['application/pdf'],
        'doc'  => ['application/msword', 'application/octet-stream'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
    ];
    $ext = strtolower(pathinfo((string)$file['name'], PATHINFO_EXTENSION));
    if (!isset($allowed[$ext])) {
        json_response(false, 'Please upload a PDF, DOC, or DOCX resume.', 422);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: 'application/octet-stream';
    if (!in_array($mime, $allowed[$ext], true)) {
        json_response(false, 'The uploaded resume file type is not allowed.', 422);
    }

    ensure_upload_dir();
    $safeBase = preg_replace('/[^a-zA-Z0-9_-]/', '-', pathinfo((string)$file['name'], PATHINFO_FILENAME)) ?: 'resume';
    $filename = date('Ymd-His') . '-' . bin2hex(random_bytes(5)) . '-' . $safeBase . '.' . $ext;
    $attachmentPath = UPLOAD_DIR . DIRECTORY_SEPARATOR . $filename;
    $attachmentName = $filename;

    if (!move_uploaded_file($file['tmp_name'], $attachmentPath)) {
        json_response(false, 'Could not save the resume. Please try again.', 500);
    }
}

/* Build a simple multipart email when a resume exists. */
$subject = 'B2BFX Career Application — ' . $name . ' — ' . $role;
$text = "New B2BFX Career Application\n\n"
      . "Name: {$name}\n"
      . "Email: {$email}\n"
      . "Phone: {$phone}\n"
      . "Role / Area: {$role}\n"
      . "Portfolio / LinkedIn: {$portfolio}\n\n"
      . "About the applicant:\n{$message}\n"
      . ($attachmentName ? "\nResume attached: {$attachmentName}\n" : "\nNo resume attached.\n");

$headers = [
    'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
];

if ($attachmentPath !== '') {
    $boundary = 'b2bfx_' . bin2hex(random_bytes(12));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

    $content  = "--{$boundary}\r\n";
    $content .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $content .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $content .= $text . "\r\n";

    $fileData = chunk_split(base64_encode((string)file_get_contents($attachmentPath)));
    $content .= "--{$boundary}\r\n";
    $content .= "Content-Type: application/octet-stream; name=\"{$attachmentName}\"\r\n";
    $content .= "Content-Disposition: attachment; filename=\"{$attachmentName}\"\r\n";
    $content .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $content .= $fileData . "\r\n";
    $content .= "--{$boundary}--\r\n";
    $body = $content;
} else {
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $body = $text;
}

$sent = @mail(CAREER_TO_EMAIL, $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    if ($attachmentPath && is_file($attachmentPath)) {
        @unlink($attachmentPath);
    }
    json_response(false, 'Your application could not be sent right now. Please email us directly.', 500);
}

if ($attachmentPath && is_file($attachmentPath)) {
    @unlink($attachmentPath);
}

json_response(true, 'Thanks — your application has been sent.');
?>
