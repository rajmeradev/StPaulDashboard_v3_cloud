function AlertCenter({ data }) {
  if (!data) return null

  const Alert = ({ icon, color, text }) => (
    <div className={`flex items-center gap-2 py-2 px-3 rounded ${color}`}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  )

  const alerts = []

  // Line 1 alerts
  if (data.line1.overlapDetected) {
    alerts.push({ icon: '🔴', color: 'bg-red-100 text-red-800', text: 'Overlap detected — Line 1' })
  }
  if (!data.line1.cipScheduled) {
    alerts.push({ icon: '🔴', color: 'bg-red-100 text-red-800', text: 'No CIP scheduled — Line 1' })
  }
  if (data.line1.exceedsCIPLimit) {
    alerts.push({ icon: '🟡', color: 'bg-yellow-100 text-yellow-800', text: 'Exceeds CIP limit — Line 1' })
  }
  if (data.line1.activeOverrides > 0) {
    alerts.push({ icon: '🟡', color: 'bg-yellow-100 text-yellow-800', text: `${data.line1.activeOverrides} Override(s) Active — Line 1` })
  }

  // Line 2 alerts
  if (data.line2.overlapDetected) {
    alerts.push({ icon: '🔴', color: 'bg-red-100 text-red-800', text: 'Overlap detected — Line 2' })
  }
  if (!data.line2.cipScheduled) {
    alerts.push({ icon: '🔴', color: 'bg-red-100 text-red-800', text: 'No CIP scheduled — Line 2' })
  }
  if (data.line2.exceedsCIPLimit) {
    alerts.push({ icon: '🟡', color: 'bg-yellow-100 text-yellow-800', text: 'Exceeds CIP limit — Line 2' })
  }
  if (data.line2.activeOverrides > 0) {
    alerts.push({ icon: '🟡', color: 'bg-yellow-100 text-yellow-800', text: `${data.line2.activeOverrides} Override(s) Active — Line 2` })
  }

  // If no alerts, show all clear
  if (alerts.length === 0) {
    alerts.push({ icon: '✅', color: 'bg-green-100 text-green-800', text: 'All systems normal' })
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-3">Alert Center</h2>
      <div className="space-y-2">
        {alerts.map((alert, idx) => (
          <Alert key={idx} {...alert} />
        ))}
      </div>
    </div>
  )
}

export default AlertCenter
