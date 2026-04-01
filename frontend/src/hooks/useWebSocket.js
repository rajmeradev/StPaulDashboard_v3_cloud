import { useState, useEffect, useRef, useCallback } from 'react'

// Dynamic WebSocket URL — works both locally and on Railway/Render
const WS_URL = import.meta.env.DEV
  ? 'ws://localhost:8000/ws'
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`

/**
 * Manages a persistent WebSocket connection to the API server.
 * On receiving a "data_updated" message, calls onDataUpdated().
 * Auto-reconnects every 5s on disconnect.
 * Sends a keep-alive ping every 30s.
 *
 * @param {() => void} onDataUpdated  called when the server pushes new data
 * @returns {'connecting'|'connected'|'disconnected'} wsStatus
 */
export function useWebSocket(onDataUpdated) {
    const [wsStatus, setWsStatus] = useState('connecting')
    const wsRef = useRef(null)
    const reconnectTimer = useRef(null)
    const isMounted = useRef(true)

    const connect = useCallback(() => {
        if (!isMounted.current) return
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        setWsStatus('connecting')
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
            if (!isMounted.current) { ws.close(); return }
            setWsStatus('connected')
        }

        ws.onmessage = (event) => {
            if (!isMounted.current) return
            try {
                const msg = JSON.parse(event.data)
                if (msg.type === 'data_updated') onDataUpdated()
            } catch (_) { /* pong or non-JSON */ }
        }

        ws.onclose = () => {
            if (!isMounted.current) return
            setWsStatus('disconnected')
            reconnectTimer.current = setTimeout(connect, 5_000)
        }

        ws.onerror = () => ws.close()
    }, [onDataUpdated])

    // Keep-alive ping every 30s
    useEffect(() => {
        const ping = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('ping')
        }, 30_000)
        return () => clearInterval(ping)
    }, [])

    useEffect(() => {
        isMounted.current = true
        connect()
        return () => {
            isMounted.current = false
            clearTimeout(reconnectTimer.current)
            wsRef.current?.close()
        }
    }, [connect])

    return wsStatus
}
