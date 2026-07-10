# Quick TPHK Inspection PowerShell Script

Set-Location "D:\Nat Cat Platform\UI_system"

$outputFile = "tphk-quick-inspection-result.txt"

Write-Host "Running TPHK inspection..." -ForegroundColor Cyan

try {
    $result = & python scripts\quick-inspect-tphk.py 2>&1
    $result | Tee-Object -FilePath $outputFile
    Write-Host "`nResults saved to: $outputFile" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
