@echo off
chcp 65001 >nul

echo ========================================
echo TPHK 理赔数据 Geocoding
echo ========================================
echo.
echo 数据文件: 2412 巨災統計-理赔信息 (香港地區).xlsx
echo 输出文件: tphk-claims-geocoded.json
echo.
echo 特性:
echo  - 复用承保数据的geocoding缓存
echo  - 保留所有原始字段
echo  - 自动识别地址字段
echo  - 每100条保存检查点
echo.
echo Press Ctrl+C to cancel...
timeout /t 3
echo.

REM Find Anaconda
set ANACONDA_FOUND=0

if exist "%USERPROFILE%\AppData\Local\anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=%USERPROFILE%\AppData\Local\anaconda3
    set ANACONDA_FOUND=1
)
if exist "%USERPROFILE%\anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=%USERPROFILE%\anaconda3
    set ANACONDA_FOUND=1
)
if exist "%USERPROFILE%\Anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=%USERPROFILE%\Anaconda3
    set ANACONDA_FOUND=1
)
if exist "C:\ProgramData\Anaconda3\Scripts\activate.bat" (
    set ANACONDA_PATH=C:\ProgramData\Anaconda3
    set ANACONDA_FOUND=1
)

if %ANACONDA_FOUND%==0 (
    echo [ERROR] Anaconda not found!
    pause
    exit /b 1
)

echo Activating Anaconda...
call "%ANACONDA_PATH%\Scripts\activate.bat" base

cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"

echo.
echo Starting geocoding...
echo.

python data_processing\geocode_claims.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Geocoding failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Geocoding Completed!
echo ========================================
echo.
echo Output: output\tphk-claims-geocoded.json
echo Log: geocode_claims.log
echo Failures: claims_geocoding_failures.log
echo.
pause
