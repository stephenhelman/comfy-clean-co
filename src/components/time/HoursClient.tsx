'use client'

import PeriodNavigator from './PeriodNavigator'
import HoursSummaryCard from './HoursSummaryCard'
import TimeEntry from './TimeEntry'
import HoursEmptyState from './HoursEmptyState'
import { type PayPeriod } from '@/lib/payPeriod'

interface HoursAssignment {
  id: string
  clockedInAt: Date | string | null
  clockedOutAt: Date | string | null
  durationMins: number | null
  job: {
    scheduledAt: Date | string
    client: { name: string }
  }
}

interface HoursClientProps {
  assignments: HoursAssignment[]
  period: PayPeriod
  currentOffset: number
  totalMinutes: number
  jobCount: number
  cleanerName: string
  // PC-17: showWallMessage true when requestedOffset < -3
  showWallMessage: boolean
  today: string
}

export default function HoursClient({
  assignments,
  period,
  currentOffset,
  totalMinutes,
  jobCount,
  cleanerName,
  showWallMessage,
  today: todayStr,
}: HoursClientProps) {
  const today = new Date(todayStr)
  const firstName = cleanerName.split(' ')[0]
  const hasActiveEntry = assignments.some(a => a.clockedInAt != null && !a.clockedOutAt)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page header */}
      <div className="px-4 pt-4 pb-2 bg-white border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Hours</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {firstName} — {period.label}
        </p>
      </div>

      {/* Period navigator */}
      <PeriodNavigator currentOffset={currentOffset} periodLabel={period.label} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* PC-17: wall message replaces summary + entries when past -3 */}
        {showWallMessage ? (
          <div className="mx-4 mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
            <p className="text-sm font-semibold text-gray-700">Need more pay history?</p>
            <p className="text-sm text-gray-500 mt-1">Contact your manager.</p>
          </div>
        ) : (
          <>
            <HoursSummaryCard
              periodLabel={period.label}
              totalMinutes={totalMinutes}
              jobCount={jobCount}
              hasActiveEntry={hasActiveEntry}
            />

            {assignments.length === 0 ? (
              <HoursEmptyState />
            ) : (
              <div className="px-4 mt-4 space-y-3">
                {assignments.map(a => (
                  <TimeEntry
                    key={a.id}
                    clientName={a.job.client.name}
                    scheduledAt={a.job.scheduledAt}
                    clockedInAt={a.clockedInAt}
                    clockedOutAt={a.clockedOutAt}
                    durationMins={a.durationMins}
                    today={today}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
