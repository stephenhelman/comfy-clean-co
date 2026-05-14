'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { deactivateCleaner, reactivateCleaner } from '@/app/(admin)/cleaners/actions'

interface FutureJob {
  id: string
  clientName: string
  scheduledAt: Date
}

interface Props {
  cleanerId: string
  cleanerName: string
  isActive: boolean
  futureJobs: FutureJob[]
}

export default function CleanerDeactivateButton({ cleanerId, cleanerName, isActive, futureJobs }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!isActive) {
    return (
      <button
        onClick={() => startTransition(async () => { await reactivateCleaner(cleanerId) })}
        disabled={isPending}
        className="px-4 py-2 border border-brand-green text-brand-green rounded-lg text-sm font-medium hover:bg-brand-green-pale transition-colors disabled:opacity-50"
      >
        {isPending ? 'Reactivating…' : 'Reactivate Cleaner'}
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
      >
        Deactivate Cleaner
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Deactivate {cleanerName}?</h3>

            {futureJobs.length > 0 ? (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  This cleaner is assigned to <strong>{futureJobs.length} upcoming job{futureJobs.length !== 1 ? 's' : ''}</strong>.
                  They will be removed from these assignments:
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {futureJobs.map((j) => (
                    <li key={j.id} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                      {j.clientName} — {format(new Date(j.scheduledAt), 'MMM d, yyyy')}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                This cleaner has no upcoming scheduled jobs. They will be marked inactive.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => startTransition(async () => { await deactivateCleaner(cleanerId) })}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
