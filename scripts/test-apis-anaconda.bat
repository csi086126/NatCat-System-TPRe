@echo off
chcp 65001 >nul

echo ========================================
echo Geocoding API Test Tool (Anaconda)
echo ========================================
echo.

cd /d "D:\Nat Cat Platform\UI_system\scripts"

echo Activating Anaconda environment...
echo.

REM Initialize conda for batch script
call conda activate base 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Trying alternative conda initialization...
    if exist "%USERPROFILE%\anaconda3\Scripts\activate.bat" (
        call "%USERPROFILE%\anaconda3\Scripts\activate.bat" base
    ) else if exist "C:\ProgramData\Anaconda3\Scripts\activate.bat" (
        call "C:\ProgramData\Anaconda3\Scripts\activate.bat" base
    ) else if exist "%USERPROFILE%\Anaconda3\Scripts\activate.bat" (
        call "%USERPROFILE%\Anaconda3\Scripts\activate.bat" base
    ) else (
        echo [ERROR] Cannot find Anaconda installation
        echo.
        echo Please open "Anaconda Prompt" and run:
        echo cd "D:\Nat Cat Platform\UI_system\scripts"
        echo python test-all-apis.py
        echo.
        pause
        exit /b 1
    )
)

echo [OK] Anaconda environment activated
echo.

REM Check if required packages are installed
echo Checking required packages...
python -c "import requests" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing requests...
    pip install requests
)

python -c "import dotenv" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing python-dotenv...
    pip install python-dotenv
)

echo.
echo Running API test...
echo.
echo ========================================
echo.

python test-all-apis.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo [ERROR] Test failed
    echo.
)

echo.
pause
