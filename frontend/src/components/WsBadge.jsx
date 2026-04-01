/**
 * WsBadge — shows the WebSocket connection status in the header.
 * Green pulsing dot = live push, yellow = connecting, red = polling fallback.
 */
export function WsBadge({ status }) {
    const configs = {
        connected: { color: 'var(--green-400)', label: '● LIVE', title: 'WebSocket connected — updates in real time' },
        connecting: { color: 'var(--amber-400)', label: '◌ CONNECTING', title: 'Connecting to WebSocket server...' },
        disconnected: { color: 'var(--red-400)', label: '○ POLLING 5s', title: 'WebSocket down — polling every 5s' },
    }
    const cfg = configs[status] || configs.disconnected

    return (
        <span
            title={cfg.title}
            style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                color: cfg.color, display: 'flex', alignItems: 'center', gap: 4,
                animation: status === 'connected' ? 'pulse 1.8s ease-in-out infinite' : 'none',
            }}
        >
            {cfg.label}
        </span>
    )
}
