import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import LeadsTable from '@/components/admin/leads/LeadsTable'
import LeadsFilters from '@/components/admin/leads/LeadsFilters'

export const metadata = { title: 'Leads' }

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{
    status?: string; type?: string; frequency?: string; source?: string
    from?: string; to?: string; page?: string
  }>
}

export default async function LeadsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  const where: Record<string, unknown> = {}
  if (params.status) where.status = params.status
  if (params.type) where.type = params.type
  if (params.frequency) where.frequency = params.frequency
  if (params.source) where.source = params.source
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to + 'T23:59:59Z') } : {}),
    }
  }

  const [leads, total, sources] = await Promise.all([
    db.leadInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, email: true, phone: true,
        type: true, frequency: true, status: true, source: true,
        createdAt: true, updatedAt: true,
      },
    }),
    db.leadInquiry.count({ where }),
    db.leadInquiry.findMany({
      where: { source: { not: null } },
      select: { source: true },
      distinct: ['source'],
    }).then((rows) => rows.map((r) => r.source!)),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        <Link
          href="/leads/new"
          className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Lead
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <LeadsFilters sources={sources} />
        </Suspense>
      </div>

      <LeadsTable leads={leads} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total} leads
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/leads?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/leads?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
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
