'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_ABBR: Record<string, string> = {
  monday: 'M', tuesday: 'T', wednesday: 'W',
  thursday: 'Th', friday: 'F', saturday: 'Sa', sunday: 'Su',
}

interface CleanerRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  hourlyRate: number
  availableDays: string[]
  active: boolean
  jobsThisWeek: number
}

export default function CleanersTable({
  cleaners,
  currentDay,
}: {
  cleaners: CleanerRow[]
  currentDay: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [search, setSearch] = useState('')

  function setDay(day: string) {
    const params = new URLSearchParams(sp.toString())
    if (day) params.set('day', day)
    else params.delete('day')
    router.push(`/cleaners?${params.toString()}`)
  }

  const filtered = search.trim()
    ? cleaners.filter((c) => {
        const q = search.toLowerCase()
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.phone?.includes(q) ?? false)
        )
      })
    : cleaners

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
        />
        <select
          value={currentDay}
          onChange={(e) => setDay(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="">Any Day</option>
          {ALL_DAYS.map((d) => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Days</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jobs This Week</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No cleaners found.
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/cleaners/${c.id}`} className="font-medium text-gray-900 hover:text-brand-navy">
                    {c.name}
                  </Link>
                  {!c.active && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.phone && <p>{c.phone}</p>}
                  {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                </td>
                <td className="px-4 py-3 text-gray-700">${c.hourlyRate.toFixed(2)}/hr</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {ALL_DAYS.map((d) => (
                      <span
                        key={d}
                        className={`text-xs w-6 h-6 rounded flex items-center justify-center font-medium ${
                          c.availableDays.includes(d)
                            ? 'bg-brand-green text-white'
                            : 'bg-gray-100 text-gray-300'
                        }`}
                      >
                        {DAY_ABBR[d]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{c.jobsThisWeek}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/cleaners/${c.id}`}
                      className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </Link>
                    <Link
                      href={`/cleaners/${c.id}/edit`}
                      className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
