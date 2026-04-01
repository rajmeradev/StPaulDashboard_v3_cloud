#!/usr/bin/env python3
"""
Excel file watcher for St. Paul Plant Production Dashboard.

Responsibility: ONE thing — watch the Excel file for OS-level changes
and call a reload callback when a save is detected.

No data parsing, no caching, no HTTP. Just filesystem events.

macOS save behaviour:
  When Excel saves a .xlsx file on macOS it writes a temp file and then
  swaps it with the original. This triggers an on_created event (not
  on_modified). Both events are handled.

  A 500ms sleep after detection gives Excel time to release the file lock
  before openpyxl attempts to read it.

  A 2-second debounce prevents multiple rapid reloads if Excel fires
  several events during a single save operation.
"""

import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

logger = logging.getLogger(__name__)

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
EXCEL_FILE_PATH = PROJECT_ROOT / os.getenv(
    "EXCEL_FILE_PATH", "St Paul Production Tool V2 Trial.xlsx"
)


class ExcelFileHandler(FileSystemEventHandler):
    """Handles filesystem events for the Excel file."""

    def __init__(self, reload_callback, debounce_seconds: float = 2.0):
        self._reload_callback = reload_callback
        self._debounce_seconds = debounce_seconds
        self._last_reload_time: float = 0.0

    def _handle_file_event(self, event_path: str, event_type: str) -> None:
        """Common handler for modified and created events."""
        if Path(event_path) != EXCEL_FILE_PATH:
            return  # Different file in the same directory — ignore

        now = time.monotonic()
        elapsed = now - self._last_reload_time
        if elapsed < self._debounce_seconds:
            logger.debug(
                f"Debouncing: ignoring {event_type} event "
                f"({elapsed:.1f}s since last reload, threshold {self._debounce_seconds}s)"
            )
            return

        logger.info(f"Excel file {event_type}: {event_path}")

        # Wait for Excel's file lock to release before reading
        time.sleep(0.5)

        try:
            self._reload_callback()
            self._last_reload_time = time.monotonic()
            logger.info("✓ Reload callback completed successfully")
        except Exception as exc:
            logger.error(f"✗ Reload callback failed: {exc}")

    def on_modified(self, event):
        if not event.is_directory:
            self._handle_file_event(event.src_path, "modified")

    def on_created(self, event):
        if not event.is_directory:
            self._handle_file_event(event.src_path, "created")


def start_watcher(reload_callback) -> None:
    """
    Start the filesystem observer and block until interrupted.

    This function is designed to run in a daemon thread — it blocks
    indefinitely with `observer.join()`. The daemon flag on the thread
    ensures it exits automatically when the main process exits.

    Args:
        reload_callback: Zero-argument callable invoked on each detected
                         file change. Should be idempotent.
    """
    logger.info(f"File watcher starting — watching: {EXCEL_FILE_PATH}")

    if not EXCEL_FILE_PATH.exists():
        logger.warning(
            f"Excel file does not exist yet: {EXCEL_FILE_PATH}. "
            f"Watcher will detect it when created."
        )

    event_handler = ExcelFileHandler(reload_callback)
    observer = Observer()
    # Watch the parent directory (not the file itself) — required by watchdog
    observer.schedule(event_handler, str(EXCEL_FILE_PATH.parent), recursive=False)
    observer.start()
    logger.info("✓ File watcher observer started")

    try:
        while observer.is_alive():
            observer.join(timeout=1.0)
    except KeyboardInterrupt:
        logger.info("File watcher interrupted — stopping observer")
    finally:
        observer.stop()
        observer.join()
        logger.info("File watcher stopped")


# ---------------------------------------------------------------------------
# Standalone test (python -m tools.file_watcher)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    )

    def _mock_reload():
        logger.info(">>> Mock reload triggered — Excel file changed")

    logger.info("Running file watcher in standalone test mode. Edit the Excel file to test.")
    start_watcher(_mock_reload)
