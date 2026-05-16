'use client'

import { useState, useRef, useEffect } from 'react'
import CalendarListView from './CalendarListView'
import CalendarWeekView from './CalendarWeekView'
import CalendarMonthView from './CalendarMonthView'
import { type CalendarAssignment } from './calendarUtils'

type CalendarView = 'list' | 'week' | 'month'

const VIEW_STORAGE_KEY = 'comfyclean-calendar-view'

interface CalendarClientProps {
  assignments: CalendarAssignment[]
  today: string
  rangeStart: string
  rangeEnd: string
}

export default function CalendarClient({
  assignments,
  today: todayStr,
  rangeStart: rangeStartStr,
  rangeEnd: rangeEndStr,
}: CalendarClientProps) {
  const today = new Date(todayStr)
  const rangeStart = new Date(rangeStartStr)
  const rangeEnd = new Date(rangeEndStr)

  const [view, setView] = useState<CalendarView>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY)
      if (stored === 'list' || stored === 'week' || stored === 'month') return stored
    }
    return 'list'
  })
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  // PC-14: scroll position lives here and is passed to CalendarListView
  const scrollPositionRef = useRef(0)
  // When week/month taps a day, navigate list view to that date
  const [targetDate, setTargetDate] = useState<Date | null>(null)

  function switchView(next: CalendarView) {
    setView(next)
    localStorage.setItem(VIEW_STORAGE_KEY, next)
    if (next !== 'list') setTargetDate(null)
  }

  function handleDayTap(date: Date) {
    setTargetDate(date)
    switchView('list')
  }

  // Clear targetDate after CalendarListView has consumed it
  useEffect(() => {
    if (targetDate) {
      const timer = setTimeout(() => setTargetDate(null), 500)
      return () => clearTimeout(timer)
    }
  }, [targetDate])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* View toggle — sticky */}
      <div className="px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          {(['list', 'week', 'month'] as const).map(v => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                view === v
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Active view */}
      {view === 'list' && (
        <CalendarListView
          assignments={assignments}
          today={today}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          scrollPositionRef={scrollPositionRef}
          targetDate={targetDate}
        />
      )}
      {view === 'week' && (
        <CalendarWeekView
          assignments={assignments}
          today={today}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          weekOffset={weekOffset}
          onWeekOffsetChange={setWeekOffset}
          onDayTap={handleDayTap}
        />
      )}
      {view === 'month' && (
        <CalendarMonthView
          assignments={assignments}
          today={today}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          monthOffset={monthOffset}
          onMonthOffsetChange={setMonthOffset}
          onDayTap={handleDayTap}
        />
      )}
    </div>
  )
}
