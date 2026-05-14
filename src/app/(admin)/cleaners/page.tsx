import { Suspense } from 'react'
import Link from 'next/link'
import { startOfWeek, endOfWeek } from 'date-fns'
import { db } from '@/lib/db'
import CleanersTable from '@/components/admin/cleaners/CleanersTable'

export const metadata = { title: 'Cleaners' }

interface Props {
  searchParams: Promise<{ status?: string; day?: string }>
}

export default async function CleanersPage({ searchParams }: Props) {
  const params = await searchParams
  const status = params.status ?? 'active'

  const where: Record<string, unknown> = {}
  if (status === 'active') where.active = true
  else if (status === 'inactive') where.active = false
  if (params.day) where.availableDays = { has: params.day }

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const cleaners = await db.cleaner.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      hourlyRate: true,
      availableDays: true,
      active: true,
      assignments: {
        where: { job: { scheduledAt: { gte: weekStart, lte: weekEnd } } },
        select: { id: true },
      },
    },
  })

  const rows = cleaners.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    hourlyRate: c.hourlyRate,
    availableDays: c.availableDays,
    active: c.active,
    jobsThisWeek: c.assignments.length,
  }))

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
            Cleaners
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} shown</p>
        </div>
        <Link
          href="/cleaners/new"
          className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-navy-dark transition-colors"
        >
          + New Cleaner
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(['active', 'inactive'] as const).map((s) => (
          <Link
            key={s}
            href={`/cleaners?${new URLSearchParams({ ...params, status: s }).toString()}`}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              status === s
                ? 'bg-brand-navy text-white border-brand-navy'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      <Suspense>
        <CleanersTable cleaners={rows} currentDay={params.day ?? ''} />
      </Suspense>
    </div>
  )
}
