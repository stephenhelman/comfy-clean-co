'use client'

import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
} from 'date-fns'
import CalendarDot from './CalendarDot'
import CalendarJobModal from './CalendarJobModal'
import { getAssignmentStatus, type CalendarAssignment, type AssignmentStatus } from './calendarUtils'

interface CalendarMonthViewProps {
  assignments: CalendarAssignment[]
  today: Date
  rangeStart: Date
  rangeEnd: Date
  monthOffset: number
  onMonthOffsetChange: (offset: number) => void
  onDayTap: (date: Date) => void
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarMonthView({
  assignments,
  today,
  rangeStart,
  rangeEnd,
  monthOffset,
  onMonthOffsetChange,
  onDayTap,
}: CalendarMonthViewProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<CalendarAssignment | null>(null)

  const displayMonth = addMonths(today, monthOffset)
  const monthStart = startOfMonth(displayMonth)
  const monthEnd = endOfMonth(displayMonth)

  // PC-13: Allow partial months — disable arrows only when entire next/prev month is outside range
  const prevMonthEnd = endOfMonth(addMonths(displayMonth, -1))
  const nextMonthStart = startOfMonth(addMonths(displayMonth, 1))
  const canGoPrev = prevMonthEnd >= rangeStart
  const canGoNext = nextMonthStart <= rangeEnd

  // Build calendar grid — start from Sunday before month start
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const cells: Date[] = []
  let cursor = gridStart
  while (cursor <= monthEnd || cells.length % 7 !== 0) {
    cells.push(new Date(cursor))
    cursor = addDays(cursor, 1)
    if (cells.length > 42) break // max 6 weeks
  }

  // Group assignments by date key
  const byDate = new Map<string, CalendarAssignment[]>()
  for (const a of assignments) {
    const key = format(new Date(a.job.scheduledAt), 'yyyy-MM-dd')
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(a)
  }

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
          <button
            onClick={() => onMonthOffsetChange(monthOffset - 1)}
            disabled={!canGoPrev}
            className="p-2 text-gray-500 disabled:opacity-30 active:text-teal-600"
          >
            ←
          </button>
          <span className="text-sm font-medium text-gray-700">
            {format(displayMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => onMonthOffsetChange(monthOffset + 1)}
            disabled={!canGoNext}
            className="p-2 text-gray-500 disabled:opacity-30 active:text-teal-600"
          >
            →
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {DAY_HEADERS.map(d => (
            <div key={d} className="text-center py-1.5">
              <span className="text-xs font-medium text-gray-400">{d}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto">
          {cells.map((day, i) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const isCurrentMonth = isSameMonth(day, displayMonth)
            const isToday = isSameDay(day, today)
            // PC-13: cells outside 30-day range are grayed and non-tappable
            const inRange = isWithinInterval(day, { start: rangeStart, end: rangeEnd })
            const dayAssignments = byDate.get(dateKey) ?? []

            const statuses: AssignmentStatus[] = dayAssignments.map(a =>
              getAssignmentStatus(a, today),
            )
            const dotsToShow = statuses.slice(0, 3)
            const overflow = statuses.length - 3

            return (
              <button
                key={i}
                onClick={() => inRange && onDayTap(day)}
                disabled={!inRange || !isCurrentMonth}
                className={`
                  relative flex flex-col items-center pt-1 pb-2 min-h-[52px] border-b border-r border-gray-100
                  ${!isCurrentMonth ? 'opacity-20' : ''}
                  ${!inRange && isCurrentMonth ? 'opacity-40' : ''}
                  ${inRange && isCurrentMonth ? 'active:bg-gray-50' : 'cursor-default'}
                `}
              >
                {/* Date number */}
                <span
                  className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-teal-500 text-white font-bold' : 'text-gray-800'}
                  `}
                >
                  {format(day, 'd')}
                </span>

                {/* Status dots */}
                {dotsToShow.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {dotsToShow.map((s, di) => (
                      <CalendarDot key={di} status={s} />
                    ))}
                    {overflow > 0 && (
                      <span className="text-xs text-gray-400 leading-none">+{overflow}</span>
                    )}
                  </div>
                )}
              </button>
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
