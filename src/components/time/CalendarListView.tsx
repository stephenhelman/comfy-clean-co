'use client'

import { useState, useEffect, useRef } from 'react'
import { addDays, isSameDay, format } from 'date-fns'
import CalendarDayHeader from './CalendarDayHeader'
import CalendarJobTile from './CalendarJobTile'
import CalendarJobModal from './CalendarJobModal'
import { type CalendarAssignment } from './calendarUtils'

interface CalendarListViewProps {
  assignments: CalendarAssignment[]
  today: Date
  rangeStart: Date
  rangeEnd: Date
  // PC-14: scroll position ref lives in CalendarClient (persists across view switches)
  scrollPositionRef: React.MutableRefObject<number>
  // When a day tile is tapped and we want to navigate there (used by week/month views)
  targetDate?: Date | null
}

export default function CalendarListView({
  assignments,
  today,
  rangeStart,
  rangeEnd,
  scrollPositionRef,
  targetDate,
}: CalendarListViewProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<CalendarAssignment | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  // Build the 61-day array
  const days: Date[] = []
  let cursor = new Date(rangeStart)
  while (cursor <= rangeEnd) {
    days.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }

  // Group assignments by date string
  const byDate = new Map<string, CalendarAssignment[]>()
  for (const a of assignments) {
    const key = format(new Date(a.job.scheduledAt), 'yyyy-MM-dd')
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(a)
  }

  useEffect(() => {
    if (!containerRef.current) return

    if (targetDate) {
      // Jump to a specific date (from week/month tap)
      const id = `calendar-day-${format(targetDate, 'yyyy-MM-dd')}`
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
      return
    }

    // Restore saved scroll position (returning to this tab)
    if (!hasRestoredScroll.current) {
      hasRestoredScroll.current = true
      if (scrollPositionRef.current > 0) {
        containerRef.current.scrollTop = scrollPositionRef.current
        return
      }
      // First visit — scroll to today
      const todayEl = document.getElementById('calendar-day-today')
      if (todayEl) todayEl.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  }, [scrollPositionRef, targetDate])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    scrollPositionRef.current = e.currentTarget.scrollTop
  }

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pb-4"
      >
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const isToday = isSameDay(day, today)
          const dayAssignments = byDate.get(dateKey) ?? []

          // Sort by scheduledAt within the day
          const sorted = [...dayAssignments].sort(
            (a, b) =>
              new Date(a.job.scheduledAt).getTime() - new Date(b.job.scheduledAt).getTime(),
          )

          return (
            <div key={dateKey}>
              <CalendarDayHeader
                date={day}
                now={today}
                id={isToday ? 'calendar-day-today' : `calendar-day-${dateKey}`}
              />
              <div className="space-y-2 mb-1">
                {sorted.map(a => (
                  <CalendarJobTile
                    key={a.id}
                    assignment={a}
                    now={today}
                    onTap={() => setSelectedAssignment(a)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedAssignment && (
        <CalendarJobModal
          assignment={selectedAssignment}
          now={today}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </>
  )
}
