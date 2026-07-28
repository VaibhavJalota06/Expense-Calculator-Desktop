@echo off
title Expense OS - Automatic Code Sync and Executable Builder
cd /d "%~dp0"
set PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%

echo ========================================================
echo   Expense OS - Automatic Code Sync and Executable Builder
echo ========================================================
echo.

echo [1/3] Staging and Committing Local Code Changes...
"C:\Program Files\Git\cmd\git.exe" config --global --add safe.directory "%~dp0" >nul 2>&1
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Auto-update Expense OS code and desktop build"

echo.
echo [2/3] Syncing Code to GitHub Repository...
"C:\Program Files\Git\cmd\git.exe" push origin master
"C:\Program Files\Git\cmd\git.exe" push origin master:main -f

echo.
echo [3/3] Compiling Updated Windows Desktop .exe App...
set CSC_IDENTITY_AUTO_DISCOVERY=false
"C:\Program Files\nodejs\npm.cmd" run dist

echo.
echo ========================================================
echo   SUCCESS! GitHub repository & .exe app are updated!
echo ========================================================
echo.
