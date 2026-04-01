import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function LiveClock() {
    const [time, setTime] = useState(new Date())
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(t)
    }, [])
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--brand-teal-light)', letterSpacing: '0.04em' }}>
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#475569', letterSpacing: '0.1em', marginTop: 2 }}>
                {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </div>
        </div>
    )
}

function StatusBadge({ wsStatus, isLive, lastRefreshed }) {
    // Determine connection state
    const state = !isLive ? 'offline' : wsStatus === 'connected' ? 'live' : wsStatus === 'connecting' ? 'polling' : 'offline'

    const config = {
        live:    { dot: '#22C55E', label: '● LIVE',    color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   pulse: true  },
        polling: { dot: '#F59E0B', label: '○ POLLING', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  pulse: false },
        offline: { dot: '#F43F5E', label: '✕ OFFLINE', color: '#F43F5E', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)',   pulse: false },
    }[state]

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: config.bg, border: `1px solid ${config.border}`,
                borderRadius: 6, padding: '4px 10px',
            }}>
                <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: config.dot,
                    boxShadow: config.pulse ? `0 0 8px ${config.dot}` : 'none',
                    animation: config.pulse ? 'slowPulse 2.5s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: config.color, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                    {config.label}
                </span>
            </div>

            {lastRefreshed && (
                <span style={{ fontSize: 9, color: '#334155', fontFamily: 'var(--font-mono)' }}>
                    {lastRefreshed.toLocaleTimeString()}
                </span>
            )}
        </div>
    )
}

export function AppShell({ wsStatus, isLive, lastRefreshed, children, showNav = true, onReupload }) {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const nav = [
        { path: '/gantt', label: 'Gantt Schedule' },
        { path: '/dashboard', label: 'Dashboard' },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <style>{`
                @keyframes slowPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>

            {/* Header */}
            <header style={{
                height: 56, flexShrink: 0,
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', padding: '0 20px',
                position: 'relative',
                boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
            }}>
                {/* Left — logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 5 L10 18 C6 23 7 29 11 33 C15 37 25 37 29 33 C33 29 34 23 30 18 L20 5 Z" fill="var(--brand-teal)" />
                            <path d="M20 6.5 L12.5 18 C15 17 18 19 20 18 C23 17 26 18 27.5 18 L20 6.5 Z" fill="rgba(255,255,255,0.15)" />
                            <circle cx="29" cy="8" r="3" stroke="var(--brand-orange)" strokeWidth="2.5" fill="none" />
                        </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--brand-orange)', lineHeight: 1.1, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            St. Paul
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', color: 'var(--brand-teal-light)', textTransform: 'uppercase' }}>
                            Beverage Solutions
                        </div>
                    </div>
                </div>

                {/* Center — clock */}
                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                    <LiveClock />
                </div>

                {/* Right — status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
                    <StatusBadge wsStatus={wsStatus} isLive={isLive} lastRefreshed={lastRefreshed} />

                    {onReupload && (
                        <button
                            onClick={onReupload}
                            style={{
                                border: '1px solid rgba(249,115,22,0.4)',
                                borderRadius: 6,
                                background: 'rgba(249,115,22,0.08)',
                                color: 'var(--brand-orange)',
                                fontSize: 10, fontWeight: 700,
                                padding: '5px 12px', cursor: 'pointer',
                                letterSpacing: '0.06em',
                                fontFamily: 'var(--font-display)',
                                textTransform: 'uppercase',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(249,115,22,0.15)'
                                e.currentTarget.style.borderColor = 'var(--brand-orange)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(249,115,22,0.08)'
                                e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'
                            }}
                        >
                            Upload New File
                        </button>
                    )}
                </div>
            </header>

            {/* Sub-nav */}
            {showNav && <nav style={{
                height: 40, flexShrink: 0,
                background: '#080F1D',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'stretch', padding: '0 16px', gap: 4,
            }}>
                {nav.map(({ path, label }) => {
                    const active = pathname === path || (pathname === '/' && path === '/gantt')
                    return (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            style={{
                                border: 'none',
                                borderBottom: `2px solid ${active ? 'var(--brand-orange)' : 'transparent'}`,
                                background: active ? 'rgba(249,115,22,0.08)' : 'transparent',
                                color: active ? 'var(--brand-orange)' : '#475569',
                                fontSize: 12, fontWeight: active ? 700 : 400,
                                fontFamily: active ? 'var(--font-display)' : 'var(--font)',
                                letterSpacing: active ? '0.05em' : 'normal',
                                textTransform: active ? 'uppercase' : 'none',
                                padding: '0 14px', cursor: 'pointer', transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#94A3B8' }}
                            onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#475569' }}
                        >
                            {label}
                        </button>
                    )
                })}
            </nav>}

            {/* Page content */}
            <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {children}
            </main>
        </div>
    )
}
