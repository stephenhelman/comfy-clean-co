import { db } from '@/lib/db'
import JobForm from '@/components/admin/jobs/JobForm'

export const metadata = { title: 'New Job' }

interface Props {
  searchParams: Promise<{
    clientId?: string
    date?: string
    time?: string
  }>
}

export default async function NewJobPage({ searchParams }: Props) {
  const params = await searchParams

  const [clients, settings] = await Promise.all([
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
    db.businessSettings.findFirst({
      select: { blackoutDates: true, maxJobsPerDay: true },
    }),
  ])

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          New Job
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new cleaning job. An invoice will be generated automatically.</p>
      </div>
      <JobForm
        clients={clients}
        prefilledClientId={params.clientId}
        prefilledDate={params.date}
        prefilledTime={params.time}
        blackoutDates={(settings?.blackoutDates ?? []).map((d) => d.toISOString())}
        maxJobsPerDay={settings?.maxJobsPerDay ?? 8}
      />
    </div>
  )
}
