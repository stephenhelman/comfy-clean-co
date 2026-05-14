import { Suspense } from 'react'
import Link from 'next/link'
import { subDays } from 'date-fns'
import { db } from '@/lib/db'
import ClientsTable from '@/components/admin/clients/ClientsTable'
import ClientsFilters from '@/components/admin/clients/ClientsFilters'

export const metadata = { title: 'Clients' }

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{
    status?: string
    type?: string
    frequency?: string
    day?: string
    zip?: string
    sort?: string
    page?: string
  }>
}

export default async function ClientsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE
  const status = params.status ?? 'active'

  const today = new Date()
  const ninetyDaysAgo = subDays(today, 90)

  const activeJobCondition = {
    OR: [
      { scheduledAt: { gte: today }, status: { not: 'cancelled' } },
      { scheduledAt: { gte: ninetyDaysAgo }, status: { in: ['completed', 'paid'] } },
    ],
  }

  const where: Record<string, unknown> = {}

  if (status === 'active') {
    where.active = true
    where.jobs = { some: activeJobCondition }
  } else if (status === 'dormant') {
    where.active = true
    where.jobs = { none: activeJobCondition }
  } else if (status === 'inactive') {
    where.active = false
  }
  // status === '' means all — no filter added

  if (params.type) where.type = params.type
  if (params.frequency) where.defaultFrequency = params.frequency
  if (params.day) where.preferredDay = params.day
  if (params.zip) where.defaultZip = { contains: params.zip }

  const sortField = params.sort ?? 'clientSince'
  const orderBy = sortField === 'name'
    ? { name: 'asc' as const }
    : { clientSince: 'desc' as const }

  const [rawClients, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        companyName: true,
        type: true,
        phone: true,
        email: true,
        defaultCity: true,
        defaultZip: true,
        defaultFrequency: true,
        clientSince: true,
        active: true,
        jobs: {
          select: { scheduledAt: true, status: true },
          orderBy: { scheduledAt: 'desc' },
        },
      },
    }),
    db.client.count({ where }),
  ])

  const clients = rawClients.map((c) => {
    const now = new Date()
    const ago90 = subDays(now, 90)

    const isActive =
      c.jobs.some((j) => j.scheduledAt >= now && j.status !== 'cancelled') ||
      c.jobs.some(
        (j) => j.scheduledAt >= ago90 && (j.status === 'completed' || j.status === 'paid'),
      )

    const lastServiceJob = c.jobs.find(
      (j) => j.status === 'completed' || j.status === 'paid',
    )
    const nextJob = [...c.jobs]
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .find((j) => j.scheduledAt >= now && j.status !== 'cancelled')

    return {
      id: c.id,
      name: c.name,
      companyName: c.companyName,
      type: c.type,
      phone: c.phone,
      email: c.email,
      defaultCity: c.defaultCity,
      defaultZip: c.defaultZip,
      defaultFrequency: c.defaultFrequency,
      clientSince: c.clientSince,
      lastServiceDate: lastServiceJob?.scheduledAt ?? null,
      nextScheduledDate: nextJob?.scheduledAt ?? null,
      isDormant: c.active && !isActive,
    }
  })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} shown</p>
        </div>
        <Link
          href="/clients/new"
          className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-navy-dark transition-colors"
        >
          + New Client
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <ClientsFilters />
        </Suspense>
      </div>

      <ClientsTable clients={clients} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total} clients
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/clients?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/clients?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
