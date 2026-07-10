@echo off
chcp 65001 >nul

echo ========================================
echo TPHK Data Structure Analysis
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

echo Running TPHK data analysis...
echo.

python analyze-tphk-data.py

echo.
pause
