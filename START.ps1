# St. Paul Production Dashboard - PowerShell Launcher
# More reliable than START.bat on all Windows versions

$ErrorActionPreference = "SilentlyContinue"
Set-Location $PSScriptRoot

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  St. Paul Production Dashboard" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Find Python ──────────────────────────────────────────────────────
$PythonExe = $null

foreach ($cmd in @("py", "python", "python3")) {
    $ver = & $cmd --version 2>&1
    if ($LASTEXITCODE -eq 0 -and $ver -match "Python 3") {
        $PythonExe = $cmd
        Write-Host "[OK] Python found: $ver" -ForegroundColor Green
        break
    }
}

if (-not $PythonExe) {
    Write-Host "[INFO] Python not found. Downloading Python 3.11..." -ForegroundColor Yellow
    Write-Host "       Please wait a few minutes..."
    Write-Host ""

    $dlUrl  = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
    $dlFile = "$env:TEMP\python311_setup.exe"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        (New-Object Net.WebClient).DownloadFile($dlUrl, $dlFile)
    } catch {
        Write-Host "[ERROR] Download failed: $_" -ForegroundColor Red
        Write-Host "        Install manually: https://www.python.org/downloads/"
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host "[INFO] Installing Python 3.11 (UAC prompt may appear)..."
    Start-Process -FilePath $dlFile -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0" -Wait
    Remove-Item $dlFile -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "[DONE] Python installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "================================================================"
    Write-Host "  Close this window and double-click START.ps1 again."
    Write-Host "  Windows must reload PATH after Python install."
    Write-Host "================================================================"
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""

# ── Step 2: Install dependencies ────────────────────────────────────────────
if (-not (Test-Path ".deps_installed")) {
    Write-Host "[INFO] Installing dependencies (first time only)..." -ForegroundColor Yellow

    & $PythonExe -m pip install --upgrade pip --quiet
    & $PythonExe -m pip install -r requirements.txt

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies." -ForegroundColor Red
        Write-Host "        Check internet connection and try again."
        Read-Host "Press Enter to exit"
        exit 1
    }

    New-Item -Path ".deps_installed" -ItemType File -Force | Out-Null
    Write-Host "[OK] Dependencies installed." -ForegroundColor Green
    Write-Host ""
}

# ── Step 3: Open browser after delay ────────────────────────────────────────
Start-Job -ScriptBlock {
    Start-Sleep 3
    Start-Process "http://localhost:8000"
} | Out-Null

# ── Step 4: Start server ─────────────────────────────────────────────────────
Write-Host "[INFO] Starting St. Paul Production Dashboard..." -ForegroundColor Green
Write-Host "       Dashboard: http://localhost:8000"
Write-Host "       Press Ctrl+C to stop"
Write-Host ""
Write-Host "================================================================"
Write-Host ""

& $PythonExe -m uvicorn tools.api_bridge:app --host 0.0.0.0 --port 8000

Write-Host ""
Write-Host "Server stopped."
Read-Host "Press Enter to exit"
