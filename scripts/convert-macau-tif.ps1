# Batch script to convert Macau Grid TIF to WGS84 using QGIS GDAL

$gdalwarp = "C:\Program Files\QGIS 3.40.10\bin\gdalwarp.exe"
$baseDir = "D:\web-flood-insurance-model\Data\Typhoon_FloodResult_Macau"
$outputDir = "$baseDir\WGS84"

# Create output directory
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

# Macau Grid 1965 WKT
$macauGridWkt = @"
PROJCS["Observatorio_Meteorologico_1965_Macau_Grid",
    GEOGCS["GCS_Observatorio_Meteorologico_1965",
        DATUM["D_Observatorio_Meteorologico_1965",
            SPHEROID["International_1924",6378388.0,297.0]],
        PRIMEM["Greenwich",0.0],
        UNIT["Degree",0.0174532925199433]],
    PROJECTION["Transverse_Mercator"],
    PARAMETER["False_Easting",20000.0],
    PARAMETER["False_Northing",20000.0],
    PARAMETER["Central_Meridian",113.5364694444444],
    PARAMETER["Scale_Factor",1.0],
    PARAMETER["Latitude_Of_Origin",22.21239722222222],
    UNIT["Meter",1.0]]
"@

# Save temporary .prj file
$tempPrj = "$baseDir\temp_macau_grid.prj"
$macauGridWkt | Out-File -FilePath $tempPrj -Encoding ASCII

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "Converting Macau Grid 1965 to WGS84 (EPSG:4326)" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host ""

$files = @(
    'Hato_MacauPeninsula.tif',
    'Hato_Taipa.tif',
    'Mangkhut_MacauPeninsula.tif',
    'Mangkhut_Taipa.tif',
    'Ragasa_MacauPeninsula.tif',
    'Ragasa_Taipa.tif'
)

foreach ($file in $files) {
    $inputFile = "$baseDir\$file"
    $outputFile = "$outputDir\$file"
    
    if (-not (Test-Path $inputFile)) {
        Write-Host "[SKIP] File not found: $file" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Processing: $file" -ForegroundColor Cyan
    
    & $gdalwarp `
        -s_srs $tempPrj `
        -t_srs "EPSG:4326" `
        -r bilinear `
        -of GTiff `
        -co TILED=YES `
        -co COMPRESS=DEFLATE `
        $inputFile `
        $outputFile
    
    if ($LASTEXITCODE -eq 0) {
        $size = (Get-Item $outputFile).Length / 1MB
        Write-Host "  [OK] Converted! Size: $([math]::Round($size, 2)) MB" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "  [ERROR] Conversion failed!" -ForegroundColor Red
        Write-Host ""
    }
}

# Clean up
Remove-Item $tempPrj -Force

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "Done! Converted files are in: $outputDir" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
