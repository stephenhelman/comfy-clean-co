'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { saveClientNotes } from '@/app/(admin)/clients/actions'

interface Props {
  clientId: string
  initialNotes: string | null
  updatedAt: Date
}

export default function ClientInternalNotes({ clientId, initialNotes, updatedAt }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleBlur() {
    await saveClientNotes(clientId, notes)
    setSaved(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">Internal Notes</label>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600">Saved</span>}
          <span className="text-xs text-gray-400">Last updated {format(new Date(updatedAt), 'MMM d, h:mm a')}</span>
        </div>
      </div>
      <textarea
        rows={5}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Admin-only notes, never shown to client…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy resize-none"
      />
      <p className="text-xs text-gray-400">Auto-saves when you click away.</p>
    </div>
  )
}
