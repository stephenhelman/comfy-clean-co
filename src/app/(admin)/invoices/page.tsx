import { Suspense } from 'react'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { db } from '@/lib/db'
import InvoicesTable from '@/components/admin/invoices/InvoicesTable'

export const metadata = { title: 'Invoices' }

const PAGE_SIZE = 50

interface Props {
  searchParams: Promise<{
    quickFilter?: string
    from?: string
    to?: string
    clientId?: string
    paymentType?: string
    page?: string
  }>
}

export default async function InvoicesPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  // Default: last 90 days
  const defaultFrom = startOfDay(subDays(new Date(), 90))
  const defaultTo = endOfDay(new Date())
  const fromDate = params.from ? startOfDay(new Date(params.from)) : defaultFrom
  const toDate = params.to ? endOfDay(new Date(params.to)) : defaultTo

  // Build where clause
  const where: Record<string, unknown> = {
    invoiceDate: { gte: fromDate, lte: toDate },
  }

  if (params.clientId) where.clientId = params.clientId
  if (params.paymentType) where.paymentType = params.paymentType

  if (params.quickFilter === 'unpaid') {
    where.status = { in: ['sent', 'pending'] }
  } else if (params.quickFilter === 'overdue') {
    where.status = 'overdue'
  } else if (params.quickFilter === 'paid') {
    where.status = 'paid'
  } else if (params.quickFilter === 'voided') {
    where.status = { in: ['voided', 'written_off'] }
  }

  const [rawInvoices, total, clients, overdueCount] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        client: { select: { id: true, name: true } },
        job: { select: { id: true, scheduledAt: true, jobType: true } },
      },
    }),
    db.invoice.count({ where }),
    db.client.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    // Count invoices that should be overdue but aren't marked yet
    db.invoice.count({
      where: {
        status: { in: ['sent', 'pending'] },
        dueDate: { lt: new Date() },
      },
    }),
  ])

  const invoices = rawInvoices.map(i => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    jobId: i.job.id,
    clientId: i.client.id,
    clientName: i.client.name,
    jobDate: i.job.scheduledAt.toISOString(),
    jobType: i.job.jobType,
    amount: i.amount,
    amountPaid: i.amountPaid,
    paymentType: i.paymentType,
    status: i.status,
    sentAt: i.sentAt?.toISOString() ?? null,
    paidAt: i.paidAt?.toISOString() ?? null,
    voidedAt: i.voidedAt?.toISOString() ?? null,
    overdueMarkedAt: i.overdueMarkedAt?.toISOString() ?? null,
    writtenOffAt: i.writtenOffAt?.toISOString() ?? null,
    writtenOffBy: i.writtenOffBy,
    writtenOffReason: i.writtenOffReason,
    manuallyConfirmedBy: i.manuallyConfirmedBy,
    pdfUrl: i.pdfUrl,
  }))

  return (
    <Suspense>
      <InvoicesTable
        invoices={invoices}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        clients={clients}
        currentParams={params}
        overdueCount={overdueCount}
      />
    </Suspense>
  )
}
