'use client'

import { useState, useRef } from 'react'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  addDays,
  format,
  isSameDay,
  isWithinInterval,
  isBefore,
  isAfter,
} from 'date-fns'
import CalendarJobTile from './CalendarJobTile'
import CalendarJobModal from './CalendarJobModal'
import { type CalendarAssignment } from './calendarUtils'

interface CalendarWeekViewProps {
  assignments: CalendarAssignment[]
  today: Date
  rangeStart: Date
  rangeEnd: Date
  weekOffset: number
  onWeekOffsetChange: (offset: number) => void
  onDayTap: (date: Date) => void
}

export default function CalendarWeekView({
  assignments,
  today,
  rangeStart,
  rangeEnd,
  weekOffset,
  onWeekOffsetChange,
  onDayTap,
}: CalendarWeekViewProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<CalendarAssignment | null>(null)

  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 0 })
  const weekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 0 })

  // PC-12: Disable arrow only when the ENTIRE week is outside the 30-day range
  // (not when it partially overlaps — partial weeks are allowed, out-of-range days grayed)
  const canGoPrev = !isBefore(weekEnd, rangeStart) && weekOffset > -5
  const canGoNext = !isAfter(weekStart, rangeEnd) && weekOffset < 5

  // Also check that moving would not result in zero visible days
  const prevWeekEnd = endOfWeek(addWeeks(today, weekOffset - 1), { weekStartsOn: 0 })
  const nextWeekStart = startOfWeek(addWeeks(today, weekOffset + 1), { weekStartsOn: 0 })
  const prevHasDays = !isBefore(prevWeekEnd, rangeStart)
  const nextHasDays = !isAfter(nextWeekStart, rangeEnd)

  const leftDisabled = !canGoPrev || !prevHasDays
  const rightDisabled = !canGoNext || !nextHasDays

  // Build 7-day array
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i))
  }

  // Group assignments by day within this week
  const byDate = new Map<string, CalendarAssignment[]>()
  for (const a of assignments) {
    const d = new Date(a.job.scheduledAt)
    if (isWithinInterval(d, { start: weekStart, end: weekEnd })) {
      const key = format(d, 'yyyy-MM-dd')
      if (!byDate.has(key)) byDate.set(key, [])
      byDate.get(key)!.push(a)
    }
  }

  // Swipe gesture
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 60) {
      if (delta < 0 && !rightDisabled) onWeekOffsetChange(weekOffset + 1)
      if (delta > 0 && !leftDisabled) onWeekOffsetChange(weekOffset - 1)
    }
    touchStartX.current = null
  }

  const weekLabel = `Week of ${format(weekStart, 'MMM d')}–${format(weekEnd, 'd')}`

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Week navigation header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
          <button
            onClick={() => onWeekOffsetChange(weekOffset - 1)}
            disabled={leftDisabled}
            className="p-2 text-gray-500 disabled:opacity-30 active:text-teal-600"
          >
            ←
          </button>
          <span className="text-sm font-medium text-gray-700">{weekLabel}</span>
          <button
            onClick={() => onWeekOffsetChange(weekOffset + 1)}
            disabled={rightDisabled}
            className="p-2 text-gray-500 disabled:opacity-30 active:text-teal-600"
          >
            →
          </button>
        </div>

        {/* Day columns */}
        <div
          className="flex flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const isToday = isSameDay(day, today)
            // PC-12: days outside the 30-day range are grayed and non-tappable
            const inRange = isWithinInterval(day, { start: rangeStart, end: rangeEnd })
            const dayAssignments = (byDate.get(dateKey) ?? []).sort(
              (a, b) =>
                new Date(a.job.scheduledAt).getTime() - new Date(b.job.scheduledAt).getTime(),
            )

            return (
              <div
                key={dateKey}
                className={`flex-1 min-w-0 border-r border-gray-100 last:border-r-0 flex flex-col ${
                  !inRange ? 'opacity-30' : ''
                }`}
              >
                {/* Day header */}
                <button
                  onClick={() => inRange && onDayTap(day)}
                  disabled={!inRange}
                  className={`py-2 text-center border-b border-gray-100 ${
                    isToday ? 'bg-teal-50' : 'bg-white'
                  } ${inRange ? 'active:bg-gray-50' : 'cursor-default'}`}
                >
                  <p className={`text-xs ${isToday ? 'font-bold text-teal-600' : 'text-gray-500'}`}>
                    {format(day, 'EEE')[0]}
                  </p>
                  <p
                    className={`text-sm font-semibold mt-0.5 ${
                      isToday
                        ? 'text-white bg-teal-500 rounded-full w-6 h-6 flex items-center justify-center mx-auto text-xs'
                        : 'text-gray-800'
                    }`}
                  >
                    {format(day, 'd')}
                  </p>
                </button>

                {/* Job tiles — compact mode */}
                <div className="flex-1 overflow-y-auto p-1">
                  {dayAssignments.map(a => (
                    <CalendarJobTile
                      key={a.id}
                      assignment={a}
                      now={today}
                      compact
                      onTap={() => setSelectedAssignment(a)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
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
