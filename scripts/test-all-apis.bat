@echo off
chcp 65001 >nul

echo ========================================
echo Geocoding API Test Tool
echo ========================================
echo.

cd /d "D:\Nat Cat Platform\UI_system\scripts"

REM Try to find Python
echo Checking Python installation...
echo.

where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Found: python
    python --version
    echo.
    goto :run_test
)

where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Found: py launcher
    py --version
    echo.
    set PYTHON_CMD=py
    goto :run_test
)

REM Try common Python installation paths
if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe" (
    echo [OK] Found Python at: C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\
    set PYTHON_CMD="C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe"
    goto :run_test
)

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe" (
    echo [OK] Found Python at: C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\
    set PYTHON_CMD="C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe"
    goto :run_test
)

if exist "C:\Python312\python.exe" (
    echo [OK] Found Python at: C:\Python312\
    set PYTHON_CMD="C:\Python312\python.exe"
    goto :run_test
)

if exist "C:\Python311\python.exe" (
    echo [OK] Found Python at: C:\Python311\
    set PYTHON_CMD="C:\Python311\python.exe"
    goto :run_test
)

echo [ERROR] Python not found!
echo.
echo Please install Python from: https://www.python.org/downloads/
echo Or add Python to your PATH environment variable.
echo.
echo Common Python installation locations:
dir /b "C:\Users\%USERNAME%\AppData\Local\Programs\Python\" 2>nul
echo.
pause
exit /b 1

:run_test
if not defined PYTHON_CMD set PYTHON_CMD=python

echo Running API test...
echo.
echo ========================================
echo.

%PYTHON_CMD% test-all-apis.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo [ERROR] Test failed with error code: %ERRORLEVEL%
    echo.
    echo This might be due to missing Python libraries.
    echo.
    echo Please try installing dependencies:
    echo %PYTHON_CMD% -m pip install requests python-dotenv
    echo.
)

pause
