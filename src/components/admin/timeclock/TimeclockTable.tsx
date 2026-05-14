'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, formatDuration, intervalToDuration } from 'date-fns'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { adminEditClockOut, adminForceClockOut } from '@/app/(admin)/timeclock/actions'

export interface TimeclockEntry {
  id: string
  cleanerId: string
  cleanerName: string
  jobId: string
  clientName: string
  serviceAddress: string
  serviceCity: string
  scheduledAt: string
  clockedInAt: string | null
  clockedOutAt: string | null
  durationMins: number | null
  laborCost: number | null
  hourlyRateSnapshot: number | null
}

interface Props {
  entries: TimeclockEntry[]
  total: number
  page: number
  pageSize: number
  cleaners: { id: string; name: string }[]
  currentParams: Record<string, string | undefined>
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function InlineEditForm({ entry, onDone }: { entry: TimeclockEntry; onDone: () => void }) {
  const [clockOut, setClockOut] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!clockOut) { setError('Clock-out time is required'); return }
    if (!reason.trim()) { setError('Reason is required'); return }
    setError('')
    startTransition(async () => {
      try {
        await adminEditClockOut(entry.id, clockOut, reason)
        onDone()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save')
      }
    })
  }

  function handleForce() {
    if (!reason.trim()) { setError('Reason is required'); return }
    setError('')
    startTransition(async () => {
      try {
        await adminForceClockOut(entry.id, reason)
        onDone()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to clock out')
      }
    })
  }

  const minClockOut = entry.clockedInAt
    ? parseISO(entry.clockedInAt).toISOString().slice(0, 16)
    : undefined

  return (
    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-amber-700 mb-1">Clock-Out Time</label>
          <input
            type="datetime-local"
            value={clockOut}
            min={minClockOut}
            onChange={e => setClockOut(e.target.value)}
            className="text-sm border border-amber-300 rounded px-2 py-1 bg-white"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-amber-700 mb-1">Reason (required)</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Cleaner forgot to clock out"
            className="w-full text-sm border border-amber-300 rounded px-2 py-1 bg-white"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save Clock-Out'}
        </button>
        <button
          onClick={handleForce}
          disabled={isPending}
          className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          Clock Out Now
        </button>
        <button
          onClick={onDone}
          disabled={isPending}
          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function TimeclockTable({ entries, total, page, pageSize, cleaners, currentParams }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)

  // Local filter state
  const [cleanerIdVal, setCleanerIdVal] = useState(currentParams.cleanerId ?? '')
  const [fromVal, setFromVal] = useState(currentParams.from ?? '')
  const [toVal, setToVal] = useState(currentParams.to ?? '')
  const [statusVal, setStatusVal] = useState(currentParams.status ?? 'all')

  const totalPages = Math.ceil(total / pageSize)

  // Summary stats
  const totalMins = entries.reduce((s, e) => s + (e.durationMins ?? 0), 0)
  const totalLabor = entries.reduce((s, e) => s + (e.laborCost ?? 0), 0)
  const openCount = entries.filter(e => e.clockedInAt && !e.clockedOutAt).length

  function buildParams(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const base: Record<string, string | undefined> = {
      cleanerId: currentParams.cleanerId,
      from: currentParams.from,
      to: currentParams.to,
      status: currentParams.status,
      page: currentParams.page,
      ...overrides,
    }
    for (const [k, v] of Object.entries(base)) {
      if (v && v !== 'all') p.set(k, v)
    }
    return p.toString()
  }

  function navigate(overrides: Record<string, string | undefined>) {
    startTransition(() => router.push(`/timeclock?${buildParams(overrides)}`))
  }

  function applyFilters() {
    navigate({
      cleanerId: cleanerIdVal || undefined,
      from: fromVal || undefined,
      to: toVal || undefined,
      status: statusVal !== 'all' ? statusVal : undefined,
      page: undefined,
    })
  }

  function clearFilters() {
    setCleanerIdVal('')
    setFromVal('')
    setToVal('')
    setStatusVal('all')
    startTransition(() => router.push('/timeclock'))
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Time Clock Records</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {/* ROLE CHECK STUB — timeclock.view — Owner, Manager, Bookkeeper only — Phase 12 */}
          {/* DEPENDENCY: Phase 5b must be complete before this phase. GeocodedAddress model required for map view. */}
          All clock-in and clock-out entries for cleaners.
        </p>
      </div>

      {/* Summary bar */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-6 shrink-0">
        <div>
          <p className="text-xs text-gray-500">Total Hours</p>
          <p className="text-sm font-semibold text-gray-900">{fmtDuration(totalMins)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Labor Cost</p>
          <p className="text-sm font-semibold text-gray-900">${totalLabor.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Showing</p>
          <p className="text-sm font-semibold text-gray-900">{total.toLocaleString()} entries</p>
        </div>
        {openCount > 0 && (
          <div className="ml-auto flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-700 font-medium">{openCount} open {openCount === 1 ? 'entry' : 'entries'} — needs attention</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap items-end gap-3 shrink-0">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cleaner</label>
          <select value={cleanerIdVal} onChange={e => setCleanerIdVal(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
            <option value="">All Cleaners</option>
            {cleaners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={fromVal} onChange={e => setFromVal(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={toVal} onChange={e => setToVal(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={statusVal} onChange={e => setStatusVal(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
            <option value="all">All Entries</option>
            <option value="open">Open (no clock-out)</option>
            <option value="complete">Complete</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <button onClick={applyFilters} disabled={isPending}
            className="px-4 py-1.5 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50">
            Apply
          </button>
          <button onClick={clearFilters} disabled={isPending}
            className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <p className="text-lg font-medium">No entries found</p>
            <p className="text-sm mt-1">Try adjusting the filters above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Cleaner</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden md:table-cell">Client / Job</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Clock In</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Clock Out</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Duration</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Labor Cost</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Rate</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(entry => {
                const isOpen = !!entry.clockedInAt && !entry.clockedOutAt
                const isEditing = editingId === entry.id
                return (
                  <tr
                    key={entry.id}
                    className={isOpen ? 'bg-amber-50/60' : ''}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{entry.cleanerName}</div>
                      {isOpen && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold mt-0.5">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                          Clocked In
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="font-medium text-gray-900">{entry.clientName}</div>
                      <div className="text-xs text-gray-500">{entry.serviceAddress}, {entry.serviceCity}</div>
                      <div className="text-xs text-gray-400">{format(parseISO(entry.scheduledAt), 'MMM d, yyyy')}</div>
                    </td>
                    <td className="px-4 py-3">
                      {entry.clockedInAt ? (
                        <>
                          <div className="text-gray-900">{format(parseISO(entry.clockedInAt), 'MMM d')}</div>
                          <div className="text-xs text-gray-500">{format(parseISO(entry.clockedInAt), 'h:mm a')}</div>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.clockedOutAt ? (
                        <>
                          <div className="text-gray-900">{format(parseISO(entry.clockedOutAt), 'MMM d')}</div>
                          <div className="text-xs text-gray-500">{format(parseISO(entry.clockedOutAt), 'h:mm a')}</div>
                        </>
                      ) : isOpen ? (
                        <div>
                          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">OPEN</span>
                          {isEditing && (
                            <InlineEditForm entry={entry} onDone={() => setEditingId(null)} />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-700">
                      {entry.durationMins != null ? fmtDuration(entry.durationMins) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right text-gray-700">
                      {entry.laborCost != null ? `$${entry.laborCost.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right text-gray-500 text-xs">
                      {entry.hourlyRateSnapshot != null ? `$${entry.hourlyRateSnapshot}/hr` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isOpen && !isEditing && (
                        <button
                          onClick={() => setEditingId(entry.id)}
                          className="text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded hover:bg-amber-100"
                        >
                          Edit
                        </button>
                      )}
                      {isOpen && isEditing && (
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                        >
                          ✕
                        </button>
                      )}
                      {!isOpen && entry.clockedOutAt && (
                        <button
                          onClick={() => setEditingId(isEditing ? null : entry.id)}
                          className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2 py-1 rounded hover:bg-gray-100"
                        >
                          {isEditing ? '✕' : 'Edit'}
                        </button>
                      )}
                      {!isOpen && isEditing && (
                        <InlineEditForm entry={entry} onDone={() => setEditingId(null)} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1 || isPending}
              onClick={() => navigate({ page: String(page - 1) })}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages || isPending}
              onClick={() => navigate({ page: String(page + 1) })}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
