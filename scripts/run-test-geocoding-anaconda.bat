@echo off
chcp 65001 >nul

echo ========================================
echo TPHK Geocoding - Sample Test
echo ========================================
echo.

cd /d "D:\Nat Cat Platform\UI_system\scripts"

echo Activating Anaconda environment...
call conda activate base 2>nul

if %ERRORLEVEL% NEQ 0 (
    if exist "%USERPROFILE%\anaconda3\Scripts\activate.bat" (
        call "%USERPROFILE%\anaconda3\Scripts\activate.bat" base
    ) else if exist "C:\ProgramData\Anaconda3\Scripts\activate.bat" (
        call "C:\ProgramData\Anaconda3\Scripts\activate.bat" base
    ) else if exist "%USERPROFILE%\Anaconda3\Scripts\activate.bat" (
        call "%USERPROFILE%\Anaconda3\Scripts\activate.bat" base
    )
)

echo [OK] Environment ready
echo.

REM Check and install required packages
echo Checking required packages...
python -c "import pandas" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing pandas...
    pip install pandas
)

python -c "import openpyxl" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing openpyxl...
    pip install openpyxl
)

echo.
echo Running sample geocoding test...
echo This will geocode 2-3 sample addresses from your TPHK data.
echo.
echo ========================================
echo.

python geocode-tphk-portfolio.py --test

echo.
echo ========================================
echo Test complete!
echo.
echo If successful, you can run the full geocoding with:
echo   run-full-geocoding-anaconda.bat
echo.
pause
