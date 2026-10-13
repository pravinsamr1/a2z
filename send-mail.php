<?php
/**
 * Enquiry form handler for A2Z Daily Cleaning Service.
 * Sends form submissions to the business inbox.
 */

$to          = 'a2zdailycleaning@gmail.com';
$fromAddress = 'no-reply@a2zdailycleaning.com.au'; // use an address on your own domain
$siteName    = 'A2Z Daily Cleaning Service';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond($ok, $message, $code = 200)
{
    http_response_code($code);
    echo json_encode(array('ok' => $ok, 'message' => $message));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Method not allowed.', 405);
}

function field($key, $max = 500)
{
    $value = isset($_POST[$key]) ? trim((string) $_POST[$key]) : '';
    $value = str_replace(array("\r", "\0"), '', $value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return substr($value, 0, $max);
}

// Spam checks: hidden honeypot field and minimum time on page
if (field('website') !== '') {
    respond(true, 'Thank you! We will be in touch shortly.');
}
$started = (int) field('_ts', 20);
if ($started > 0 && (round(microtime(true) * 1000) - $started) < 3000) {
    respond(false, 'Please wait a moment and try again.', 429);
}

$name    = field('name', 120);
$email   = field('email', 160);
$phone   = field('phone', 40);
$service = field('service', 120);
$subject = field('subject', 160);
$message = field('message', 4000);
$form    = field('form', 80);

// keep header-bound values on a single line
foreach (array('name', 'email', 'phone', 'service', 'subject', 'form') as $k) {
    $$k = str_replace(array("\n", '<', '>'), ' ', $$k);
}

if ($name === '' || $email === '') {
    respond(false, 'Please enter your name and email address.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Please enter a valid email address.', 422);
}
if ($phone !== '' && !preg_match('/^[0-9()#&+*\-=. ]{6,40}$/', $phone)) {
    respond(false, 'Please enter a valid phone number.', 422);
}
if (preg_match('/(https?:\/\/.*){3,}/i', $message)) {
    respond(false, 'Your message contains too many links.', 422);
}

// Simple rate limit: one message per 20 seconds per visitor IP
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
$lock = sys_get_temp_dir() . '/a2z_form_' . md5($ip);
if (is_file($lock) && (time() - filemtime($lock)) < 20) {
    respond(false, 'You have just sent a message. Please wait a few seconds before trying again.', 429);
}
@touch($lock);

$lines = array(
    'New enquiry from the website',
    '----------------------------------------',
    'Name:     ' . $name,
    'Email:    ' . $email,
    'Phone:    ' . ($phone !== '' ? $phone : '-'),
);
if ($service !== '') { $lines[] = 'Service:  ' . $service; }
if ($subject !== '') { $lines[] = 'Subject:  ' . $subject; }
$lines[] = 'Form:     ' . ($form !== '' ? $form : '-');
$lines[] = 'Page:     ' . (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '-');
$lines[] = '';
$lines[] = 'Message:';
$lines[] = $message !== '' ? $message : '-';
$lines[] = '';
$lines[] = 'Sent ' . date('j M Y, g:i a') . ' from IP ' . $ip;

$mailSubject = 'Website enquiry' . ($service !== '' ? ' - ' . $service : '') . ' - ' . $name;
$mailSubject = '=?UTF-8?B?' . base64_encode($mailSubject) . '?=';

$headers  = 'From: ' . $siteName . ' <' . $fromAddress . ">\r\n";
$headers .= 'Reply-To: ' . $name . ' <' . $email . ">\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";

$sent = @mail($to, $mailSubject, implode("\n", $lines), $headers, '-f' . $fromAddress);

if ($sent) {
    respond(true, 'Thank you! Your enquiry has been sent. We will be in touch shortly.');
}
respond(false, 'Sorry, your message could not be sent. Please call us on 0431 563 884.', 500);
