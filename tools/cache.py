#!/usr/bin/env python3
"""
Thread-safe in-memory cache for Excel data.

Responsibility: ONE thing — store and retrieve parsed Excel data safely
across threads. Nothing else lives here.

FIX: Replaces the bare `cache` dict in api_bridge.py that had no lock,
creating a race condition between the file watcher thread and API request
handlers. Uses threading.RLock (reentrant) so the same thread can safely
acquire the lock multiple times.

Usage:
    from tools.cache import cache

    # Write (atomic — all three keys updated together)
    cache.update(master=..., line1=..., line2=...)

    # Read (thread-safe)
    master = cache.get_master()
    line1  = cache.get_line(1)        # returns [] if empty, None if not loaded yet
    loaded = cache.is_loaded()        # True once master is not None
    ts     = cache.get_last_modified()
"""

import threading
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ExcelDataCache:
    """
    Thread-safe container for parsed Excel schedule data.

    Design decisions:
    - RLock (reentrant lock) allows the same thread to acquire the lock
      multiple times without deadlocking (e.g., during startup sequence).
    - update() is the ONLY method that mutates state, and it does so
      atomically — all four keys are updated before the lock is released.
      A request can never read a half-updated cache.
    - is_loaded() checks master is not None. line1/line2 can be empty
      lists [] which is valid data for a line with no scheduled tasks.
      FIX: Previous code used `if not cache["line2"]` which treated an empty
      list as "not loaded", causing 500 errors when Line 2 had no tasks.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._master: Optional[Dict[str, Any]] = None
        self._line1: Optional[List[Dict]] = None
        self._line2: Optional[List[Dict]] = None
        self._last_modified: Optional[str] = None
        self._data_warnings: List[str] = []

    def update(
        self,
        master: Dict[str, Any],
        line1: List[Dict],
        line2: List[Dict],
        warnings: Optional[List[str]] = None,
    ) -> None:
        """
        Atomically update all cache data.
        All four keys are written within a single lock acquisition.
        """
        with self._lock:
            self._master = master
            self._line1 = line1
            self._line2 = line2
            self._last_modified = datetime.now().isoformat()
            self._data_warnings = warnings or []
            logger.info(
                f"Cache updated — Line 1: {len(line1)} rows, "
                f"Line 2: {len(line2)} rows, "
                f"Warnings: {len(self._data_warnings)}"
            )

    def get_master(self) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._master

    def get_line(self, line_num: int) -> Optional[List[Dict]]:
        """
        Returns the schedule rows for line 1 or 2.
        Returns None if data has never been loaded.
        Returns [] (empty list) if data was loaded but line has no tasks — this is valid.
        """
        with self._lock:
            if line_num == 1:
                return self._line1
            elif line_num == 2:
                return self._line2
            else:
                raise ValueError(f"Invalid line number: {line_num}. Must be 1 or 2.")

    def get_last_modified(self) -> Optional[str]:
        with self._lock:
            return self._last_modified

    def get_warnings(self) -> List[str]:
        """Data quality warnings from last Excel read (e.g., stale formula cells)."""
        with self._lock:
            return list(self._data_warnings)

    def is_loaded(self) -> bool:
        """
        True once master data has been read at least once.
        line1/line2 being empty lists is NOT considered unloaded.
        """
        with self._lock:
            return self._master is not None

    def reset(self) -> None:
        """Clear cache (primarily for testing)."""
        with self._lock:
            self._master = None
            self._line1 = None
            self._line2 = None
            self._last_modified = None
            self._data_warnings = []


# Singleton — import this from anywhere
cache = ExcelDataCache()
