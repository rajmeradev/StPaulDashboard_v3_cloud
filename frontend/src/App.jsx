import { useEffect, useCallback, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { useWebSocket } from './hooks/useWebSocket'
import { useApiData } from './hooks/useApiData'
import { AppShell } from './components/AppShell'
import { GanttPage } from './pages/GanttPage'
import { DashboardPage } from './pages/DashboardPage'
import { UploadScreen } from './components/UploadScreen'

export default function App() {
  // null = checking, false = not loaded, true = loaded
  const [dataLoaded, setDataLoaded] = useState(null)

  // Check if data is loaded on mount
  useEffect(() => {
    fetch('/api/is-loaded')
      .then(r => r.json())
      .then(d => setDataLoaded(d.loaded))
      .catch(() => setDataLoaded(false))
  }, [])

  const {
    gantt, materials, alerts, master, status,
    isLive, lastRefreshed, fetchData, wsStatus, setWsStatus,
  } = useApiData('connecting')

  const handleWsMessage = useCallback(() => {
    fetchData()
    setDataLoaded(true)
  }, [fetchData])

  const actualWsStatus = useWebSocket(handleWsMessage)

  useEffect(() => {
    setWsStatus(actualWsStatus)
  }, [actualWsStatus, setWsStatus])

  function handleUploadSuccess() {
    setDataLoaded(true)
    setTimeout(fetchData, 300)
  }

  // Still checking
  if (dataLoaded === null) {
    return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#080F1D",color:"#475569",fontSize:14}}>Loading...</div>
  }

  // No data uploaded yet
  if (!dataLoaded) {
    return <UploadScreen onUploadSuccess={handleUploadSuccess} />
  }

  return (
    <AppShell
      wsStatus={actualWsStatus}
      isLive={isLive}
      lastRefreshed={lastRefreshed}
      onReupload={() => setDataLoaded(false)}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/gantt" replace />} />
        <Route path="/gantt" element={<GanttPage ganttData={gantt} />} />
        <Route path="/dashboard" element={
          <DashboardPage
            ganttData={gantt}
            materialsData={materials}
            alertsData={alerts}
            masterData={master}
            statusData={status}
          />
        } />
      </Routes>
    </AppShell>
  )
}
