@echo off
echo =====================================
echo 运行 TPUSU 层级分割脚本
echo =====================================
echo.

cd /d "d:\Nat Cat Platform\UI_system"

echo 激活虚拟环境...
call C:\Users\sichen\AppData\Local\anaconda3\Scripts\activate.bat geo_env

echo.
echo 运行脚本...
python split-tpusu-by-hierarchy.py

echo.
pause
