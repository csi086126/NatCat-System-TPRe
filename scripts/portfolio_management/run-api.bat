@echo off
chcp 65001 >nul

echo ========================================
echo Starting Portfolio Management API Server
echo ========================================
echo.
echo API will be available at:
echo   http://localhost:8000
echo.
echo API Documentation:
echo   http://localhost:8000/docs
echo.

cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"

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
echo Starting FastAPI server with auto-reload...
echo Press Ctrl+C to stop the server
echo.

cd api
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
