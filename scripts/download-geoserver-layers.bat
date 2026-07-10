@echo off
REM GeoServer Layer Download Script
REM Downloads all available COP layers from remote GeoServer

echo ======================================================================
echo GEOSERVER LAYER DOWNLOAD
echo ======================================================================
echo.
echo Remote GeoServer: http://143.89.22.7:8090/geoserver
echo Output Directory: scripts\downloaded_layers
echo.

REM Create output directory
if not exist "scripts\downloaded_layers" mkdir "scripts\downloaded_layers"

echo ======================================================================
echo STEP 1: Downloading Vector Layers (GeoJSON)
echo ======================================================================
echo.

echo [1/5] Downloading COP:Building (vector)...
curl -o "scripts\downloaded_layers\COP_Building.geojson" "http://143.89.22.7:8090/geoserver/COP/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=COP:Building&outputFormat=application/json"
if %errorlevel% == 0 (
    echo     Success! Saved to COP_Building.geojson
) else (
    echo     Failed to download!
)
echo.

echo [2/5] Downloading COP:taiping_boundary (vector)...
curl -o "scripts\downloaded_layers\COP_taiping_boundary.geojson" "http://143.89.22.7:8090/geoserver/COP/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=COP:taiping_boundary&outputFormat=application/json"
if %errorlevel% == 0 (
    echo     Success! Saved to COP_taiping_boundary.geojson
) else (
    echo     Failed to download!
)
echo.

echo ======================================================================
echo STEP 2: Downloading Raster Layers (GeoTIFF)
echo ======================================================================
echo.

echo [3/5] Downloading COP:ENTLI (raster)...
curl -o "scripts\downloaded_layers\COP_ENTLI.tif" "http://143.89.22.7:8090/geoserver/COP/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=COP:ENTLI&format=image/tiff"
if %errorlevel% == 0 (
    echo     Success! Saved to COP_ENTLI.tif
) else (
    echo     Failed to download!
)
echo.

echo [4/5] Downloading COP:taiping_Annual_rainfall (raster)...
curl -o "scripts\downloaded_layers\COP_taiping_Annual_rainfall.tif" "http://143.89.22.7:8090/geoserver/COP/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=COP:taiping_Annual_rainfall&format=image/tiff"
if %errorlevel% == 0 (
    echo     Success! Saved to COP_taiping_Annual_rainfall.tif
) else (
    echo     Failed to download!
)
echo.

echo [5/5] Downloading COP:hkSAR (raster)...
curl -o "scripts\downloaded_layers\COP_hkSAR.tif" "http://143.89.22.7:8090/geoserver/COP/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=COP:hkSAR&format=image/tiff"
if %errorlevel% == 0 (
    echo     Success! Saved to COP_hkSAR.tif
) else (
    echo     Failed to download!
)
echo.

echo ======================================================================
echo DOWNLOAD COMPLETE
echo ======================================================================
echo.
echo Files saved to: scripts\downloaded_layers\
echo.
dir "scripts\downloaded_layers" /B
echo.
echo ======================================================================
echo NEXT STEPS:
echo ======================================================================
echo.
echo 1. Open http://localhost:8080/geoserver/web/ in your browser
echo 2. Login with admin credentials (default: admin/geoserver)
echo 3. For each downloaded file, follow these steps:
echo.
echo    FOR VECTOR FILES (.geojson):
echo    - Go to: Stores -^> Add new Store -^> GeoJSON
echo    - Workspace: COP
echo    - Data Source Name: [layer name without COP_ prefix]
echo    - URL: Browse and select the .geojson file
echo    - Click Save, then Publish
echo    - Set layer name, compute bounds, Save
echo.
echo    FOR RASTER FILES (.tif):
echo    - Go to: Stores -^> Add new Store -^> GeoTIFF
echo    - Workspace: COP
echo    - Data Source Name: [layer name without COP_ prefix]
echo    - URL: file:scripts/downloaded_layers/[filename].tif
echo    - Click Save, then Publish
echo    - Set layer name, compute bounds, Save
echo.
echo 4. After all layers are uploaded, update .env.local:
echo    NEXT_PUBLIC_GEOSERVER_WMS_URL=http://localhost:8080/geoserver/wms
echo    NEXT_PUBLIC_GEOSERVER_GEOSPATIAL_URL=http://localhost:8080/geoserver/wms
echo.
echo 5. Restart your Next.js development server
echo.
echo ======================================================================
pause
