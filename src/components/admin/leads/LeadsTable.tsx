'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'

export interface LeadRow {
  id: string
  name: string
  email: string
  phone: string
  type: string
  frequency: string
  status: string
  source: string | null
  createdAt: Date
  updatedAt: Date
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', quote_sent: 'Quote Sent', converted: 'Converted', lost: 'Lost',
}
const STATUS_COLORS: Record<string, string> = {
  new:        'bg-blue-100 text-blue-700',
  contacted:  'bg-amber-100 text-amber-700',
  quote_sent: 'bg-purple-100 text-purple-700',
  converted:  'bg-green-100 text-green-700',
  lost:       'bg-gray-100 text-gray-500',
}

type SortKey = 'name' | 'createdAt' | 'status' | 'type'

export default function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return leads.filter((l) =>
      !q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.phone.includes(q)
    )
  }, [leads, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      else if (sortKey === 'type') cmp = a.type.localeCompare(b.type)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const now = new Date()

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="w-3" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">No leads match your filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  Name <SortIcon col="name" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">
                  Contact
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('type')}>
                  Type <SortIcon col="type" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Frequency
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                  Received <SortIcon col="createdAt" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((lead) => {
                const age = now.getTime() - new Date(lead.createdAt).getTime()
                const isStale = lead.status === 'new' && age > 48 * 60 * 60 * 1000
                const noMovement = lead.status === 'contacted'
                  && (now.getTime() - new Date(lead.updatedAt).getTime()) > 7 * 24 * 60 * 60 * 1000

                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-brand-navy hover:underline">
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                      <div>{lead.email}</div>
                      <div className="text-xs text-gray-400">{lead.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lead.type === 'residential' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {lead.type === 'residential' ? 'Residential' : 'Commercial'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs capitalize">
                      {lead.frequency}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                      {noMovement && (
                        <span className="ml-2 text-xs text-amber-600 hidden lg:inline">No movement in 7d</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${isStale ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 text-right">{sorted.length} of {leads.length} leads shown</p>
    </div>
  )
}
