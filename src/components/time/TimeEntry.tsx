import { format, isSameDay } from 'date-fns'
import { formatDuration } from '@/lib/formatDuration'

interface TimeEntryProps {
  clientName: string
  scheduledAt: Date | string
  clockedInAt: Date | string | null
  clockedOutAt: Date | string | null
  durationMins: number | null
  today: Date
}

export default function TimeEntry({
  clientName,
  scheduledAt,
  clockedInAt,
  clockedOutAt,
  durationMins,
  today,
}: TimeEntryProps) {
  if (!clockedInAt) return null
  const inTime = new Date(clockedInAt)
  const outTime = clockedOutAt ? new Date(clockedOutAt) : null
  const isActive = !outTime && isSameDay(inTime, today)
  const isOpenPrevDay = !outTime && !isSameDay(inTime, today)

  const borderColor = isActive
    ? 'border-l-amber-400'
    : isOpenPrevDay
      ? 'border-l-red-400'
      : 'border-l-gray-200'

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 border-l-4 ${borderColor} px-4 py-4 shadow-sm`}
    >
      <p className="text-sm font-semibold text-gray-900">{clientName}</p>
      <p className="text-xs text-gray-500 mt-0.5">
        {format(new Date(scheduledAt), 'EEEE, MMMM d')}
      </p>

      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-16">In:</span>
          <span className="text-sm text-gray-700">{format(inTime, 'h:mm a')}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-16">Out:</span>
          <span className="text-sm text-gray-700">
            {outTime ? format(outTime, 'h:mm a') : '—'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-16">Duration:</span>
          <span className="text-sm text-gray-700">
            {isActive
              ? 'Currently clocked in'
              : isOpenPrevDay
                ? '—'
                : formatDuration(durationMins ?? 0)}
          </span>
        </div>
      </div>

      {isOpenPrevDay && (
        <p className="text-xs text-red-600 font-medium mt-3 flex items-center gap-1">
          ⚠ Contact your manager
        </p>
      )}
    </div>
  )
}
