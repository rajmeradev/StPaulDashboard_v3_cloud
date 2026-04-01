@echo off
REM St. Paul Dashboard - Windows EXE Builder
REM Run this ONCE on Windows to produce StPaulDashboard.exe
REM Requires: Python 3.10+ installed with pip

cd /d "%~dp0"

echo ================================================================
echo   St. Paul Dashboard - Building Windows EXE
echo ================================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [INFO] Installing PyInstaller and dependencies...
python -m pip install pyinstaller --quiet
python -m pip install -r requirements.txt --quiet

echo [INFO] Building StPaulDashboard.exe ...
echo        This takes 2-5 minutes. Please wait...
echo.

python -m PyInstaller dashboard.spec --clean --noconfirm

if not exist "dist\StPaulDashboard.exe" (
    echo.
    echo [ERROR] Build failed. Check output above for errors.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   BUILD COMPLETE!
echo.
echo   Your EXE is at:  dist\StPaulDashboard.exe
echo.
echo   To deliver to sponsor, copy:
echo     - dist\StPaulDashboard.exe
echo     - St Paul Production Tool V2 Trial.xlsx
echo   Both files must be in the same folder.
echo ================================================================
echo.
pause
