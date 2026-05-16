'use client'

import { format } from 'date-fns'

interface JobTileProps {
  assignment: {
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
      }
    }
  }
  isActiveJob: boolean       // this assignment is the one currently clocked in
  anotherJobActive: boolean  // a different assignment is clocked in
  onTap: () => void
}

const JOB_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  standard:  { label: 'Standard',   color: 'bg-blue-100 text-blue-700' },
  deep:      { label: 'Deep Clean', color: 'bg-purple-100 text-purple-700' },
  'move-out':{ label: 'Move-Out',   color: 'bg-orange-100 text-orange-700' },
}

function getBorderColor(
  status: string,
  isActiveJob: boolean,
  anotherJobActive: boolean,
  clockedInAt: Date | null,
  clockedOutAt: Date | null,
): string {
  if (anotherJobActive) return 'border-l-gray-400'
  if (isActiveJob && clockedInAt && !clockedOutAt) return 'border-l-amber-400'
  if (['completed', 'paid'].includes(status) || clockedOutAt) return 'border-l-green-500'
  return 'border-l-blue-500'
}

export default function JobTile({ assignment, isActiveJob, anotherJobActive, onTap }: JobTileProps) {
  const { job, clockedInAt, clockedOutAt } = assignment
  const borderColor = getBorderColor(job.status, isActiveJob, anotherJobActive, clockedInAt, clockedOutAt)
  const isCompleted = ['completed', 'paid'].includes(job.status) || !!clockedOutAt
  const isClocked = isActiveJob && !!clockedInAt && !clockedOutAt

  const badge = JOB_TYPE_BADGES[job.jobType] ?? { label: job.jobType, color: 'bg-gray-100 text-gray-600' }
  const address = [job.client.defaultAddress, job.client.defaultCity].filter(Boolean).join(', ')

  return (
    <button
      onClick={onTap}
      className={`w-full text-left bg-white rounded-xl border border-gray-100 border-l-4 ${borderColor} px-4 py-3 shadow-sm active:scale-[0.99] transition-transform ${
        anotherJobActive ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            {format(new Date(job.scheduledAt), 'h:mm a')}
          </span>
          {isClocked && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </span>
          )}
          {isCompleted && (
            <span className="text-green-500 text-sm">✓</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-900">{job.client.name}</p>
      {address && (
        <p className="text-xs text-gray-500 mt-0.5">{address}</p>
      )}
    </button>
  )
}
