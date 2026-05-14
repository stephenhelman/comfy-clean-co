'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface ClientRow {
  id: string
  name: string
  companyName: string | null
  type: string
  phone: string | null
  email: string | null
  defaultCity: string | null
  defaultZip: string | null
  defaultFrequency: string | null
  clientSince: Date
  lastServiceDate: Date | null
  nextScheduledDate: Date | null
  isDormant: boolean
}

const FREQ_LABELS: Record<string, string> = {
  'one-time': 'One-Time',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
}

export default function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? clients.filter((c) => {
        const q = search.toLowerCase()
        return (
          c.name.toLowerCase().includes(q) ||
          (c.companyName?.toLowerCase().includes(q) ?? false) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.phone?.includes(q) ?? false) ||
          (c.defaultCity?.toLowerCase().includes(q) ?? false) ||
          (c.defaultZip?.includes(q) ?? false)
        )
      })
    : clients

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, company, email, phone, city, or zip…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frequency</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Service</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Job</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No clients found.
                </td>
              </tr>
            )}
            {filtered.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/clients/${client.id}`} className="font-medium text-gray-900 hover:text-brand-navy">
                    {client.name}
                  </Link>
                  {client.companyName && (
                    <p className="text-xs text-gray-500">{client.companyName}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      client.type === 'residential'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {client.type === 'residential' ? 'Residential' : 'Commercial'}
                    </span>
                    {client.isDormant && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                        Dormant
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {client.phone && <p>{client.phone}</p>}
                  {client.email && <p className="text-xs text-gray-400">{client.email}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {client.defaultCity && client.defaultZip
                    ? `${client.defaultCity}, ${client.defaultZip}`
                    : client.defaultCity ?? client.defaultZip ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {client.defaultFrequency ? (FREQ_LABELS[client.defaultFrequency] ?? client.defaultFrequency) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {client.lastServiceDate ? format(new Date(client.lastServiceDate), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {client.nextScheduledDate ? format(new Date(client.nextScheduledDate), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/jobs/new?clientId=${client.id}`}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    New Job
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
