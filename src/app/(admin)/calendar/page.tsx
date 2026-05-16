import { Suspense } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfDay, endOfDay, addDays, subDays,
} from 'date-fns'
import { db } from '@/lib/db'
import CalendarView from '@/components/admin/calendar/CalendarView'

export const metadata = { title: 'Calendar' }

interface Props {
  searchParams: Promise<{
    view?: string
    date?: string
    jobId?: string
  }>
}

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams
  const view = (params.view ?? 'month') as 'month' | 'week' | 'day'
  const dateParam = params.date ? new Date(params.date) : new Date()
  const focusJobId = params.jobId ?? null

  // Determine fetch range based on view
  let rangeStart: Date
  let rangeEnd: Date

  if (view === 'month') {
    rangeStart = startOfWeek(startOfMonth(dateParam), { weekStartsOn: 0 })
    rangeEnd = endOfWeek(endOfMonth(dateParam), { weekStartsOn: 0 })
  } else if (view === 'week') {
    rangeStart = startOfWeek(dateParam, { weekStartsOn: 0 })
    rangeEnd = endOfWeek(dateParam, { weekStartsOn: 0 })
  } else {
    rangeStart = startOfDay(dateParam)
    rangeEnd = endOfDay(dateParam)
  }

  // Fetch jobs with full data for the period
  const [jobs, cleaners, settings] = await Promise.all([
    db.job.findMany({
      where: {
        scheduledAt: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        client: { select: { id: true, name: true } },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            amountPaid: true,
            paymentType: true,
            status: true,
            sentAt: true,
            paidAt: true,
            paymentLinkClickedAt: true,
            manuallyConfirmedAt: true,
            manuallyConfirmedBy: true,
            pdfUrl: true,
          },
        },
        assignments: {
          include: {
            cleaner: { select: { id: true, name: true, colorIndex: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    db.cleaner.findMany({
      where: { active: true },
      select: { id: true, name: true, colorIndex: true, availableDays: true },
      orderBy: { name: 'asc' },
    }),
    db.businessSettings.findFirst({
      select: { maxJobsPerDay: true, maxJobsPerCleaner: true, blackoutDates: true },
    }),
  ])

  // Serialize for client component
  const serializedJobs = jobs.map((j) => ({
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
    <div className="flex flex-col h-full p-4 sm:p-6">
      <Suspense>
        <CalendarView
          jobs={serializedJobs}
          cleaners={cleaners.map((c) => ({ id: c.id, name: c.name, colorIndex: c.colorIndex, availableDays: c.availableDays }))}
          currentDate={dateParam.toISOString()}
          view={view}
          focusJobId={focusJobId}
          maxJobsPerDay={settings?.maxJobsPerDay ?? 8}
          maxJobsPerCleaner={settings?.maxJobsPerCleaner ?? 3}
          blackoutDates={(settings?.blackoutDates ?? []).map((d) => d.toISOString())}
        />
      </Suspense>
    </div>
  )
}
