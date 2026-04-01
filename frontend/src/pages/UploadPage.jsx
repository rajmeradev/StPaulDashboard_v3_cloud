import { useState, useRef } from 'react'

const API = import.meta.env.DEV ? 'http://localhost:8000' : ''

export function UploadPage({ onUploadSuccess }) {
    const [dragging, setDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const inputRef = useRef()

    async function handleFile(file) {
        if (!file) return
        if (!file.name.endsWith('.xlsx')) {
            setError('Please upload an .xlsx file.')
            return
        }
        setError(null)
        setUploading(true)
        try {
            const form = new FormData()
            form.append('file', file)
            const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Upload failed')
            onUploadSuccess(data)
        } catch (e) {
            setError(e.message)
        } finally {
            setUploading(false)
        }
    }

    function onDrop(e) {
        e.preventDefault()
        setDragging(false)
        handleFile(e.dataTransfer.files[0])
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', padding: 32,
            background: 'var(--bg)',
        }}>
            {/* Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
                <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 5 L10 18 C6 23 7 29 11 33 C15 37 25 37 29 33 C33 29 34 23 30 18 L20 5 Z" fill="var(--brand-teal)" />
                    <path d="M20 6.5 L12.5 18 C15 17 18 19 20 18 C23 17 26 18 27.5 18 L20 6.5 Z" fill="rgba(255,255,255,0.15)" />
                    <circle cx="29" cy="8" r="3" stroke="var(--brand-orange)" strokeWidth="2.5" fill="none" />
                </svg>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--brand-orange)', lineHeight: 1.1, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        St. Paul
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand-teal-light)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Beverage Solutions
                    </div>
                </div>
            </div>

            {/* Card */}
            <div style={{
                background: 'var(--surface)',
                borderRadius: 16,
                padding: '40px 48px',
                maxWidth: 520, width: '100%',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                border: '1px solid var(--border)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Top accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--brand-teal), var(--brand-orange))' }} />

                <h2 style={{
                    margin: '0 0 8px',
                    fontFamily: 'var(--font-display)',
                    fontSize: 26, fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                }}>
                    Upload Production Schedule
                </h2>
                <p style={{ margin: '0 0 32px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    Upload your <strong style={{ color: 'var(--text)' }}>St. Paul Production Tool</strong> Excel file to load the dashboard.
                    You can re-upload anytime to refresh the data.
                </p>

                {/* Drop zone */}
                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragging ? 'var(--brand-teal-light)' : 'rgba(255,255,255,0.12)'}`,
                        borderRadius: 12,
                        padding: '40px 24px',
                        cursor: uploading ? 'wait' : 'pointer',
                        background: dragging ? 'rgba(6,182,212,0.06)' : 'var(--bg-input)',
                        transition: 'all 0.2s',
                        marginBottom: 16,
                        boxShadow: dragging ? '0 0 20px rgba(6,182,212,0.1) inset' : 'none',
                    }}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".xlsx"
                        style={{ display: 'none' }}
                        onChange={e => handleFile(e.target.files[0])}
                    />
                    {uploading ? (
                        <div style={{ color: 'var(--brand-teal-light)', fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                            <div style={{ fontSize: 20, marginBottom: 8 }}>⟳</div>
                            Uploading and processing...
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: 32, marginBottom: 12, opacity: dragging ? 1 : 0.5 }}>📁</div>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700, fontSize: 18,
                                color: dragging ? 'var(--brand-teal-light)' : 'var(--text)',
                                marginBottom: 6,
                                letterSpacing: '0.03em',
                                textTransform: 'uppercase',
                                transition: 'color 0.2s',
                            }}>
                                {dragging ? 'Drop to load' : 'Drag & drop your Excel file here'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                or click to browse — .xlsx only
                            </div>
                        </>
                    )}
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(244,63,94,0.08)',
                        border: '1px solid rgba(244,63,94,0.25)',
                        borderRadius: 8, padding: '10px 14px',
                        color: 'var(--red)', fontSize: 13, fontWeight: 500,
                        fontFamily: 'var(--font-mono)',
                    }}>
                        ✕ {error}
                    </div>
                )}
            </div>
        </div>
    )
}
