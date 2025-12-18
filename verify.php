<?php
require_once 'config.php';
require_once 'jsonbin.php';
require_once 'mailer.php';

// Get reference from Paystack redirect
$reference = $_GET['reference'] ?? '';

if (!$reference) {
    die("No payment reference provided.");
}

// Verify with Paystack
$ch = curl_init("https://api.paystack.co/transaction/verify/$reference");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . PAYSTACK_SECRET_KEY
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$paystackResponse = json_decode($response, true);

if ($paystackResponse['status'] === true && $paystackResponse['data']['status'] === 'success') {

    // Collect data from GET
    $name = $_GET['name'] ?? 'Anonymous';
    $email = $_GET['email'] ?? '';
    $phone = $_GET['phone'] ?? '';
    $amount = $_GET['amount'] ?? 0;
    $type = $_GET['type'] ?? '';
    $frequency = $_GET['frequency'] ?? 'once';
    $prayer = $_GET['prayer'] ?? '';
    $anonymous = $_GET['anonymous'] ?? 'false';
    $date = date('Y-m-d H:i:s');

    // Prepare record
    $record = [
        'reference' => $reference,
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'amount' => (int)$amount,
        'type' => $type,
        'recurring' => $frequency === 'monthly' ? true : false,
        'project' => '', // optional
        'status' => 'success',
        'prayer' => $prayer,
        'anonymous' => $anonymous === 'true' ? true : false,
        'date' => $date
    ];

    // Save to JSONBin
    saveGivingRecord($record);

    // Send Email & WhatsApp receipt
    sendReceipt($record);

    // Redirect to thank you page
    header("Location: thank-you.html");
    exit;

} else {
    die("Payment verification failed. Please contact support.");
}
