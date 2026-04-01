# tools package — St. Paul Plant Production Dashboard backend modules
#
# Module responsibilities:
#   excel_reader.py  — reads & validates Excel file, returns typed data
#   cache.py         — thread-safe in-memory cache with RLock
#   file_watcher.py  — OS filesystem watcher, triggers reload callbacks
#   api_bridge.py    — FastAPI routes only, reads from cache
