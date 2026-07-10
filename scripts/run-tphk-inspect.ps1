# TPHK Insurance Data Analysis Script

Write-Host "TPHK Insurance Data Inspector" -ForegroundColor Cyan

Set-Location "D:\Nat Cat Platform\UI_system"

Write-Host "Running analysis script..." -ForegroundColor Yellow

$output = python scripts\inspect-tphk-insurance-data.py 2>&1
$output | ForEach-Object { Write-Host $_ }
$output | Out-File -FilePath "tphk-analysis-output.txt" -Encoding utf8

Write-Host ""
Write-Host "Analysis completed" -ForegroundColor Green

$jsonFile = "D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\tphk-data-analysis-result.json"
if (Test-Path $jsonFile) {
    Write-Host "JSON result: $jsonFile" -ForegroundColor Green
}
