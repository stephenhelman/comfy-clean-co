import { Suspense } from 'react'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { db } from '@/lib/db'
import TimeclockTable from '@/components/admin/timeclock/TimeclockTable'

export const metadata = { title: 'Time Clock Records' }

const PAGE_SIZE = 50

interface Props {
  searchParams: Promise<{
    cleanerId?: string
    from?: string
    to?: string
    status?: string
    page?: string
  }>
}

export default async function TimeclockPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  // Default: last 30 days
  const defaultFrom = startOfDay(subDays(new Date(), 30))
  const defaultTo = endOfDay(new Date())
  const fromDate = params.from ? startOfDay(new Date(params.from)) : defaultFrom
  const toDate = params.to ? endOfDay(new Date(params.to)) : defaultTo

  const where: Record<string, unknown> = {
    job: { scheduledAt: { gte: fromDate, lte: toDate } },
  }

  if (params.cleanerId) where.cleanerId = params.cleanerId

  if (params.status === 'open') {
    where.clockedInAt = { not: null }
    where.clockedOutAt = null
  } else if (params.status === 'complete') {
    where.clockedOutAt = { not: null }
  }

  const [rawEntries, total, cleaners] = await Promise.all([
    db.jobAssignment.findMany({
      where,
      orderBy: [{ clockedInAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: PAGE_SIZE,
      include: {
        cleaner: { select: { id: true, name: true } },
        job: {
          select: {
            id: true, scheduledAt: true, serviceAddress: true, serviceCity: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.jobAssignment.count({ where }),
    db.cleaner.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const entries = rawEntries.map(e => ({
    id: e.id,
    cleanerId: e.cleaner.id,
    cleanerName: e.cleaner.name,
    jobId: e.job.id,
    clientName: e.job.client.name,
    serviceAddress: e.job.serviceAddress,
    serviceCity: e.job.serviceCity,
    scheduledAt: e.job.scheduledAt.toISOString(),
    clockedInAt: e.clockedInAt?.toISOString() ?? null,
    clockedOutAt: e.clockedOutAt?.toISOString() ?? null,
    durationMins: e.durationMins,
    laborCost: e.laborCost,
    hourlyRateSnapshot: e.hourlyRateSnapshot,
    gpsBlocked: e.gpsBlocked,
    gpsLat: e.gpsLat,
    gpsLng: e.gpsLng,
    clockOutGpsBlocked: e.clockOutGpsBlocked,
    clockOutGpsLat: e.clockOutGpsLat,
    clockOutGpsLng: e.clockOutGpsLng,
  }))

  return (
    <Suspense>
      <TimeclockTable
        entries={entries}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        cleaners={cleaners}
        currentParams={params}
      />
    </Suspense>
  )
}
