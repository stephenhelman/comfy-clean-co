'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import JobTile from '@/components/time/JobTile'
import JobModal from '@/components/time/JobModal'
import InstallTrigger from '@/components/time/InstallTrigger'

interface Assignment {
  id: string
  clockedInAt: Date | null
  clockedOutAt: Date | null
  gpsBlocked: boolean
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

interface HomeClientProps {
  assignments: Assignment[]
  cleanerName: string
  activeAssignmentId: string | null
  now: string
}

function getGreeting(date: Date): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeClient({
  assignments,
  cleanerName,
  activeAssignmentId,
  now,
}: HomeClientProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  // Track which assignment is currently active — updated optimistically when modal closes
  const [activeId, setActiveId] = useState<string | null>(activeAssignmentId)

  const nowDate = new Date(now)
  const firstName = cleanerName.split(' ')[0]
  const greeting = getGreeting(nowDate)
  const dateLabel = format(nowDate, 'EEEE, MMMM d')

  function handleModalClose() {
    // After clock-in/out, the server revalidates — active state will be correct on next render.
    // Reset optimistic local state to force re-read from props on rerender.
    setActiveId(activeAssignmentId)
    setSelectedAssignment(null)
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{dateLabel}</p>
          </div>
          <InstallTrigger />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today</p>

        {assignments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">No jobs scheduled for today</p>
            <Link href="/schedule" className="text-sm text-teal-600 font-medium mt-1 inline-block">
              View your upcoming schedule →
            </Link>
          </div>
        ) : (
          assignments.map(a => (
            <JobTile
              key={a.id}
              assignment={a}
              isActiveJob={a.id === activeId}
              anotherJobActive={activeId !== null && a.id !== activeId}
              onTap={() => setSelectedAssignment(a)}
            />
          ))
        )}
      </div>

      {/* Job modal */}
      {selectedAssignment && (
        <JobModal
          assignment={selectedAssignment}
          anotherJobActive={activeId !== null && selectedAssignment.id !== activeId}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
