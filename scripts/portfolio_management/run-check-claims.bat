@echo off
chcp 65001 >nul

call "C:\Users\sichen\AppData\Local\anaconda3\Scripts\activate.bat" base
cd /d "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"
python check_claims_structure.py
pause
