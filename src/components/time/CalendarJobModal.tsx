'use client'

import { useRef } from 'react'
import { format } from 'date-fns'
import {
  getAssignmentStatus,
  STATUS_BADGE_STYLE,
  STATUS_LABEL,
  JOB_TYPE_LABEL,
  type CalendarAssignment,
} from './calendarUtils'

interface CalendarJobModalProps {
  assignment: CalendarAssignment
  now: Date
  onClose: () => void
}

export default function CalendarJobModal({ assignment, now, onClose }: CalendarJobModalProps) {
  const { job } = assignment
  const status = getAssignmentStatus(assignment, now)
  const dragStartY = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (dragStartY.current === null) return
    const delta = e.changedTouches[0].clientY - dragStartY.current
    if (delta > 80) onClose()
    dragStartY.current = null
  }

  const fullAddress = [job.client.defaultAddress, job.client.defaultCity, job.client.defaultZip]
    .filter(Boolean)
    .join(', ')
  const jobTypeLabel = JOB_TYPE_LABEL[job.jobType] ?? job.jobType
  const badgeStyle = STATUS_BADGE_STYLE[status]
  const statusLabel = STATUS_LABEL[status]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-2xl z-50 shadow-2xl max-h-[80vh] overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pb-8 pt-2 space-y-4">
          {/* Job details */}
          <div>
            <h2 className="text-lg font-bold text-gray-900">{job.client.name}</h2>
            {/* PC-10: plain text address */}
            <p className="text-sm text-gray-500 mt-0.5">{fullAddress}</p>
            <p className="text-sm text-gray-500 mt-2">
              {format(new Date(job.scheduledAt), 'EEEE, MMMM d')} at{' '}
              {format(new Date(job.scheduledAt), 'h:mm a')}
            </p>
            <p className="text-sm text-gray-500">{jobTypeLabel}</p>
          </div>

          <div className="border-t border-gray-100" />

          {/* Status badge */}
          <div className="space-y-3">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${badgeStyle}`}>
              {statusLabel}
            </span>

            {/* Missed job note */}
            {status === 'missed' && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-sm text-red-700">
                  No clock-in recorded for this appointment.
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Contact your manager if this is incorrect.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-semibold text-gray-700 border border-gray-200 active:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
