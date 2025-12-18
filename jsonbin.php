<?php
require_once 'config.php';

function getGivingRecords() {
    $url = "https://api.jsonbin.io/v3/b/6942c72f43b1c97be9f4b13d/latest" . JSONBIN_BIN_ID .;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-Master-Key: $2a$10$qtoZhFMZ4JANryBb2s7LpOrnC2KpW0MIGpSvWVJxp1t7ta94N9SSO" . JSONBIN_MASTER_KEY
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);
    return $data['record'] ?? [];
}

function saveGivingRecord($newRecord) {
    $records = getGivingRecords();
    $records[] = $newRecord;

    $url = "https://api.jsonbin.io/v3/b/6942c72f43b1c97be9f4b13d/latest" . JSONBIN_BIN_ID;
    $ch = curl_init($url);

    $payload = json_encode(['record' => $records]);

    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "X-Master-Key: $2a$10$qtoZhFMZ4JANryBb2s7LpOrnC2KpW0MIGpSvWVJxp1t7ta94N9SSO" . JSONBIN_MASTER_KEY,
        "X-Bin-Versioning: false"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}
