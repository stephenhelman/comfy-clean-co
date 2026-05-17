// Canonical job status colors — single source of truth across the admin portal.
// completed = orange (work done, payment pending)
// paid      = green  (fully resolved)

export const JOB_STATUS_COLORS: Record<string, string> = {
  stand_by:    '#8B5CF6',
  scheduled:   '#3B82F6',
  in_progress: '#F59E0B',
  completed:   '#F97316',
  paid:        '#10B981',
  cancelled:   '#6B7280',
  bump:        '#6B7280',
  lock_out:    '#EF4444',
}

// Pastel background tints for calendar tiles (readable text over light fill)
export const JOB_STATUS_COLORS_BG: Record<string, string> = {
  stand_by:    '#DDD6FE',
  scheduled:   '#BFDBFE',
  in_progress: '#FDE68A',
  completed:   '#FED7AA',
  paid:        '#BBF7D0',
  cancelled:   '#E2E8F0',
  bump:        '#E2E8F0',
  lock_out:    '#FECACA',
}

// Tailwind class pairs for status pills
export const JOB_STATUS_TAILWIND: Record<string, string> = {
  stand_by:    'bg-purple-100 text-purple-700',
  scheduled:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-orange-100 text-orange-700',
  paid:        'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-500',
  bump:        'bg-gray-100 text-gray-500',
  lock_out:    'bg-red-100 text-red-600',
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  stand_by:    'Stand-By',
  scheduled:   'Scheduled',
  in_progress: 'In Progress',
  completed:   'Completed',
  paid:        'Paid',
  cancelled:   'Cancelled',
  bump:        'Bumped',
  lock_out:    'Lock Out',
}
