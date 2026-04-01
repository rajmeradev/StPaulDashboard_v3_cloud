#!/bin/bash
# ============================================================
#  St. Paul Production Tool — Build Email Package (Mac)
#  Creates a clean ZIP that can be attached to any email.
#  Run this once; send the resulting ZIP to anyone.
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ZIP_NAME="StPaulProductionTool.zip"
ZIP_PATH="$SCRIPT_DIR/$ZIP_NAME"

echo ""
echo "============================================================"
echo "  St. Paul Production Tool - Build Email Package"
echo "============================================================"
echo ""

# ── Remove old ZIP ────────────────────────────────────────────
if [ -f "$ZIP_PATH" ]; then
    rm -f "$ZIP_PATH"
    echo "[OK] Removed old $ZIP_NAME"
fi

# ── Write README_START_HERE.txt ───────────────────────────────
echo "Writing setup instructions..."

cat > "$SCRIPT_DIR/README_START_HERE.txt" << 'EOF'
============================================================
  St. Paul Production Tool - Quick Start
============================================================

WINDOWS:
  1. Unzip this file to any folder (e.g. your Desktop)
  2. Double-click  START.bat
  3. If Windows asks "Run anyway?" - click Yes
  4. The dashboard opens automatically at http://localhost:8000
  5. Python installs itself the first time (takes ~2 min)

MAC:
  1. Unzip this file to any folder
  2. Double-click  START.command
  3. If Mac blocks it: System Settings → Privacy & Security
     → scroll down → click "Open Anyway"
  4. The dashboard opens automatically at http://localhost:8000
  5. Python installs itself the first time (takes ~2 min)

REQUIREMENTS:
  - Internet connection (first run only, to install Python)
  - Windows 10/11  OR  macOS 11+
  - No other software needed — setup is fully automatic

DAILY USE:
  - Keep the Excel file in the same folder as the START file
  - Edit the Excel file as normal; dashboard updates in ~2 sec
  - To stop: close the terminal / press Ctrl+C

NEED HELP?
  Contact the person who sent this file.
============================================================
EOF

echo "[OK] README_START_HERE.txt written"

# ── Collect files to include ──────────────────────────────────
INCLUDE=(
    "README_START_HERE.txt"
    "START.bat"
    "START.command"
    "START.ps1"
    "main.py"
    "requirements.txt"
    ".env"
    "tools"
    "frontend/dist"
)

# Add first .xlsx file found
XLSX=$(find "$SCRIPT_DIR" -maxdepth 1 -name "*.xlsx" | head -1)
if [ -n "$XLSX" ]; then
    INCLUDE+=("$(basename "$XLSX")")
fi

# ── Build ZIP ─────────────────────────────────────────────────
echo ""
echo "Building ZIP (this may take 30-60 seconds)..."
echo ""

# Change to project root so paths inside ZIP are relative
cd "$SCRIPT_DIR"

PATHS=()
for item in "${INCLUDE[@]}"; do
    if [ -e "$item" ]; then
        PATHS+=("$item")
    else
        echo "  [skip] not found: $item"
    fi
done

if [ ${#PATHS[@]} -eq 0 ]; then
    echo "[ERROR] Nothing to package."
    read -p "Press Enter to exit..."
    exit 1
fi

# Zip, excluding junk
zip -r "$ZIP_PATH" "${PATHS[@]}" \
    --exclude "*/__pycache__/*" \
    --exclude "*.pyc" \
    --exclude "*/.DS_Store" \
    --exclude "*/Thumbs.db" \
    --exclude "*/.tmp/*" \
    2>/dev/null

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Failed to create ZIP."
    read -p "Press Enter to exit..."
    exit 1
fi

# ── Report ────────────────────────────────────────────────────
ZIP_SIZE=$(du -sh "$ZIP_PATH" | cut -f1)

echo ""
echo "============================================================"
echo "  DONE!"
echo ""
echo "  File : $ZIP_PATH"
echo "  Size : $ZIP_SIZE"
echo ""
echo "  Attach  $ZIP_NAME  to your email."
echo "  The recipient just unzips and double-clicks START.bat"
echo "  (Windows) or START.command (Mac)."
echo "============================================================"
echo ""

# Open Finder at the ZIP location
open -R "$ZIP_PATH"

read -p "Press Enter to exit..."
