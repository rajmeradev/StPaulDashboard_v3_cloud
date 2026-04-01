import { useEffect, useRef } from 'react'
import { Timeline } from 'vis-timeline/standalone'
import { DataSet } from 'vis-data'
import 'vis-timeline/styles/vis-timeline-graph2d.css'

/**
 * GanttChart — V4 segment-aware Gantt using vis-timeline.
 *
 * Each production segment gets its own lane (nested under its line),
 * so segments that share an absolute-time anchor (e.g. when Excel col H
 * restart times are not yet populated) don't stack on top of each other.
 *
 * Break rows (type="break") are skipped as vis-timeline items — they have
 * no valid startTime/endTime. Their position is implicit from the gap
 * between segment lanes.
 */
function GanttChart({ data }) {
  const timelineRef      = useRef(null)
  const timelineInstance = useRef(null)

  useEffect(() => {
    if (!data || !timelineRef.current) return

    const items  = new DataSet()
    const groups = new DataSet()

    // Build groups: one top-level group per line, one nested group per segment.
    // If a line has only one segment (or no segment data), fall back to a flat group.
    data.lines.forEach(line => {
      // Collect segments present on this line (from tasks, not from data.segments)
      const segSet = new Set()
      line.tasks.forEach(t => {
        if (!t.isBreak && t.segment != null) segSet.add(t.segment)
      })
      const segs = [...segSet].sort((a, b) => a - b)

      if (segs.length <= 1) {
        // Single segment or no segments — flat group
        groups.add({ id: line.id, content: line.label })
      } else {
        // Multiple segments — nested groups
        const nestedIds = segs.map(s => `${line.id}-seg${s}`)
        groups.add({
          id:           line.id,
          content:      line.label,
          nestedGroups: nestedIds,
          showNested:   true,
        })
        segs.forEach(s => {
          groups.add({
            id:      `${line.id}-seg${s}`,
            content: `Run ${s}`,
          })
        })
      }
    })

    // Build items — skip break rows entirely (no valid time window)
    data.lines.forEach(line => {
      const segSet = new Set()
      line.tasks.forEach(t => {
        if (!t.isBreak && t.segment != null) segSet.add(t.segment)
      })
      const multiSeg = segSet.size > 1

      line.tasks.forEach(task => {
        // Skip break dividers and any task with missing times
        if (task.isBreak || !task.startTime || !task.endTime) return

        const start = new Date(task.startTime)
        const end   = new Date(task.endTime)

        // Skip zero-duration tasks (stale cache rows) — they can't be rendered
        if (start.getTime() === end.getTime()) return

        const groupId = multiSeg && task.segment != null
          ? `${line.id}-seg${task.segment}`
          : line.id

        const label = task.type === 'cip' || task.type === 'flush' || task.type === 'downtime'
          ? task.sku
          : task.sku

        items.add({
          id:      task.id,
          group:   groupId,
          content: `<span style="font-size:11px;font-weight:600">${label}</span>`,
          start,
          end,
          style: [
            `background-color: ${task.color}`,
            'border: none',
            task.type === 'cip' || task.type === 'downtime' || task.type === 'flush'
              ? 'opacity:0.7'
              : '',
            task.hasOverride ? 'outline: 2px solid #F59E0B' : '',
          ].filter(Boolean).join(';'),
          title: [
            `<b>${task.sku}</b>`,
            task.cases  ? `Cases: ${task.cases}`  : null,
            task.gallons ? `Gallons: ${task.gallons.toLocaleString()}` : null,
            task.segment != null ? `Run: ${task.segment}` : null,
            task.recipeLabel ? `Recipe: ${task.recipeLabel}` : null,
            task.hasOverride ? '⚠ Override active' : null,
            `${task.startTime?.slice(0,16).replace('T',' ')} → ${task.endTime?.slice(0,16).replace('T',' ')}`,
          ].filter(Boolean).join('<br>'),
          className: task.type,
        })
      })
    })

    const scheduleStart = new Date(data.scheduleStartLine1 || data.scheduleStart)
    const scheduleEnd   = new Date(scheduleStart.getTime() + data.horizonHours * 3600 * 1000)

    const options = {
      width:           '100%',
      height:          '100%',
      margin:          { item: { horizontal: 0, vertical: 3 }, axis: 5 },
      orientation:     'top',
      showCurrentTime: true,
      start:           scheduleStart,
      end:             scheduleEnd,
      zoomMin:         1000 * 60 * 60 * 2,   // 2 hours
      zoomMax:         1000 * 60 * 60 * 120,  // 5 days
      stack:           false,   // tasks within same group don't auto-stack
      groupOrder:      'id',
      tooltip:         { followMouse: true, overflowMethod: 'cap' },
    }

    if (!timelineInstance.current) {
      timelineInstance.current = new Timeline(timelineRef.current, items, groups, options)
    } else {
      timelineInstance.current.setItems(items)
      timelineInstance.current.setGroups(groups)
      timelineInstance.current.setOptions(options)
    }

    const interval = setInterval(() => {
      timelineInstance.current?.setCurrentTime(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [data])

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">Production Schedule — Gantt</h2>
      {data?.segments?.length > 1 && (
        <p className="text-xs text-gray-500 mb-3">
          {data.segments.length} production runs detected.
          Each run is shown as a separate lane. Populate col H on break rows in Excel
          to set independent restart times per run.
        </p>
      )}
      <div ref={timelineRef} style={{ minHeight: 300 }} />
    </div>
  )
}

export default GanttChart
