import { useState, useEffect } from 'react'

function RunningNow({ data }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  if (!data) return null

  const findRunningTask = (line) => {
    if (!line.tasks || line.tasks.length === 0) return null

    const now = currentTime
    return line.tasks.find(task => {
      const start = new Date(task.startTime)
      const end = new Date(task.endTime)
      return now >= start && now < end
    })
  }

  const line1Running = findRunningTask(data.lines[0])
  const line2Running = findRunningTask(data.lines[1])

  const TaskDisplay = ({ label, task }) => (
    <div className="py-2">
      <span className="font-medium">{label}:</span>
      {task ? (
        <div className="mt-1 text-sm">
          <div className="truncate">{task.sku}</div>
          <div className="text-gray-600">{task.cases} cases</div>
        </div>
      ) : (
        <div className="mt-1 text-sm text-gray-500">— idle —</div>
      )}
    </div>
  )

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-3">Running Now</h2>
      <div className="text-sm">
        <TaskDisplay label="Line 1" task={line1Running} />
        <TaskDisplay label="Line 2" task={line2Running} />
      </div>
    </div>
  )
}

export default RunningNow
