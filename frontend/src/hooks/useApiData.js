import { useState, useCallback, useEffect, useRef } from 'react'

// In production the React app is served from the same host as the API,
// so we use a relative base. In local dev (Vite on :5173) fall back to localhost:8000.
const API = import.meta.env.DEV ? 'http://localhost:8000' : ''

export function useApiData(initialWsStatus = 'connecting') {
    const [gantt, setGantt] = useState(null)
    const [materials, setMaterials] = useState(null)
    const [alerts, setAlerts] = useState(null)
    const [master, setMaster] = useState(null)
    const [status, setStatus] = useState(null)
    const [isLive, setIsLive] = useState(true)
    const [lastRefreshed, setLastRefreshed] = useState(null)
    const [wsStatus, setWsStatus] = useState(initialWsStatus)

    // Use a ref so the interval callback always reads the latest wsStatus
    // without needing to be recreated every time it changes.
    const wsStatusRef = useRef(wsStatus)
    useEffect(() => { wsStatusRef.current = wsStatus }, [wsStatus])

    const fetchData = useCallback(async () => {
        const safeFetch = async (url) => {
            const r = await fetch(url)
            if (!r.ok) return null
            return r.json()
        }
        try {
            const [s, g, m, a, ms] = await Promise.all([
                safeFetch(`${API}/api/status`),
                safeFetch(`${API}/api/gantt`),
                safeFetch(`${API}/api/materials`),
                safeFetch(`${API}/api/alerts`),
                safeFetch(`${API}/api/master`),
            ])
            if (s) setStatus(s)
            if (g) setGantt(g)
            if (m) setMaterials(m)
            if (a) setAlerts(a)
            if (ms) setMaster(ms)
            setIsLive(true)
            setLastRefreshed(new Date())
        } catch {
            setIsLive(false)
        }
    }, [])

    // Initial load
    useEffect(() => { fetchData() }, [fetchData])

    // Adaptive polling: 60s when WS is connected, 5s when disconnected
    useEffect(() => {
        const interval = wsStatus === 'connected' ? 60_000 : 5_000
        const iv = setInterval(fetchData, interval)
        return () => clearInterval(iv)
    }, [fetchData, wsStatus])

    return {
        gantt, materials, alerts, master, status,
        isLive, lastRefreshed, fetchData,
        wsStatus, setWsStatus,
    }
}
