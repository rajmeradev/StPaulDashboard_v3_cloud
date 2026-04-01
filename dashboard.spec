# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec — St. Paul Production Dashboard
# Build command:  pyinstaller dashboard.spec --clean

block_cipher = None

a = Analysis(
    ["main.py"],
    pathex=["."],
    binaries=[],
    datas=[
        # Bundle the built React app
        ("frontend/dist", "frontend/dist"),
        # Bundle the tools package
        ("tools/__init__.py",        "tools"),
        ("tools/api_bridge.py",      "tools"),
        ("tools/cache.py",           "tools"),
        ("tools/excel_reader.py",    "tools"),
        ("tools/file_watcher.py",    "tools"),
        ("tools/ws_manager.py",      "tools"),
    ],
    hiddenimports=[
        # uvicorn internals
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.protocols.websockets.websockets_impl",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "uvicorn.lifespan.off",
        "uvicorn.config",
        "uvicorn.main",
        # FastAPI / Starlette
        "fastapi",
        "fastapi.middleware.cors",
        "fastapi.staticfiles",
        "fastapi.responses",
        "starlette.staticfiles",
        "starlette.responses",
        "starlette.middleware.cors",
        "starlette.routing",
        "starlette.applications",
        "starlette.websockets",
        # WebSockets
        "websockets",
        "websockets.legacy",
        "websockets.legacy.server",
        "websockets.legacy.client",
        # File watching
        "watchdog",
        "watchdog.observers",
        "watchdog.observers.polling",
        "watchdog.events",
        # Excel
        "openpyxl",
        "openpyxl.cell",
        "openpyxl.styles",
        "openpyxl.utils",
        "openpyxl.reader.excel",
        "openpyxl.writer.excel",
        # Other deps
        "dotenv",
        "python_dotenv",
        "anyio",
        "anyio._backends._asyncio",
        "h11",
        "click",
        "pydantic",
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[
        "tkinter", "matplotlib", "numpy",
        "pandas", "scipy", "PIL", "notebook",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="StPaulDashboard",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,       # shows a terminal window — set False for silent
    icon=None,
)
