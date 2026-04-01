import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'

/* ─── Colour palette — brand-grouped, matches Excel Production Gantt legend ── */
const SKU_COLORS = {
    // OV Whole Milk — blue
    'OV-MILK ORG WH ESL 6-HG CTN BX':  { bg: '#1e3a5f', fg: '#93C5FD', border: '#3B82F6' },
    'OV-MILK ORG WH SP 6-HG CTN BX':   { bg: '#1e3a5f', fg: '#93C5FD', border: '#3B82F6' },
    'OV-MILK ORG WH LAC 6-HG CTN BX':  { bg: '#1a3550', fg: '#7DD3FC', border: '#0EA5E9' },
    'OV-MILK ORG WY-D GRS 6HG CTNBX':  { bg: '#1a3550', fg: '#7DD3FC', border: '#0EA5E9' },
    // OV Skim — green
    'OV-MILK ORG SK 6-HG CTN BX':      { bg: '#14402d', fg: '#86EFAC', border: '#22C55E' },
    'OV-MILK ORG SK LAC 6HG CTN BX':   { bg: '#0f3322', fg: '#6EE7B7', border: '#10B981' },
    'OV-MILK ORG SK 12-QT CTN BX':     { bg: '#14402d', fg: '#86EFAC', border: '#22C55E' },
    // OV 1%/2%/Fat — yellow
    'OV-MILK ORG 2% 6-HG CTN BX':      { bg: '#3b2f07', fg: '#FDE047', border: '#EAB308' },
    'OV-MILK ORG 2% FT 12-QT CTN BX':  { bg: '#3b2f07', fg: '#FDE047', border: '#EAB308' },
    'OV-MILK ORG 1% 6-HG CTN BX':      { bg: '#3a2a06', fg: '#FCD34D', border: '#D97706' },
    'OV-MILK ORG 1% FT 12-QT CTN BX':  { bg: '#3a2a06', fg: '#FCD34D', border: '#D97706' },
    'OV-MILK ORG 1%CH LAC 6HG CTNBX':  { bg: '#3a2a06', fg: '#FCD34D', border: '#D97706' },
    'OV-MILK ORG 2% LAC 6-HG CTN BX':  { bg: '#3b2f07', fg: '#FDE047', border: '#EAB308' },
    'OV-MILK ORG WH 3.5% 12QT CTNBX':  { bg: '#3d1a06', fg: '#FDBA74', border: '#F97316' },
    // OV H&H / Cream — orange
    'OV-H&H ORG 12-QTCTN BX':          { bg: '#3d1a06', fg: '#FDBA74', border: '#F97316' },
    'OV-H&H ORG LAC 12-QT CTN BX':     { bg: '#3d1a06', fg: '#FB923C', border: '#EA580C' },
    'OV-MILK ORG WY-D CRS 6-59CTNBX':  { bg: '#3d1a06', fg: '#FDBA74', border: '#F97316' },
    // TJ Products — indigo/purple
    'TJ-H&H ORG 12-PT CTN BX':         { bg: '#2e1a4a', fg: '#C4B5FD', border: '#8B5CF6' },
    'TJ-H&H ORG 12-QT CTN BX':         { bg: '#2a1642', fg: '#A78BFA', border: '#7C3AED' },
    'TJ-HVY CRM ORG 12-PT CTN BX':     { bg: '#2e1a4a', fg: '#DDD6FE', border: '#A78BFA' },
    // CV Products — teal
    'CV-MILK 2% LAC 6-HG CTN BX':      { bg: '#0d3330', fg: '#5EEAD4', border: '#14B8A6' },
    'CV-MILK WH LAC 6HG CTN BX':       { bg: '#0a2e2b', fg: '#2DD4BF', border: '#0D9488' },
    'CV-H&H 6-QT CTN BX':              { bg: '#0a2e2b', fg: '#34D399', border: '#059669' },
    'CV-MILK 2% CH LAC 6-59 CTN BX':   { bg: '#0d3330', fg: '#6EE7B7', border: '#10B981' },
    'CV-NOG UP 6-QT CTN BX':           { bg: '#0a2e2b', fg: '#34D399', border: '#059669' },
    // KEMPS Products — amber
    'KEMPS-MILK WH LAC 6-HG CTN BX':   { bg: '#3b2500', fg: '#FCD34D', border: '#F59E0B' },
    'KEMPS-MILK 296 LAC 6-HG CTN BX':  { bg: '#3b2500', fg: '#FBBF24', border: '#D97706' },
    'KEMPS-MILK PUMPKIN 12-QT CTNBX':  { bg: '#3a1c00', fg: '#FB923C', border: '#EA580C' },
    'KEMPS-NOG VAN 12-QT CTN BX':      { bg: '#3a1c00', fg: '#FDBA74', border: '#C2410C' },
    'KEMPS-NOG CINN 12-QT CTN BX':     { bg: '#3a1c00', fg: '#F97316', border: '#9A3412' },
    'KEMPS-MILK PEP MOCHA 12QTCTNBX':  { bg: '#2a1500', fg: '#D97706', border: '#78350F' },
    // DNKN Products — mocha/lavender
    'DNKN-MILK COFFEE 6-HG CTN BX':    { bg: '#2d1a3a', fg: '#E9D5FF', border: '#A855F7' },
    'DNKN-MILK CEREAL 6-HG CTN 8X':    { bg: '#2d1a3a', fg: '#D8B4FE', border: '#9333EA' },
    // 365 Products — lime green
    '365-MILK ORG SK 12-QT CTN BOX':   { bg: '#1a3a1a', fg: '#86EFAC', border: '#4ADE80' },
    '365-MILK ORG WH3.5% 12QT CTNBX':  { bg: '#1a3a1a', fg: '#4ADE80', border: '#22C55E' },
    '365-MILK ORG 2% FT 12-QT CTNBX':  { bg: '#143314', fg: '#34D399', border: '#16A34A' },
    '365-MILK ORG 1% FT 12-QT CTNBX':  { bg: '#143314', fg: '#6EE7B7', border: '#15803D' },
    // Special types
    cip:      { bg: '#3b0e0e', fg: '#FCA5A5', border: '#EF4444' },
    flush:    { bg: '#0c2a3d', fg: '#7DD3FC', border: '#0EA5E9' },
    downtime: { bg: '#1c1c2c', fg: '#CBD5E1', border: '#475569' },
    default:  { bg: '#2a1b4d', fg: '#C4B5FD', border: '#8B5CF6' },
}

function getColor(task) {
    if (task.type === 'cip') return SKU_COLORS.cip
    if (task.type === 'flush') return SKU_COLORS.flush
    if (task.type === 'downtime') return SKU_COLORS.downtime
    return SKU_COLORS[task.sku] || SKU_COLORS.default
}

/* ─── Equipment Rows ─────────────────────────────────────────────────
   One row per processing line — no redundant equipment duplicates.    */
const EQUIPMENT = [
    { type: 'row', id: 'line1', label: 'LINE 1 (EH)',  line: 'line1', accent: '#0891B2' },
    { type: 'row', id: 'line2', label: 'LINE 2 (TR7)', line: 'line2', accent: '#10B981' },
]

const AXIS_H  = 40   // time axis height
const LABEL_W = 180

/* ─── Task Detail Panel ─────────────────────────────────────────────── */
function TaskPanel({ task, onClose }) {
    if (!task) return null
    const c = getColor(task)
    const start = new Date(task.startTime)
    const end = new Date(task.endTime)
    const durH = ((end - start) / 3_600_000).toFixed(1)
    const now = new Date()
    const status = end < now ? 'COMPLETED' : start > now ? 'QUEUED' : 'RUNNING'

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 999,
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#0A1628', border: `1px solid ${c.border}`,
                    borderRadius: 12, width: 420, overflow: 'hidden',
                    boxShadow: `0 0 40px ${c.border}33, 0 20px 60px rgba(0,0,0,0.6)`,
                }}
            >
                <div style={{ height: 4, background: c.border }} />
                <div style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: c.fg, marginBottom: 4 }}>
                                {task.lineLabel} · TASK #{task.id}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1.3 }}>
                                {task.sku || task.type?.toUpperCase()}
                            </div>
                        </div>
                        <span style={{
                            padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                            background: status === 'RUNNING' ? '#14402d' : status === 'QUEUED' ? 'rgba(13,117,140,0.15)' : '#1c1c2c',
                            color: status === 'RUNNING' ? '#86EFAC' : status === 'QUEUED' ? 'var(--brand-teal-light)' : '#94A3B8',
                            border: `1px solid ${status === 'RUNNING' ? '#22C55E33' : status === 'QUEUED' ? 'rgba(13,117,140,0.4)' : '#47556933'}`,
                            alignSelf: 'flex-start',
                        }}>
                            {status}
                        </span>
                    </div>

                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: '10px 20px', background: '#050D1A', borderRadius: 8,
                        padding: 16, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 20,
                    }}>
                        {[
                            ['Start', start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })],
                            ['End', end.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })],
                            ['Duration', `${durH} hrs`],
                            ['Cases', task.cases?.toLocaleString() ?? '—'],
                            ['Gallons', task.gallons?.toLocaleString() ?? '—'],
                            ['Type', task.type?.toUpperCase() ?? 'PROD'],
                        ].map(([k, v]) => (
                            <div key={k}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                                <div style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'JetBrains Mono, monospace' }}>{v}</div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '10px 0',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ─── Pure-CSS Gantt Chart ──────────────────────────────────────────── */
function GanttChart({ ganttData, pxPerHour, onSelectTask }) {
    const [now, setNow] = useState(new Date())
    const scrollRef = useRef(null)
    const containerRef = useRef(null)
    const [containerH, setContainerH] = useState(500)

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    // Measure container height to compute dynamic row height
    useEffect(() => {
        if (!containerRef.current) return
        const ro = new ResizeObserver(([entry]) => {
            setContainerH(entry.contentRect.height)
        })
        ro.observe(containerRef.current)
        return () => ro.disconnect()
    }, [])

    // Dynamic row height — fills available space, min 120px
    const ROW_H = Math.max(120, Math.floor((containerH - AXIS_H) / EQUIPMENT.length))

    const scheduleStart = useMemo(() => new Date(ganttData.scheduleStart), [ganttData])

    const totalHours = useMemo(() => {
        let maxMs = 24 * 3_600_000
        ganttData.lines.forEach(l => l.tasks.forEach(t => {
            const endMs = new Date(t.endTime) - scheduleStart
            if (endMs > maxMs) maxMs = endMs
        }))
        return Math.ceil(maxMs / 3_600_000) + 6
    }, [ganttData, scheduleStart])

    const scheduleByLine = useMemo(() => {
        const m = {}
        ganttData.lines.forEach(l => { m[l.id] = l.tasks })
        return m
    }, [ganttData])

    const nowHrs = (now - scheduleStart) / 3_600_000

    useEffect(() => {
        if (scrollRef.current && nowHrs > 0) {
            const containerWidth = scrollRef.current.clientWidth
            const targetScroll = (nowHrs * pxPerHour) - (containerWidth / 2)
            scrollRef.current.scrollLeft = Math.max(0, targetScroll)
        }
    }, [pxPerHour])

    const totalH = EQUIPMENT.length * ROW_H

    const tickInterval = pxPerHour > 80 ? 2 : pxPerHour < 30 ? 12 : 4
    const ticks = []
    for (let h = 0; h <= totalHours; h += tickInterval) {
        const d = new Date(scheduleStart.getTime() + h * 3_600_000)
        ticks.push({
            hr: h,
            label: d.toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }),
        })
    }

    return (
        <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {/* Label sidebar */}
            <div style={{
                width: LABEL_W, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(6,11,20,0.9)', overflowY: 'hidden', zIndex: 20, position: 'relative',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Axis header spacer */}
                <div style={{ height: AXIS_H, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,11,20,0.98)' }} />
                {EQUIPMENT.map((eq, i) => {
                    const tasks = scheduleByLine[eq.line] || []
                    const prodTasks = tasks.filter(t => !t.isBreak && t.type === 'production' && t.startTime && t.endTime)
                    const completedTasks = prodTasks.filter(t => new Date(t.endTime) < now)
                    const completedPct = prodTasks.length > 0 ? (completedTasks.length / prodTasks.length) * 100 : 0
                    const totalCases = prodTasks.reduce((acc, t) => acc + (t.cases || 0), 0)
                    const isOdd = i % 2 === 1
                    return (
                        <div key={i} style={{
                            height: ROW_H, flexShrink: 0,
                            display: 'flex', flexDirection: 'column', justifyContent: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: isOdd ? 'rgba(255,255,255,0.012)' : 'transparent',
                            position: 'relative', overflow: 'hidden', padding: '0 14px 0 18px',
                        }}>
                            {/* Accent left stripe */}
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: eq.accent }} />

                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#E2E8F0', letterSpacing: '0.04em', lineHeight: 1 }}>
                                {eq.label}
                            </div>
                            <div style={{ fontSize: 10, color: '#475569', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
                                {prodTasks.length} SKUs
                                {totalCases > 0 && <span style={{ color: '#334155', marginLeft: 6 }}>· {totalCases.toLocaleString()} cs</span>}
                            </div>

                            {/* Schedule completion progress bar */}
                            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginTop: 10, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 2,
                                    width: `${completedPct}%`,
                                    background: eq.accent,
                                    transition: 'width 1s ease',
                                    boxShadow: `0 0 6px ${eq.accent}88`,
                                }} />
                            </div>
                            <div style={{ fontSize: 9, color: '#334155', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                                {completedPct.toFixed(0)}% complete
                            </div>

                        </div>
                    )
                })}
            </div>

            {/* Scrollable chart area */}
            <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative', scrollBehavior: 'smooth' }}>
                <div style={{ width: `${totalHours * pxPerHour}px`, position: 'relative' }}>

                    {/* Time axis */}
                    <div style={{
                        height: AXIS_H, position: 'sticky', top: 0, zIndex: 10,
                        background: 'rgba(6,11,20,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        {ticks.map((t, i) => (
                            <div key={i} style={{
                                position: 'absolute', left: `${t.hr * pxPerHour}px`,
                                top: 0, height: '100%',
                                borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: 7,
                                display: 'flex', alignItems: 'center',
                            }}>
                                <span style={{ fontSize: 9, color: '#4B6070', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                    {t.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Row grid + task blocks */}
                    <div style={{ position: 'relative', height: totalH }}>
                        {/* Hour grid lines */}
                        {ticks.map((t, i) => (
                            <div key={i} style={{
                                position: 'absolute', top: 0, bottom: 0, left: `${t.hr * pxPerHour}px`,
                                width: 1, background: 'rgba(255,255,255,0.025)',
                            }} />
                        ))}

                        {/* Row backgrounds + sub-lane dividers + task bars */}
                        {(() => {
                            const rows = []
                            let y = 0
                            EQUIPMENT.forEach((eq, ei) => {
                                const isOdd = ei % 2 === 1

                                // Row stripe background
                                rows.push(
                                    <div key={`bg-${ei}`} style={{
                                        position: 'absolute', left: 0, right: 0, top: y, height: ROW_H,
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: isOdd ? 'rgba(255,255,255,0.01)' : 'transparent',
                                    }} />
                                )

                                const tasks = scheduleByLine[eq.line] || []
                                tasks.forEach((task, ti) => {
                                    if (task.isBreak || !task.startTime || !task.endTime) return
                                    const tStart = new Date(task.startTime)
                                    const tEnd = new Date(task.endTime)
                                    const startHr = (tStart - scheduleStart) / 3_600_000
                                    const endHr = (tEnd - scheduleStart) / 3_600_000
                                    const widthHr = endHr - startHr
                                    if (widthHr <= 0) return

                                    const c = getColor(task)
                                    const durLabel = widthHr.toFixed(1) + 'h'
                                    const isUtility = task.type !== 'production'
                                    const isRunning = tStart <= now && tEnd >= now

                                    // All tasks in one lane
                                    const barH = ROW_H - 12
                                    const barTop = y + 6

                                    const minWidthForText = 44

                                    rows.push(
                                        <div
                                            key={`${eq.id}-${ti}`}
                                            onClick={() => onSelectTask({ ...task, lineLabel: eq.label })}
                                            style={{
                                                position: 'absolute', top: barTop, height: barH,
                                                left: `${startHr * pxPerHour}px`,
                                                width: `${Math.max(widthHr * pxPerHour - 2, 2)}px`,
                                                background: c.bg,
                                                borderTop: `2px solid ${c.border}`,
                                                borderRight: `1px solid ${c.border}33`,
                                                borderBottom: `1px solid ${c.border}33`,
                                                borderLeft: `3px solid ${c.border}`,
                                                borderRadius: '0 4px 4px 0',
                                                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                                padding: '0 9px',
                                                cursor: 'pointer', overflow: 'hidden', boxSizing: 'border-box',
                                                transition: 'filter 0.12s, box-shadow 0.12s',
                                                boxShadow: isRunning ? `0 0 12px ${c.border}55, inset 0 0 20px ${c.border}11` : 'none',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.filter = 'brightness(1.4)'
                                                e.currentTarget.style.boxShadow = `0 0 16px ${c.border}66`
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.filter = 'brightness(1)'
                                                e.currentTarget.style.boxShadow = isRunning ? `0 0 12px ${c.border}55` : 'none'
                                            }}
                                        >
                                            {widthHr * pxPerHour >= minWidthForText && (
                                                <>
                                                    <span style={{
                                                        fontSize: isUtility ? 9 : 11, fontWeight: 700, color: c.fg,
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        lineHeight: 1.2,
                                                        fontFamily: isUtility ? 'var(--font-mono)' : 'var(--font-display)',
                                                        letterSpacing: isUtility ? '0.05em' : '0.02em',
                                                    }}>
                                                        {isUtility ? task.type?.toUpperCase() : (task.sku || task.type?.toUpperCase())}
                                                    </span>
                                                    {widthHr * pxPerHour >= 80 && (
                                                        <span style={{
                                                            fontSize: 9, color: c.fg, opacity: 0.6,
                                                            whiteSpace: 'nowrap', marginTop: 4,
                                                            fontFamily: 'var(--font-mono)',
                                                        }}>
                                                            {durLabel}{task.cases ? ` · ${task.cases.toLocaleString()} cs` : ''}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )
                                })
                                y += ROW_H
                            })

                            // NOW cursor line + label flag
                            if (nowHrs >= 0 && nowHrs <= totalHours) {
                                const xPx = nowHrs * pxPerHour
                                rows.push(
                                    <div key="now-line" style={{
                                        position: 'absolute', top: 0, bottom: 0, left: `${xPx}px`,
                                        width: 2, background: '#F43F5E',
                                        boxShadow: '0 0 10px rgba(244,63,94,0.7)',
                                        pointerEvents: 'none', zIndex: 15,
                                    }} />
                                )
                                rows.push(
                                    <div key="now-flag" style={{
                                        position: 'absolute', top: 0, left: `${xPx - 1}px`,
                                        transform: 'translateX(-50%)',
                                        fontSize: 8, fontWeight: 700, color: '#F43F5E',
                                        background: '#1a060b', border: '1px solid rgba(244,63,94,0.5)',
                                        borderRadius: 3, padding: '2px 6px',
                                        pointerEvents: 'none', zIndex: 16, whiteSpace: 'nowrap',
                                        fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                                    }}>
                                        ▼ NOW
                                    </div>
                                )
                            }
                            return rows
                        })()}
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ─── Main Export ─────────────────────────────────────────────────── */
export function GanttPage({ ganttData }) {
    const [selectedTask, setSelectedTask] = useState(null)
    const [zoomLevel, setZoomLevel] = useState('24H')
    const [selectedRun, setSelectedRun] = useState(null) // null = "All"

    const ZOOM_SCALES = {
        '6H': 180,
        '12H': 90,
        '24H': 45,
        '72H': 15,
    }

    // Build a filtered + re-anchored ganttData for the selected run
    const filteredGanttData = useMemo(() => {
        if (!ganttData || selectedRun === null) return ganttData

        const filteredLines = ganttData.lines.map(line => ({
            ...line,
            tasks: line.tasks.filter(t => !t.isBreak && t.segment === selectedRun && t.startTime && t.endTime),
        }))

        // Find the earliest startTime in this run to re-anchor the time axis
        let runStart = null
        filteredLines.forEach(line => line.tasks.forEach(t => {
            const st = new Date(t.startTime)
            if (!runStart || st < runStart) runStart = st
        }))

        const anchor = runStart?.toISOString() ?? ganttData.scheduleStart
        return { ...ganttData, scheduleStart: anchor, scheduleStartLine1: anchor, lines: filteredLines }
    }, [ganttData, selectedRun])

    if (!ganttData) {
        return (
            <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 98px)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 32, height: 32, border: '3px solid var(--brand-teal-light)',
                        borderRightColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                    }} />
                    <div style={{ fontSize: 12, color: '#475569', letterSpacing: '0.06em' }}>
                        LOADING SCHEDULE...
                    </div>
                </div>
            </div>
        )
    }

    const start = new Date(ganttData.scheduleStart)
    const zoomKeys = ['6H', '12H', '24H', '72H']
    const segments = ganttData.segments ?? []

    return (
        <ErrorBoundary>
            <div style={{
                display: 'flex', flexDirection: 'column',
                height: 'calc(100vh - 98px)',
                padding: 12,
                gap: 0,
            }}>
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    background: '#0A1628',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                }}>

                    {/* ── Toolbar ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(6,11,20,0.8)', flexShrink: 0, flexWrap: 'wrap', gap: 8,
                    }}>
                        {/* Left: Zoom + Run filter */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Zoom buttons — segmented control style */}
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: 2, border: '1px solid rgba(255,255,255,0.07)' }}>
                            {zoomKeys.map(z => (
                                <button
                                    key={z}
                                    onClick={() => setZoomLevel(z)}
                                    style={{
                                        padding: '4px 13px', borderRadius: 5, fontSize: 11,
                                        fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
                                        cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                                        background: zoomLevel === z ? 'var(--brand-orange)' : 'transparent',
                                        color: zoomLevel === z ? '#fff' : '#4B6070',
                                        boxShadow: zoomLevel === z ? '0 2px 8px rgba(249,115,22,0.4)' : 'none',
                                    }}
                                >
                                    {z}
                                </button>
                            ))}
                            </div>

                            {/* Run filter — only shown when multiple segments exist */}
                            {segments.length > 1 && (
                                <>
                                    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
                                    {[null, ...segments].map(run => {
                                        const active = selectedRun === run
                                        return (
                                            <button
                                                key={run ?? 'all'}
                                                onClick={() => setSelectedRun(run)}
                                                style={{
                                                    padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                    background: active ? 'rgba(168,85,247,0.2)' : 'transparent',
                                                    border: `1px solid ${active ? '#A855F7' : 'rgba(255,255,255,0.1)'}`,
                                                    color: active ? '#C4B5FD' : '#64748B',
                                                }}
                                            >
                                                {run === null ? 'All Runs' : `Run ${run}`}
                                            </button>
                                        )
                                    })}
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 11, color: '#475569' }}>Scroll horizontally to view future schedule &gt;</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 2, height: 14, background: '#EF4444', boxShadow: '0 0 4px #EF4444' }} />
                                <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>NOW</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Gantt body ── */}
                    <GanttChart
                        ganttData={filteredGanttData}
                        pxPerHour={ZOOM_SCALES[zoomLevel]}
                        onSelectTask={setSelectedTask}
                    />

                    {/* ── Footer: legend + per-line stats ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 16px', borderTop: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(6,11,20,0.8)', flexShrink: 0, gap: 16, flexWrap: 'wrap',
                    }}>
                        {/* Brand legend */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            {[
                                ['OV Milk',   SKU_COLORS['OV-MILK ORG WH ESL 6-HG CTN BX']],
                                ['OV Skim',   SKU_COLORS['OV-MILK ORG SK 6-HG CTN BX']],
                                ['OV 2%',     SKU_COLORS['OV-MILK ORG 2% 6-HG CTN BX']],
                                ['TJ',        SKU_COLORS['TJ-H&H ORG 12-PT CTN BX']],
                                ['CV',        SKU_COLORS['CV-MILK 2% LAC 6-HG CTN BX']],
                                ['KEMPS',     SKU_COLORS['KEMPS-MILK WH LAC 6-HG CTN BX']],
                                ['DNKN',      SKU_COLORS['DNKN-MILK COFFEE 6-HG CTN BX']],
                                ['365',       SKU_COLORS['365-MILK ORG SK 12-QT CTN BOX']],
                                ['CIP',       SKU_COLORS.cip],
                                ['Flush',     SKU_COLORS.flush],
                                ['Downtime',  SKU_COLORS.downtime],
                            ].map(([label, c]) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 9, height: 9, borderRadius: 2, background: c.bg, border: `1px solid ${c.border}` }} />
                                    <span style={{ fontSize: 9, color: '#4B6070', fontFamily: 'var(--font-mono)' }}>{label}</span>
                                </div>
                            ))}
                        </div>
                        {/* Per-line quick stats */}
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            {EQUIPMENT.map(eq => {
                                const tasks = (filteredGanttData?.lines ?? []).find(l => l.id === eq.line)?.tasks ?? []
                                const prod = tasks.filter(t => !t.isBreak && t.type === 'production')
                                const cases = prod.reduce((a, t) => a + (t.cases || 0), 0)
                                return (
                                    <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: eq.accent }} />
                                        <span style={{ fontSize: 9, color: '#4B6070', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                                            {eq.label}: {prod.length} SKU{prod.length !== 1 ? 's' : ''}
                                            {cases > 0 && ` · ${cases.toLocaleString()} cs`}
                                        </span>
                                    </div>
                                )
                            })}
                            <span style={{ fontSize: 9, color: '#334155', fontFamily: 'var(--font-mono)' }}>
                                {selectedRun !== null ? `RUN ${selectedRun} · ` : ''}ZOOM: {zoomLevel}
                            </span>
                        </div>
                    </div>

                </div>
            </div>

            <TaskPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
        </ErrorBoundary>
    )
}
