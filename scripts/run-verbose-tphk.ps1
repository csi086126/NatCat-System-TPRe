Set-Location "D:\Nat Cat Platform\UI_system"
$output = & python scripts\verbose-tphk-check.py 2>&1
$output
$output | Out-File -Encoding utf8 verbose-tphk-output.txt
Write-Host "`nSaved to verbose-tphk-output.txt"
