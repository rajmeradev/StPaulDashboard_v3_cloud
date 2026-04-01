function PlanVsActual({ ganttData, masterData }) {
  if (!ganttData || !masterData) return null

  const calculateVariance = (line, baselineEndHrs) => {
    const tasks = line.tasks
    if (!tasks || tasks.length === 0) return null

    // Find max end time
    const maxEndHr = Math.max(...tasks.map(t => {
      const scheduleStart = new Date(ganttData.scheduleStart)
      const endTime = new Date(t.endTime)
      return (endTime - scheduleStart) / (1000 * 60 * 60) // hours
    }))

    const variance = maxEndHr - baselineEndHrs
    return variance
  }

  const line1Variance = calculateVariance(ganttData.lines[0], masterData.line1BaselineEndHrs)
  const line2Variance = calculateVariance(ganttData.lines[1], masterData.line2BaselineEndHrs)

  const VarianceRow = ({ label, variance }) => {
    if (variance === null) return (
      <div className="py-2">
        <span className="font-medium">{label}:</span> —
      </div>
    )

    const isAhead = variance < 0
    const color = isAhead ? 'text-green-600' : 'text-red-600'
    const text = isAhead
      ? `${Math.abs(variance).toFixed(1)} hrs ahead`
      : `${variance.toFixed(1)} hrs behind`

    return (
      <div className="py-2">
        <span className="font-medium">{label}:</span>
        <span className={`ml-2 ${color}`}>{text}</span>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-3">Plan vs Actual</h2>
      <div className="text-sm">
        <VarianceRow label="Line 1" variance={line1Variance} />
        <VarianceRow label="Line 2" variance={line2Variance} />
      </div>
    </div>
  )
}

export default PlanVsActual
