'use client'

import { useState, useRef } from 'react'
import { saveAdminNotes } from '@/app/(admin)/leads/actions'
import { format } from 'date-fns'

interface Props {
  leadId: string
  initialNotes: string | null
  updatedAt: Date
}

export default function AdminNotesEditor({ leadId, initialNotes, updatedAt }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleBlur() {
    await saveAdminNotes(leadId, notes)
    setSaved(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">Admin Notes</label>
        {saved && <span className="text-xs text-green-600">Saved</span>}
        <span className="text-xs text-gray-400">Last updated {format(new Date(updatedAt), 'MMM d, h:mm a')}</span>
      </div>
      <textarea
        rows={6}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Internal notes — never visible to the lead…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy resize-none"
      />
      <p className="text-xs text-gray-400">Auto-saves when you click away.</p>
    </div>
  )
}
