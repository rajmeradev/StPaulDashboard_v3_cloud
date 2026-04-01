"""
St. Paul Production Dashboard — Entry Point

Used by PyInstaller to create the Windows .exe
Also works as a direct Python launcher: python main.py
"""
import os
import sys
import threading
import time
import webbrowser

# ── Frozen-path setup (PyInstaller) ────────────────────────────────────────
# When bundled as .exe:
#   sys.frozen      = True
#   sys._MEIPASS    = temp dir containing bundled files (frontend/dist, tools/)
#   sys.executable  = path to the .exe itself
#
# We set two env vars so api_bridge.py can resolve paths correctly
# without needing to import sys._MEIPASS directly.

if getattr(sys, "frozen", False):
    _EXE_DIR    = os.path.dirname(sys.executable)   # where .exe lives (Excel file here)
    _BUNDLE_DIR = sys._MEIPASS                       # where bundled assets live
else:
    _EXE_DIR    = os.path.dirname(os.path.abspath(__file__))
    _BUNDLE_DIR = _EXE_DIR

os.environ.setdefault("_EXE_DIR",    _EXE_DIR)
os.environ.setdefault("_BUNDLE_DIR", _BUNDLE_DIR)

# ── Browser opener ──────────────────────────────────────────────────────────

def _open_browser():
    time.sleep(3)
    webbrowser.open("http://localhost:8000")

# ── Main ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  St. Paul Production Dashboard")
    print("=" * 60)
    print()
    print("  Dashboard : http://localhost:8000")
    print("  Stop      : press Ctrl+C")
    print()

    threading.Thread(target=_open_browser, daemon=True).start()

    import uvicorn
    uvicorn.run(
        "tools.api_bridge:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
