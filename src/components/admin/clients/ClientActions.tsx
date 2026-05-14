'use client'

import { useState, useTransition } from 'react'
import { deactivateClient, reactivateClient } from '@/app/(admin)/clients/actions'

interface Props {
  clientId: string
  clientName: string
  isActive: boolean
  futureJobCount: number
}

export default function ClientActions({ clientId, clientName, isActive, futureJobCount }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDeactivate() {
    startTransition(async () => {
      await deactivateClient(clientId)
    })
  }

  function handleReactivate() {
    startTransition(async () => {
      await reactivateClient(clientId)
    })
  }

  if (!isActive) {
    return (
      <button
        onClick={handleReactivate}
        disabled={isPending}
        className="px-4 py-2 border border-brand-green text-brand-green rounded-lg text-sm font-medium hover:bg-brand-green-pale transition-colors disabled:opacity-50"
      >
        {isPending ? 'Reactivating…' : 'Reactivate Client'}
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
      >
        Deactivate Client
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Deactivate {clientName}?</h3>
            <p className="text-sm text-gray-600 mb-3">
              This client will be hidden from the active list and marked inactive.
            </p>
            {futureJobCount > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>{futureJobCount} upcoming job{futureJobCount !== 1 ? 's' : ''}</strong> will remain scheduled
                but this client will not appear in the active list. Review those jobs manually.
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
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
