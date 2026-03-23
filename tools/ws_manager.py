#!/usr/bin/env python3
"""
WebSocket connection manager for real-time dashboard push.

Responsibility: Track connected browser clients and broadcast JSON
messages to all of them simultaneously.

Thread safety note: broadcast() is a coroutine and must be called from
the asyncio event loop. The api_bridge uses asyncio.run_coroutine_threadsafe()
to schedule broadcasts from the synchronous file watcher thread.
"""

import logging
from typing import Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages a set of active WebSocket connections.

    Design:
    - Connections stored in a plain set (no lock needed — all access
      from the single asyncio event loop thread).
    - Dead connections are cleaned up silently during broadcast rather
      than on disconnect, so a crashing client never raises.
    """

    def __init__(self):
        self._connections: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.add(ws)
        logger.info(
            f"WebSocket client connected — {len(self._connections)} active connection(s)"
        )
        # Send immediate confirmation so the client knows it's live
        await ws.send_json({
            "type": "connected",
            "activeConnections": len(self._connections),
        })

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard(ws)
        logger.info(
            f"WebSocket client disconnected — {len(self._connections)} active connection(s)"
        )

    async def broadcast(self, message: dict) -> None:
        """
        Send a JSON message to every connected client.
        Silently removes any clients that have gone away.
        """
        if not self._connections:
            return

        dead: Set[WebSocket] = set()

        for ws in list(self._connections):
            try:
                await ws.send_json(message)
            except Exception as exc:
                logger.debug(f"Failed to send to client (will remove): {exc}")
                dead.add(ws)

        for ws in dead:
            self._connections.discard(ws)

        if dead:
            logger.info(
                f"Removed {len(dead)} dead connection(s) — "
                f"{len(self._connections)} remaining"
            )

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Singleton — imported by api_bridge
ws_manager = WebSocketManager()
