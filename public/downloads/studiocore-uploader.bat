@echo off
title StudioCore Desktop Uploader (Pixieset-Style High Speed)
echo ================================================================
echo    StudioCore Desktop Uploader for Windows
echo    High-Speed Bulk Wedding Photo Sync (25MB+ RAW/JPEGs)
echo ================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required to run the Desktop Uploader.
    echo Please install Node.js from https://nodejs.org or run directly in browser.
    pause
    exit /b 1
)

node "%~dp0studiocore-uploader.js" %*
pause
