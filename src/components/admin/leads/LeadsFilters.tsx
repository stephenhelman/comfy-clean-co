'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quote_sent', label: 'Quote Sent' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]
const TYPES = [{ value: '', label: 'All Types' }, { value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' }]
const FREQS = [{ value: '', label: 'All Frequencies' }, { value: 'one-time', label: 'One-Time' }, { value: 'recurring', label: 'Recurring' }]

export default function LeadsFilters({ sources }: { sources: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page') // reset page on filter change
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const selectClass = 'border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white'

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={searchParams.get('status') ?? ''}
        onChange={(e) => setParam('status', e.target.value)}
        className={selectClass}
      >
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <select
        value={searchParams.get('type') ?? ''}
        onChange={(e) => setParam('type', e.target.value)}
        className={selectClass}
      >
        {TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <select
        value={searchParams.get('frequency') ?? ''}
        onChange={(e) => setParam('frequency', e.target.value)}
        className={selectClass}
      >
        {FREQS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {sources.length > 0 && (
        <select
          value={searchParams.get('source') ?? ''}
          onChange={(e) => setParam('source', e.target.value)}
          className={selectClass}
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
      )}

      <input
        type="date"
        value={searchParams.get('from') ?? ''}
        onChange={(e) => setParam('from', e.target.value)}
        className={selectClass}
        title="From date"
      />
      <input
        type="date"
        value={searchParams.get('to') ?? ''}
        onChange={(e) => setParam('to', e.target.value)}
        className={selectClass}
        title="To date"
      />

      {(searchParams.toString()) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
