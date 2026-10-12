@echo off
REM ============================================================
REM Nat Cat Platform Dev Launcher
REM Run this in cmd.exe, NOT in PowerShell.
REM Double-click works because Explorer uses cmd by default.
REM ============================================================

cd /d "%~dp0"

REM --- Locate Anaconda activate.bat ---
set "ACTIVATE="
if exist "C:\Users\sichen\AppData\Local\anaconda3\Scripts\activate.bat" set "ACTIVATE=C:\Users\sichen\AppData\Local\anaconda3\Scripts\activate.bat"
if exist "%USERPROFILE%\anaconda3\Scripts\activate.bat" set "ACTIVATE=%USERPROFILE%\anaconda3\Scripts\activate.bat"
if exist "%USERPROFILE%\AppData\Local\anaconda3\Scripts\activate.bat" set "ACTIVATE=%USERPROFILE%\AppData\Local\anaconda3\Scripts\activate.bat"
if exist "C:\ProgramData\Anaconda3\Scripts\activate.bat" set "ACTIVATE=C:\ProgramData\Anaconda3\Scripts\activate.bat"
if defined ACTIVATE goto :FOUND

echo.
echo ERROR: Cannot find Anaconda activate.bat
echo Please edit start.bat and set ACTIVATE to your Anaconda install path.
echo.
pause
exit /b 1

:FOUND

echo.
echo === Nat Cat Platform Dev Launcher ===
echo.

REM --- Step 1: Start FastAPI in a new window ---
echo [1/2] Starting FastAPI on port 8000...
start "NatCat-FastAPI" cmd /k scripts\start-api.bat

REM --- Step 2: Wait for FastAPI to come up (8 seconds) ---
echo      Waiting 8 seconds for FastAPI to boot...
ping -n 9 127.0.0.1 >nul

echo.
echo [2/2] Starting Next.js on port 3004...
echo      Open  http://localhost:3004/register  in your browser.
echo      Press Ctrl+C to stop Next.js.
echo      Close the NatCat-FastAPI window to stop FastAPI.
echo.

npm run dev