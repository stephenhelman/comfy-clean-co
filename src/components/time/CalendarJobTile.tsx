import { format } from 'date-fns'
import {
  getAssignmentStatus,
  STATUS_BORDER_COLOR,
  JOB_TYPE_LABEL,
  type CalendarAssignment,
} from './calendarUtils'

const JOB_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  standard:   { label: 'Standard',   color: 'bg-blue-100 text-blue-700' },
  deep:       { label: 'Deep Clean', color: 'bg-purple-100 text-purple-700' },
  'move-out': { label: 'Move-Out',   color: 'bg-orange-100 text-orange-700' },
}

interface CalendarJobTileProps {
  assignment: CalendarAssignment
  now: Date
  compact?: boolean  // week view uses compact mode — time + badge only
  onTap: () => void
}

export default function CalendarJobTile({
  assignment,
  now,
  compact = false,
  onTap,
}: CalendarJobTileProps) {
  const status = getAssignmentStatus(assignment, now)
  const borderColor = STATUS_BORDER_COLOR[status]
  const badge = JOB_TYPE_BADGE[assignment.job.jobType] ?? {
    label: assignment.job.jobType,
    color: 'bg-gray-100 text-gray-600',
  }
  const address = [assignment.job.client.defaultAddress, assignment.job.client.defaultCity]
    .filter(Boolean)
    .join(', ')

  if (compact) {
    return (
      <button
        onClick={onTap}
        className={`w-full text-left bg-white rounded-lg border border-gray-100 border-l-4 ${borderColor} px-2 py-1.5 mb-1 active:scale-[0.98] transition-transform`}
      >
        <p className="text-xs font-semibold text-gray-700">
          {format(new Date(assignment.job.scheduledAt), 'h:mm a')}
        </p>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={onTap}
      className={`w-full text-left bg-white rounded-xl border border-gray-100 border-l-4 ${borderColor} px-4 py-3 shadow-sm active:scale-[0.99] transition-transform`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-700">
          {format(new Date(assignment.job.scheduledAt), 'h:mm a')}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-900">{assignment.job.client.name}</p>
      {address && <p className="text-xs text-gray-500 mt-0.5">{address}</p>}
    </button>
  )
}
