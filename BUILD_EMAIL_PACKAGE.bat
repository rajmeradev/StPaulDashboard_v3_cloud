@echo off
:: ============================================================
::  St. Paul Production Tool — Build Email Package
::  Creates a clean ZIP that can be attached to any email.
::  Run this once; send the resulting ZIP to anyone.
:: ============================================================

setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

set ZIP_NAME=StPaulProductionTool.zip
set ZIP_PATH=%SCRIPT_DIR%%ZIP_NAME%

echo.
echo ============================================================
echo   St. Paul Production Tool - Build Email Package
echo ============================================================
echo.

:: ── Delete old ZIP if it exists ──────────────────────────────
if exist "%ZIP_PATH%" (
    del /f /q "%ZIP_PATH%"
    echo [OK] Removed old %ZIP_NAME%
)

:: ── Write the README_START_HERE.txt ──────────────────────────
echo Writing setup instructions...

(
echo ============================================================
echo   St. Paul Production Tool - Quick Start
echo ============================================================
echo.
echo WINDOWS:
echo   1. Unzip this file to any folder ^(e.g. your Desktop^)
echo   2. Double-click  START.bat
echo   3. If Windows asks "Run anyway?" - click Yes
echo   4. The dashboard opens automatically at http://localhost:8000
echo   5. Python installs itself the first time ^(takes ~2 min^)
echo.
echo MAC:
echo   1. Unzip this file to any folder
echo   2. Double-click  START.command
echo   3. If Mac blocks it: System Settings → Privacy ^& Security
echo      → scroll down → click "Open Anyway"
echo   4. The dashboard opens automatically at http://localhost:8000
echo   5. Python installs itself the first time ^(takes ~2 min^)
echo.
echo REQUIREMENTS:
echo   - Internet connection ^(first run only, to install Python^)
echo   - Windows 10/11  OR  macOS 11+
echo   - No other software needed — setup is fully automatic
echo.
echo DAILY USE:
echo   - Keep the Excel file in the same folder as the START file
echo   - Edit the Excel file as normal; dashboard updates in ~2 sec
echo   - To stop: close the terminal / press Ctrl+C
echo.
echo NEED HELP?
echo   Contact the person who sent this file.
echo ============================================================
) > "%SCRIPT_DIR%README_START_HERE.txt"

echo [OK] README_START_HERE.txt written

:: ── Build ZIP using PowerShell Compress-Archive ──────────────
echo.
echo Building ZIP (this may take 30-60 seconds)...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "& {
    $src  = '%SCRIPT_DIR%'.TrimEnd('\')
    $dest = '%ZIP_PATH%'

    # Items to include
    $include = @(
        'README_START_HERE.txt',
        'START.bat',
        'START.command',
        'START.ps1',
        'main.py',
        'requirements.txt',
        '.env',
        'tools',
        'frontend\dist'
    )

    # Excel file (grab whichever .xlsx is present)
    $xlsx = Get-ChildItem -Path $src -Filter '*.xlsx' -File | Select-Object -First 1
    if ($xlsx) { $include += $xlsx.Name }

    # Collect full paths that exist
    $paths = $include | ForEach-Object {
        $p = Join-Path $src $_
        if (Test-Path $p) { $p }
        else { Write-Warning \"Skipped (not found): $_\" }
    }

    if (-not $paths) {
        Write-Error 'Nothing to package.'
        exit 1
    }

    Compress-Archive -Path $paths -DestinationPath $dest -Force
    Write-Host ''
    Write-Host '[OK] ZIP created: ' + $dest
}"

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to create ZIP.
    echo         Check that PowerShell is available and try again.
    echo.
    pause
    exit /b 1
)

:: ── Report size ───────────────────────────────────────────────
for %%F in ("%ZIP_PATH%") do set ZIP_SIZE=%%~zF
set /a ZIP_MB=!ZIP_SIZE! / 1048576

echo.
echo ============================================================
echo   DONE!
echo.
echo   File : %ZIP_PATH%
echo   Size : ~%ZIP_MB% MB
echo.
echo   Attach  %ZIP_NAME%  to your email.
echo   The recipient just unzips and double-clicks START.bat
echo   (Windows) or START.command (Mac).
echo ============================================================
echo.

:: Open the folder so user can grab the ZIP
explorer /select,"%ZIP_PATH%"

pause
