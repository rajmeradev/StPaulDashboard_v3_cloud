import React from 'react'

/**
 * Catches runtime errors in child components and shows a clean fallback
 * instead of a white screen. Essential for a sponsor demo.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info)
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '200px', padding: '32px'
            }}>
                <div className="card" style={{ maxWidth: 480, padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                    <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>
                        Component Error
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
                        {this.state.error?.message || 'Unknown error'}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            background: 'var(--blue-brand)', color: '#fff',
                            border: 'none', borderRadius: 6, padding: '8px 20px',
                            cursor: 'pointer', fontSize: 13, fontWeight: 600
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }
}
