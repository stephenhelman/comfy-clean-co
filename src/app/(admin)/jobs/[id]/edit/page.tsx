import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { db } from '@/lib/db'
import JobForm from '@/components/admin/jobs/JobForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditJobPage({ params }: Props) {
  const { id } = await params

  const [job, clients, settings] = await Promise.all([
    db.job.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } } },
    }),
    db.client.findMany({
      where: { active: true },
      select: {
        id: true, name: true, email: true, phone: true,
        defaultAddress: true, defaultCity: true, defaultZip: true,
        defaultFrequency: true, defaultJobType: true,
        standardRate: true, preferredPaymentMethod: true,
      },
      orderBy: { name: 'asc' },
    }),
    db.businessSettings.findFirst({ select: { blackoutDates: true, maxJobsPerDay: true } }),
  ])

  if (!job) notFound()

  const terminal = ['completed', 'cancelled', 'bump', 'lock_out'].includes(job.status)

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <Link href={`/jobs/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Job
        </Link>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          Edit Job — {job.client.name}
        </h1>
        <p className="text-sm text-gray-500">{format(new Date(job.scheduledAt), 'EEEE, MMMM d, yyyy h:mm a')}</p>
      </div>

      {terminal ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800">
          This job is {job.status} and cannot be edited.
        </div>
      ) : (
        <JobForm
          clients={clients}
          job={{
            id: job.id,
            clientId: job.clientId,
            serviceAddress: job.serviceAddress,
            serviceCity: job.serviceCity,
            serviceZip: job.serviceZip,
            scheduledAt: job.scheduledAt.toISOString().slice(0, 16),
            estimatedHours: job.estimatedHours,
            jobType: job.jobType,
            notes: job.notes,
            estimatedValue: job.estimatedValue,
            paymentMethod: job.paymentMethod,
            recurringRule: job.recurringRule,
            status: job.status,
          }}
          blackoutDates={(settings?.blackoutDates ?? []).map((d) => d.toISOString())}
          maxJobsPerDay={settings?.maxJobsPerDay ?? 8}
        />
      )}
    </div>
  )
}
