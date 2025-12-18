<?php
require_once 'config.php';

function sendReceipt($record) {
    $to = $record['email'];
    $subject = "Thank You for Your Giving — RLCC";
    
    $message = "
    <h2>Thank You 🙏</h2>
    <p>Dear " . htmlspecialchars($record['name']) . ",</p>
    <p>We have received your donation of ₦" . number_format($record['amount']) . " for <strong>" . htmlspecialchars($record['type']) . "</strong>.</p>
    <p>Reference: " . $record['reference'] . "<br>
       Date: " . $record['date'] . "</p>
    <p>God bless you!</p>
    ";
    
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: " . CHURCH_EMAIL . "\r\n";

    mail($to, $subject, $message, $headers);

    // WhatsApp link (optional)
    $whatsapp = "https://wa.me/234" . $record['phone'] . "?text=" . urlencode("Thank you for your donation of ₦" . number_format($record['amount']) . ". Reference: " . $record['reference']);
}
