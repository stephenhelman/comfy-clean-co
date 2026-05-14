import { Suspense } from 'react'
import { addDays, startOfDay, endOfDay } from 'date-fns'
import { db } from '@/lib/db'
import JobsListClient from '@/components/admin/jobs/JobsListClient'

export const metadata = { title: 'Jobs' }

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{
    tab?: string
    from?: string
    to?: string
    status?: string
    invoiceStatus?: string
    jobType?: string
    cleanerId?: string
    clientId?: string
    zip?: string
    unassigned?: string
    sort?: string
    page?: string
    quickFilter?: string
    jobId?: string
  }>
}

export default async function JobsPage({ searchParams }: Props) {
  const params = await searchParams
  const tab = (params.tab ?? 'list') as 'list' | 'map'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  // Default: today → 30 days out
  const defaultFrom = startOfDay(new Date())
  const defaultTo = endOfDay(addDays(new Date(), 30))

  // Parse filters
  const fromDate = params.from ? startOfDay(new Date(params.from)) : defaultFrom
  const toDate = params.to ? endOfDay(new Date(params.to)) : defaultTo
  const statuses = params.status ? params.status.split(',') : []
  const invoiceStatuses = params.invoiceStatus ? params.invoiceStatus.split(',') : []
  const jobTypes = params.jobType ? params.jobType.split(',') : []
  const cleanerIdFilter = params.cleanerId ?? null
  const clientIdFilter = params.clientId ?? null
  const zipFilter = params.zip ?? null
  const unassignedOnly = params.unassigned === '1'

  // Apply quick filter overrides
  let qfFrom = fromDate
  let qfTo = toDate
  let qfStatuses = statuses
  let qfInvoiceStatuses = invoiceStatuses
  let qfUnassigned = unassignedOnly

  if (params.quickFilter === 'today') {
    qfFrom = startOfDay(new Date())
    qfTo = endOfDay(new Date())
  } else if (params.quickFilter === 'week') {
    const now = new Date()
    qfFrom = startOfDay(now)
    const weekEnd = addDays(now, 6)
    qfTo = endOfDay(weekEnd)
  } else if (params.quickFilter === 'unassigned') {
    qfStatuses = ['scheduled']
    qfUnassigned = true
  } else if (params.quickFilter === 'unpaid') {
    qfInvoiceStatuses = ['sent', 'pending']
  } else if (params.quickFilter === 'outstanding') {
    qfStatuses = ['completed']
    qfInvoiceStatuses = ['sent', 'pending', 'overdue']
  }

  const where: Record<string, unknown> = {
    scheduledAt: { gte: qfFrom, lte: qfTo },
  }
  if (qfStatuses.length) where.status = { in: qfStatuses }
  if (jobTypes.length) where.jobType = { in: jobTypes }
  if (clientIdFilter) where.clientId = clientIdFilter
  if (zipFilter) where.serviceZip = zipFilter
  if (cleanerIdFilter) where.assignments = { some: { cleanerId: cleanerIdFilter } }

  const sortField = params.sort ?? 'scheduledAt'
  const orderBy =
    sortField === 'clientName' ? { client: { name: 'asc' as const } }
    : sortField === 'estimatedValue' ? { estimatedValue: 'desc' as const }
    : { scheduledAt: 'asc' as const }

  const [rawJobs, total, cleaners, clients] = await Promise.all([
    db.job.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: {
        client: { select: { id: true, name: true } },
        invoice: {
          select: {
            id: true, invoiceNumber: true, amount: true, amountPaid: true,
            paymentType: true, status: true, sentAt: true, paidAt: true,
            paymentLinkClickedAt: true, manuallyConfirmedAt: true,
            manuallyConfirmedBy: true, pdfUrl: true,
          },
        },
        assignments: {
          include: { cleaner: { select: { id: true, name: true, colorIndex: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    db.job.count({ where }),
    db.cleaner.findMany({
      where: { active: true },
      select: { id: true, name: true, colorIndex: true, availableDays: true },
      orderBy: { name: 'asc' },
    }),
    db.client.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // Post-filter unassigned
  const jobs = unassignedOnly || qfUnassigned
    ? rawJobs.filter((j) => j.assignments.length === 0)
    : rawJobs

  // Filter by invoice status if needed
  const invoiceFiltered = invoiceStatuses.length || qfInvoiceStatuses.length
    ? jobs.filter((j) => {
        const statSet = qfInvoiceStatuses.length ? qfInvoiceStatuses : invoiceStatuses
        return j.invoice ? statSet.includes(j.invoice.status) : statSet.includes('draft')
      })
    : jobs

  const serialized = invoiceFiltered.map((j) => ({
    id: j.id,
    clientId: j.client.id,
    clientName: j.client.name,
    serviceAddress: j.serviceAddress,
    serviceCity: j.serviceCity,
    serviceZip: j.serviceZip,
    scheduledAt: j.scheduledAt.toISOString(),
    estimatedHours: j.estimatedHours,
    jobType: j.jobType,
    notes: j.notes,
    estimatedValue: j.estimatedValue,
    actualRevenue: j.actualRevenue,
    paymentMethod: j.paymentMethod,
    status: j.status,
    cancelReason: j.cancelReason,
    cancellationType: j.cancellationType,
    recurringRule: j.recurringRule,
    recurringGroupId: j.recurringGroupId,
    invoice: j.invoice
      ? {
          id: j.invoice.id,
          invoiceNumber: j.invoice.invoiceNumber,
          amount: j.invoice.amount,
          amountPaid: j.invoice.amountPaid,
          paymentType: j.invoice.paymentType,
          status: j.invoice.status,
          sentAt: j.invoice.sentAt?.toISOString() ?? null,
          paidAt: j.invoice.paidAt?.toISOString() ?? null,
          paymentLinkClickedAt: j.invoice.paymentLinkClickedAt?.toISOString() ?? null,
          manuallyConfirmedAt: j.invoice.manuallyConfirmedAt?.toISOString() ?? null,
          manuallyConfirmedBy: j.invoice.manuallyConfirmedBy,
          pdfUrl: j.invoice.pdfUrl,
        }
      : null,
    assignments: j.assignments.map((a) => ({
      id: a.id,
      cleanerId: a.cleaner.id,
      cleanerName: a.cleaner.name,
      cleanerColorIndex: a.cleaner.colorIndex,
      clockedInAt: a.clockedInAt?.toISOString() ?? null,
      clockedOutAt: a.clockedOutAt?.toISOString() ?? null,
      durationMins: a.durationMins,
      laborCost: a.laborCost,
      gpsLat: a.gpsLat,
      gpsLng: a.gpsLng,
      gpsBlocked: a.gpsBlocked,
      hourlyRateSnapshot: a.hourlyRateSnapshot,
    })),
  }))

  return (
    <Suspense>
      <JobsListClient
        jobs={serialized}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        cleaners={cleaners}
        clients={clients}
        tab={tab}
        focusJobId={params.jobId ?? null}
        currentParams={params}
      />
    </Suspense>
  )
}
