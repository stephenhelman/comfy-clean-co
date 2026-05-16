import { startOfDay } from 'date-fns'

export type AssignmentStatus =
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'cancelled'
  | 'bumped'
  | 'lock_out'

export interface CalendarAssignment {
  id: string
  clockedInAt: Date | null
  clockedOutAt: Date | null
  job: {
    scheduledAt: Date
    jobType: string
    status: string
    client: {
      name: string
      defaultAddress: string | null
      defaultCity: string | null
      defaultZip: string | null
    }
  }
}

// PC-11 / PC-19: paid maps to completed throughout the calendar
export function getAssignmentStatus(
  assignment: CalendarAssignment,
  now: Date,
): AssignmentStatus {
  const job = assignment.job
  const scheduledAt = new Date(job.scheduledAt)

  if (job.status === 'cancelled') return 'cancelled'
  if (job.status === 'bump') return 'bumped'
  if (job.status === 'lock_out') return 'lock_out'
  if (['completed', 'paid'].includes(job.status)) return 'completed'
  if (job.status === 'in_progress') return 'in_progress'

  // status === 'scheduled'
  if (scheduledAt < startOfDay(now) && !assignment.clockedInAt) {
    return 'missed'
  }

  return 'upcoming'
}

export const STATUS_BORDER_COLOR: Record<AssignmentStatus, string> = {
  upcoming:    'border-l-blue-500',
  in_progress: 'border-l-amber-400',
  completed:   'border-l-green-500',
  missed:      'border-l-red-500',
  cancelled:   'border-l-gray-400',
  bumped:      'border-l-gray-400',
  lock_out:    'border-l-gray-400',
}

export const STATUS_DOT_COLOR: Record<AssignmentStatus, string> = {
  upcoming:    'bg-blue-500',
  in_progress: 'bg-amber-400',
  completed:   'bg-green-500',
  missed:      'bg-red-500',
  cancelled:   'bg-gray-400',
  bumped:      'bg-gray-400',
  lock_out:    'bg-gray-400',
}

export const STATUS_BADGE_STYLE: Record<AssignmentStatus, string> = {
  upcoming:    'bg-blue-500 text-white',
  in_progress: 'bg-amber-400 text-white',
  completed:   'bg-green-500 text-white',
  missed:      'bg-red-500 text-white',
  cancelled:   'bg-gray-400 text-white',
  bumped:      'bg-gray-400 text-white',
  lock_out:    'bg-gray-400 text-white',
}

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  upcoming:    'Upcoming',
  in_progress: 'In Progress',
  completed:   'Completed',
  missed:      'Missed',
  cancelled:   'Cancelled',
  bumped:      'Rescheduled',
  lock_out:    'Lock Out',
}

export const JOB_TYPE_LABEL: Record<string, string> = {
  standard:   'Standard Clean',
  deep:       'Deep Clean',
  'move-out': 'Move-Out Clean',
}
