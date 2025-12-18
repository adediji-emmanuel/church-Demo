<?php
require('fpdf/fpdf.php');

function generateReceiptPDF($record) {
    $pdf = new FPDF();
    $pdf->AddPage();
    $pdf->SetFont('Arial','B',16);

    $pdf->Cell(0,10,'Rivers of Love Christian Centre',0,1,'C');
    $pdf->Ln(10);

    $pdf->SetFont('Arial','',12);
    $pdf->Cell(0,8,"Thank you for your giving!",0,1);
    $pdf->Cell(0,8,"Name: " . $record['name'],0,1);
    $pdf->Cell(0,8,"Amount: ₦" . number_format($record['amount']),0,1);
    $pdf->Cell(0,8,"Type: " . $record['type'],0,1);
    $pdf->Cell(0,8,"Reference: " . $record['reference'],0,1);
    $pdf->Cell(0,8,"Date: " . $record['date'],0,1);

    $filename = "receipt_" . $record['reference'] . ".pdf";
    $pdf->Output('D', $filename); // download PDF
}
