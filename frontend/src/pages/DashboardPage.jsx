import { useState, useEffect } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'

/* ── Inline SVG Icons ────────────────────────────────────────── */
const IconAlert = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
const IconActivity = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
const IconDatabase = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
const IconTarget = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
const IconClock = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
const IconCheck = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>

/* ── Helpers ────────────────────────────────────────────────── */
const fmt = (n, dec = 0) => n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })

/* ── Running Now Card ───────────────────────────────────────── */
function RunningNowCard({ ganttData }) {
    if (!ganttData) return <SkeletonCard height={240} />
    const now = new Date()

    const getActive = (line) => line?.tasks?.find(t =>
        !t.isBreak && t.startTime && t.endTime &&
        new Date(t.startTime) <= now && new Date(t.endTime) >= now
    )
    // Next N upcoming real production tasks (not breaks, not started yet)
    const getUpcoming = (line, n = 3) =>
        (line?.tasks || [])
            .filter(t => !t.isBreak && t.startTime && t.endTime && new Date(t.startTime) > now)
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
            .slice(0, n)

    const fmtTime = (iso) => {
        const d = new Date(iso)
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    }
    const hoursUntil = (iso) => ((new Date(iso) - now) / 3600000).toFixed(1)

    // Task type → color
    const taskColor = (t) => {
        if (t.type === 'cip')      return { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  text: '#EAB308' }
        if (t.type === 'downtime') return { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', text: '#94A3B8' }
        if (t.type === 'flush')    return { bg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.3)',  text: '#14B8A6' }
        return { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', text: 'var(--blue-400)' }
    }

    return (
        <div className="card fade-in" style={{ animationDelay: '0.05s', '--card-accent': 'var(--brand-teal)' }}>
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconActivity />
                    <span className="card-title">Live Telemetry</span>
                </div>
                <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--brand-teal-light)',
                    background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
                    borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--font-mono)',
                }}>● REALTIME</span>
            </div>
            <div className="card-body" style={{ padding: '16px 20px 16px 23px' }}>
                {/* Two lines side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {ganttData.lines.map((line, li) => {
                    const accent = li === 0 ? '#0891B2' : '#10B981'
                    const task = getActive(line)
                    const upcoming = getUpcoming(line)
                    const start = task ? new Date(task.startTime) : null
                    const end   = task ? new Date(task.endTime)   : null
                    const totalMs   = task ? end - start : 0
                    const elapsedMs = task ? now - start : 0
                    const pct    = task ? Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100)) : 0
                    const remHrs = task ? ((end - now) / 3600000).toFixed(1) : 0

                    return (
                        <div key={line.id} style={{ background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--glass-border)', overflow: 'hidden', borderLeft: `3px solid ${accent}` }}>

                            {/* Line header */}
                            <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>{line.label}</div>
                                {task ? (
                                    <span className="badge badge-green"><span className="dot dot-pulse" /> ACTIVE</span>
                                ) : (
                                    <span className="badge badge-gray">IDLE</span>
                                )}
                            </div>

                            {/* Currently running */}
                            <div style={{ padding: '12px 14px', borderBottom: upcoming.length > 0 ? '1px solid var(--glass-border)' : 'none' }}>
                                {task ? (
                                    <>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: accent, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {task.sku || task.type.toUpperCase()}
                                        </div>
                                        <div className="progress-track" style={{ marginBottom: 6, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5 }}>
                                            <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}bb, ${accent})`, boxShadow: `0 0 10px ${accent}66`, borderRadius: 5 }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            <span>{pct.toFixed(0)}% done</span>
                                            <span>{remHrs}h left</span>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting schedule engagement...</div>
                                )}
                            </div>

                            {/* Upcoming queue */}
                            {upcoming.length > 0 && (
                                <div style={{ padding: '8px 14px 10px' }}>
                                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 5, fontFamily: 'var(--font-display)' }}>UP NEXT</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        {upcoming.map((u, i) => {
                                            const c = taskColor(u)
                                            const durHrs = ((new Date(u.endTime) - new Date(u.startTime)) / 3600000).toFixed(1)
                                            return (
                                                <div key={u.id ?? i} style={{
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    background: c.bg, border: `1px solid ${c.border}`,
                                                    borderRadius: 5, padding: '5px 8px',
                                                }}>
                                                    <span style={{ fontSize: 8, fontWeight: 700, color: c.text, background: `${c.border}`, borderRadius: 3, padding: '1px 3px', minWidth: 16, textAlign: 'center' }}>+{i + 1}</span>
                                                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {u.sku || u.type?.toUpperCase()}
                                                    </span>
                                                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{durHrs}h</span>
                                                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>in {hoursUntil(u.startTime)}h</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
                </div>
            </div>
        </div>
    )
}

/* ── Alerts Card ────────────────────────────────────────────── */
function AlertsCard({ alertsData }) {
    if (!alertsData) return <SkeletonCard height={240} />

    const rows = []
    const push = (lineLabel, key, message, severity) => rows.push({ lineLabel, key: `${lineLabel}-${key}`, message, severity })

        ;[{ l: 'LINE 1', d: alertsData.line1 }, { l: 'LINE 2', d: alertsData.line2 }].forEach(({ l, d }) => {
            if (!d) return
            if (d.overlapDetected) push(l, 'overlap', 'Temporal overlap sequence detected', 'red')
            if (d.exceedsCIPLimit) push(l, 'cip', `CIP violation threshold (${d.maxHrs}h limit)`, 'red')
            if (d.exceedsPlanningHorizon) push(l, 'horizon', `Horizon boundary exceeded (${d.maxHrs}h)`, 'amber')
            if (!d.cipScheduled) push(l, 'nocip', 'Missing CIP sequence block', 'amber')
            if (d.activeOverrides > 0) push(l, 'override', `Manual integrity override active (${d.activeOverrides})`, 'blue')
        })

        // Liquifier conflict — shared resource between both lines
        const liq = alertsData.liquifierConflicts
        if (liq?.conflictCount > 0) {
            const pairs = liq.conflicts.slice(0, 3).map(c => `${c.line1Sku} ↔ ${c.line2Sku}`).join(', ')
            push('SHARED', 'liquifier', `Liquifier conflict — ${liq.conflictCount} overlap(s): ${pairs}`, 'red')
        }

    return (
        <div className="card fade-in" style={{ animationDelay: '0.1s', '--card-accent': '#F59E0B' }}>
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconAlert /> <span className="card-title">System Anomalies</span>
                </div>
                {rows.length > 0 && <span className="badge badge-red">{rows.length} ISSUES</span>}
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--green-400)', border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)', borderRadius: 8 }}>
                        <IconCheck />
                        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>ALL SYSTEMS NOMINAL</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>No constraint violations detected in schedule matrix.</div>
                    </div>
                ) : rows.map(({ key, lineLabel, message, severity }) => {
                    const sColor = severity === 'red' ? 'rgba(239,68,68,' : severity === 'amber' ? 'rgba(245,158,11,' : 'rgba(59,130,246,'
                    return (
                        <div key={key} style={{
                            background: `${sColor}0.08)`, border: `1px solid ${sColor}0.2)`, borderLeft: `3px solid ${sColor}1)`,
                            borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{message}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: `${sColor}1)`, background: `${sColor}0.1)`, padding: '2px 6px', borderRadius: 4 }}>{lineLabel}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/* ── Materials Table ────────────────────────────────────────── */
function MaterialsTable({ materialsData }) {
    const [expandedMat, setExpandedMat] = useState(null)
    if (!materialsData) return <SkeletonCard height={240} />
    const { line1: l1, line2: l2, combined: c, materialBreakdown } = materialsData

    const toggle = (name) => setExpandedMat(prev => prev === name ? null : name)
    const totalLbs = c?.pounds || 0

    // Color palette for material bars
    const BAR_COLORS = [
        { bar: '#3B82F6', glow: 'rgba(59,130,246,0.35)' },
        { bar: '#06B6D4', glow: 'rgba(6,182,212,0.35)' },
        { bar: '#8B5CF6', glow: 'rgba(139,92,246,0.35)' },
        { bar: '#10B981', glow: 'rgba(16,185,129,0.35)' },
        { bar: '#F59E0B', glow: 'rgba(245,158,11,0.35)' },
        { bar: '#EF4444', glow: 'rgba(239,68,68,0.35)' },
        { bar: '#EC4899', glow: 'rgba(236,72,153,0.35)' },
    ]

    // 3-ingredient callout data (available in V4 data)
    const ingredients = [
        { label: 'Raw Milk',   value: fmt(c?.rawReqLbs  ?? c?.highFatReqLbs), unit: 'lbs', color: '#F97316', glow: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.25)' },
        { label: 'Skim',       value: fmt(c?.skimReqLbs),                     unit: 'lbs', color: '#0891B2', glow: 'rgba(8,145,178,0.15)',  border: 'rgba(8,145,178,0.25)' },
        { label: 'Cream',      value: fmt(c?.creamReqLbs),                    unit: 'lbs', color: '#10B981', glow: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)' },
        { label: 'Total Vol',  value: fmt(c?.gallons),                         unit: 'gal', color: '#6B7280', glow: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' },
    ]

    return (
        <div className="card fade-in" style={{ animationDelay: '0.15s', '--card-accent': 'var(--green)' }}>
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconDatabase /> <span className="card-title">Material Requirements</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {fmt(c?.pounds)} lbs total
                </span>
            </div>

            {/* ── 3-ingredient callout row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '14px 20px 14px 23px', borderBottom: '1px solid var(--glass-border)' }}>
                {ingredients.map(({ label, value, unit, color, glow, border }) => (
                    <div key={label} style={{
                        background: glow, border: `1px solid ${border}`,
                        borderRadius: 8, padding: '12px 14px', position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.7 }} />
                        <div style={{ fontSize: 9, color: color, letterSpacing: '0.07em', marginBottom: 5, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{label.toUpperCase()}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: value === '—' ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1 }}>
                            {value}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>{unit}</div>
                    </div>
                ))}
            </div>

            {/* ── Raw material breakdown ── */}
            {materialBreakdown?.length > 0 && (
                <div style={{ padding: '12px 16px 8px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                        Raw Material Requirements — click any row to see finished-goods split
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {materialBreakdown.map((mat, idx) => {
                            const isOpen = expandedMat === mat.name
                            const pct = totalLbs > 0 ? (mat.lbs / totalLbs * 100) : 0
                            const color = BAR_COLORS[idx % BAR_COLORS.length]

                            return (
                                <div key={mat.name}>
                                    {/* ── Material row ── */}
                                    <div
                                        onClick={() => toggle(mat.name)}
                                        style={{
                                            background: isOpen ? 'rgba(255,255,255,0.04)' : 'var(--bg-input)',
                                            border: `1px solid ${isOpen ? color.bar + '55' : 'var(--glass-border)'}`,
                                            borderRadius: isOpen ? '8px 8px 0 0' : 8,
                                            padding: '12px 14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'var(--bg-input)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            {/* Expand chevron */}
                                            <span style={{ fontSize: 9, color: color.bar, minWidth: 8 }}>{isOpen ? '▼' : '▶'}</span>

                                            {/* Name + code */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{mat.name}</span>
                                                {mat.code && <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 7 }}>{mat.code}</span>}
                                            </div>

                                            {/* Percentage chip */}
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                                                color: color.bar, background: color.glow,
                                                padding: '2px 8px', borderRadius: 4,
                                            }}>{pct.toFixed(1)}%</span>

                                            {/* Total lbs — always visible */}
                                            <span style={{
                                                fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)',
                                                color: 'var(--text-primary)', minWidth: 90, textAlign: 'right',
                                            }}>{fmt(mat.lbs)}<span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>lbs</span></span>
                                        </div>

                                        {/* Proportion bar */}
                                        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 2,
                                                width: `${pct.toFixed(1)}%`,
                                                background: color.bar,
                                                boxShadow: `0 0 6px ${color.glow}`,
                                                transition: 'width 0.4s ease',
                                            }} />
                                        </div>
                                    </div>

                                    {/* ── SKU drill-down (expanded) ── */}
                                    {isOpen && (
                                        <div style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            border: `1px solid ${color.bar}55`,
                                            borderTop: 'none',
                                            borderRadius: '0 0 8px 8px',
                                            padding: '8px 14px 12px 32px',
                                        }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>FINISHED GOODS CONSUMING THIS MATERIAL</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                {mat.skus.map(s => {
                                                    const skuPct = mat.lbs > 0 ? (s.lbs / mat.lbs * 100) : 0
                                                    return (
                                                        <div key={s.sku} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sku}</span>
                                                            <div style={{ width: 80, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
                                                                <div style={{ height: '100%', borderRadius: 2, background: color.bar, opacity: 0.7, width: `${skuPct.toFixed(1)}%` }} />
                                                            </div>
                                                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 40, textAlign: 'right', flexShrink: 0 }}>{skuPct.toFixed(0)}%</span>
                                                            <span style={{ fontSize: 11, color: color.bar, fontFamily: 'var(--font-mono)', minWidth: 80, textAlign: 'right', flexShrink: 0 }}>{fmt(s.lbs)} lbs</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

/* ── Plan vs Actual ─────────────────────────────────────────── */
function PlanVsActualCard({ alertsData, masterData }) {
    if (!alertsData || !masterData) return <SkeletonCard height={180} />

    const hz = masterData.planningHorizonHours ?? 40
    const b1 = masterData.line1BaselineEndHrs ?? hz
    const b2 = masterData.line2BaselineEndHrs ?? hz
    const m1 = alertsData.line1?.maxHrs ?? 0
    const m2 = alertsData.line2?.maxHrs ?? 0

    const LineRow = ({ l, max, base }) => {
        const diff = max - base
        const ahead = diff <= 0
        const pct = Math.min(100, (max / (base * 1.2)) * 100)
        const c = ahead ? 'var(--green-400)' : 'var(--red-400)'
        const cGlow = ahead ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'

        return (
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{l}</span>
                    <span className="badge" style={{ background: `rgba(${ahead ? '34,197,94' : '239,68,68'}, 0.1)`, color: c, border: `1px solid rgba(${ahead ? '34,197,94' : '239,68,68'}, 0.2)` }}>
                        {ahead ? 'DELIVERY AHEAD' : 'DEFICIT ALERT'} {Math.abs(diff).toFixed(1)}H
                    </span>
                </div>
                <div className="progress-track" style={{ height: 6, background: 'rgba(255,255,255,0.05)' }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: c, boxShadow: `0 0 10px ${cGlow}` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>PROJ: {max}H</span>
                    <span style={{ borderLeft: '1px solid var(--text-muted)', paddingLeft: 6 }}>BASE: {base}H</span>
                </div>
            </div>
        )
    }

    return (
        <div className="card fade-in" style={{ animationDelay: '0.2s', '--card-accent': '#8B5CF6' }}>
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconTarget /> <span className="card-title">Trajectory Variance</span>
                </div>
            </div>
            <div className="card-body">
                <LineRow l="L1 (EH)" max={m1} base={b1} />
                <LineRow l="L2 (TR7)" max={m2} base={b2} />
            </div>
        </div>
    )
}

/* ── Schedule Summary ───────────────────────────────────────── */
function ScheduleSummaryCard({ statusData, masterData }) {
    if (!statusData || !masterData) return <SkeletonCard height={180} />
    const hz = masterData.planningHorizonHours ?? 40
    const el = statusData.hoursElapsed ?? 0
    const pct = Math.min(100, (el / hz) * 100)

    const start = statusData.scheduleStart ? new Date(statusData.scheduleStart).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'

    return (
        <div className="card fade-in" style={{ animationDelay: '0.25s' }}>
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconClock /> <span className="card-title">Horizon Matrix</span>
                </div>
            </div>
            <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 20 }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 2 }}>EPOCH START</div>
                        <div style={{ fontSize: 13, color: 'var(--blue-400)', fontFamily: 'var(--font-mono)' }}>{start}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 2 }}>CIP THRESHOLD</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{masterData.maxRunHours ?? 40}H</div>
                    </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span>T+{el}H elapsed</span>
                    <span>{hz}H total</span>
                </div>
                <div className="progress-track" style={{ height: 6, background: 'rgba(255,255,255,0.05)' }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct > 90 ? 'var(--red-500)' : 'var(--blue-500)', boxShadow: `0 0 10px ${pct > 90 ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'}` }} />
                </div>
            </div>
        </div>
    )
}

function SkeletonCard({ height }) {
    return <div className="card" style={{ height, background: 'rgba(10,22,40,0.5)', borderColor: 'rgba(255,255,255,0.03)' }} />
}

/* ── Dashboard Page ─────────────────────────────────────────── */
export function DashboardPage({ ganttData, materialsData, alertsData, masterData, statusData }) {
    const [selectedRun, setSelectedRun] = useState(null)
    const [filteredMaterials, setFilteredMaterials] = useState(null)
    const [filteredAlerts, setFilteredAlerts] = useState(null)

    // Re-fetch segment-specific data when run selection changes
    useEffect(() => {
        if (selectedRun === null) {
            setFilteredMaterials(materialsData)
            setFilteredAlerts(alertsData)
            return
        }
        fetch(`/api/materials?segment=${selectedRun}`)
            .then(r => r.json()).then(setFilteredMaterials).catch(() => {})
        fetch(`/api/alerts?segment=${selectedRun}`)
            .then(r => r.json()).then(setFilteredAlerts).catch(() => {})
    }, [selectedRun])

    // Sync when parent props update (new upload resets to all-runs view)
    useEffect(() => {
        if (selectedRun === null) {
            setFilteredMaterials(materialsData)
            setFilteredAlerts(alertsData)
        }
    }, [materialsData, alertsData])

    const segments = ganttData?.segments ?? []
    const activeMaterials = filteredMaterials ?? materialsData
    const activeAlerts = filteredAlerts ?? alertsData

    return (
        <ErrorBoundary>
            <div style={{
                padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20,
                maxWidth: 1700, margin: '0 auto'
            }}>

                {/* ── Run filter pills ── */}
                {segments.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: '0.1em', marginRight: 4, fontFamily: 'var(--font-display)' }}>RUN FILTER</span>
                        {[null, ...segments].map(run => {
                            const active = selectedRun === run
                            return (
                                <button
                                    key={run ?? 'all'}
                                    onClick={() => setSelectedRun(run)}
                                    style={{
                                        padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
                                        border: `1px solid ${active ? 'var(--brand-orange)' : 'rgba(255,255,255,0.1)'}`,
                                        color: active ? 'var(--brand-orange)' : '#64748B',
                                    }}
                                >
                                    {run === null ? 'All Runs' : `Run ${run}`}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Row 1: Live Telemetry — full width */}
                <RunningNowCard ganttData={ganttData} />

                {/* Row 2: Materials (2/3) + Anomalies (1/3) */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                    <MaterialsTable materialsData={activeMaterials} />
                    <AlertsCard alertsData={activeAlerts} />
                </div>

                {/* Row 3: Trajectory Variance — full width */}
                <PlanVsActualCard alertsData={activeAlerts} masterData={masterData} />
            </div>
        </ErrorBoundary>
    )
}
