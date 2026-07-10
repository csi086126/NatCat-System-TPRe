@echo off
echo ========================================
echo TPHK Insurance Data Inspector
echo 太平香港保险数据检查
echo ========================================
echo.

python scripts\inspect-tphk-insurance-data.py > tphk-analysis-output.txt 2>&1

if %errorlevel% neq 0 (
    echo.
    echo ❌ Error occurred during analysis
    echo Check tphk-analysis-output.txt for details
) else (
    echo.
    echo ✅ Analysis completed successfully
    echo Results saved to:
    echo   - D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\tphk-data-analysis-result.json
    echo   - tphk-analysis-output.txt
)

echo.
type tphk-analysis-output.txt
echo.
pause
