@echo off
cd /d "D:\Nat Cat Platform\UI_system"
echo Running TPHK analysis...
python analyze-tphk.py
if %errorlevel% equ 0 (
    echo.
    echo Success! Check tphk-analysis-result.json
) else (
    echo.
    echo Error occurred
)
pause
