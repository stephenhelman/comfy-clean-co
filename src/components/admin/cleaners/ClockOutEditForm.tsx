'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { editClockOut } from '@/app/(admin)/cleaners/actions'

interface Props {
  assignmentId: string
  cleanerId: string
  clockedInAt: Date
}

export default function ClockOutEditForm({ assignmentId, cleanerId, clockedInAt }: Props) {
  const [open, setOpen] = useState(false)
  const [clockOut, setClockOut] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError('')
    if (!clockOut) { setError('Clock-out time is required'); return }
    if (!reason.trim()) { setError('Reason is required'); return }

    startTransition(async () => {
      try {
        await editClockOut(assignmentId, clockOut, reason)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 border border-amber-400 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
      >
        Edit Entry
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-2 bg-amber-50 rounded-lg p-3 border border-amber-200">
      <p className="text-xs text-amber-700 font-medium">
        Clocked in: {format(new Date(clockedInAt), 'h:mm a')} — no clock-out recorded
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Clock-Out Time</label>
        <input
          type="datetime-local"
          value={clockOut}
          onChange={(e) => setClockOut(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Reason *</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Cleaner forgot to clock out"
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
        />
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setError('') }}
          className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-2.5 py-1 bg-brand-navy text-white rounded-lg text-xs hover:bg-brand-navy-dark disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save Clock-Out'}
        </button>
      </div>
    </div>
  )
}
