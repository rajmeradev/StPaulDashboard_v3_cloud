@echo off
REM St. Paul Production Dashboard - Windows Launcher
REM Delegates to START.ps1 (PowerShell) for reliable execution
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START.ps1"
