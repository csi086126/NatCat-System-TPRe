# Add Windows Firewall Rule for GeoServer Port 8080
# Run this script as Administrator

Write-Host "Adding firewall rule for GeoServer port 8080..." -ForegroundColor Yellow

try {
    # Add firewall rule to allow TCP port 8080 inbound
    netsh advfirewall firewall add rule name="GeoServer Port 8080" dir=in action=allow protocol=TCP localport=8080

    Write-Host "`nFirewall rule added successfully!" -ForegroundColor Green
    Write-Host "`nVerifying the rule..." -ForegroundColor Cyan

    # Show the rule details
    netsh advfirewall firewall show rule name="GeoServer Port 8080"

    Write-Host "`nGeoServer should now be accessible from other computers at:" -ForegroundColor Green
    Write-Host "http://10.253.22.15:8080/geoserver/web/" -ForegroundColor Cyan

} catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    Write-Host "Please make sure you run this script as Administrator!" -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
