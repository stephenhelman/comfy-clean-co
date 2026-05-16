import { formatDuration } from '@/lib/formatDuration'

interface HoursSummaryCardProps {
  periodLabel: string
  totalMinutes: number
  jobCount: number
  hasActiveEntry: boolean
}

export default function HoursSummaryCard({
  periodLabel,
  totalMinutes,
  jobCount,
  hasActiveEntry,
}: HoursSummaryCardProps) {
  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-500 font-medium mb-3">{periodLabel}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Total Hours</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatDuration(totalMinutes)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Jobs Completed</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{jobCount}</p>
        </div>
      </div>
      {hasActiveEntry && (
        <p className="text-xs text-amber-600 font-medium mt-3 pt-3 border-t border-gray-100">
          + 1 job currently in progress
        </p>
      )}
    </div>
  )
}
