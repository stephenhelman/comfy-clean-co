import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import JobSlideOut from '@/components/admin/calendar/JobSlideOut'

interface Props {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params

  const [job, cleaners, settings] = await Promise.all([
    db.job.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true } },
        invoice: true,
        assignments: {
          include: { cleaner: { select: { id: true, name: true, colorIndex: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    db.cleaner.findMany({
      where: { active: true },
      select: { id: true, name: true, colorIndex: true, availableDays: true },
      orderBy: { name: 'asc' },
    }),
    db.businessSettings.findFirst({ select: { maxJobsPerCleaner: true } }),
  ])

  if (!job) notFound()

  const serialized = {
    id: job.id,
    clientId: job.client.id,
    clientName: job.client.name,
    serviceAddress: job.serviceAddress,
    serviceCity: job.serviceCity,
    serviceZip: job.serviceZip,
    scheduledAt: job.scheduledAt.toISOString(),
    estimatedHours: job.estimatedHours,
    jobType: job.jobType,
    notes: job.notes,
    estimatedValue: job.estimatedValue,
    actualRevenue: job.actualRevenue,
    paymentMethod: job.paymentMethod,
    status: job.status,
    cancelReason: job.cancelReason,
    cancellationType: job.cancellationType,
    recurringRule: job.recurringRule,
    recurringGroupId: job.recurringGroupId,
    invoice: job.invoice
      ? {
          id: job.invoice.id,
          invoiceNumber: job.invoice.invoiceNumber,
          amount: job.invoice.amount,
          amountPaid: job.invoice.amountPaid,
          paymentType: job.invoice.paymentType,
          status: job.invoice.status,
          sentAt: job.invoice.sentAt?.toISOString() ?? null,
          paidAt: job.invoice.paidAt?.toISOString() ?? null,
          paymentLinkClickedAt: job.invoice.paymentLinkClickedAt?.toISOString() ?? null,
          manuallyConfirmedAt: job.invoice.manuallyConfirmedAt?.toISOString() ?? null,
          manuallyConfirmedBy: job.invoice.manuallyConfirmedBy,
          pdfUrl: job.invoice.pdfUrl,
        }
      : null,
    assignments: job.assignments.map((a) => ({
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
  }

  return (
    <div className="max-w-screen-md mx-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <Link href="/calendar" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to Calendar
        </Link>
      </div>
      <JobSlideOut
        job={serialized}
        cleaners={cleaners}
        maxJobsPerCleaner={settings?.maxJobsPerCleaner ?? 3}
        onClose={() => {}}
      />
    </div>
  )
}
