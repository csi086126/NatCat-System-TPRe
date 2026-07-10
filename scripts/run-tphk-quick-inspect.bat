@echo off
chcp 65001 > nul
echo Running TPHK data inspection...
echo.
python scripts\quick-inspect-tphk.py
echo.
echo.
pause
