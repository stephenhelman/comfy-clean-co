import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow, subDays } from 'date-fns'
import { ArrowLeft, Pencil } from 'lucide-react'
import { db } from '@/lib/db'
import ClientActions from '@/components/admin/clients/ClientActions'
import ClientInternalNotes from '@/components/admin/clients/ClientInternalNotes'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ jobPage?: string; jobStatus?: string }>
}

const JOB_PAGE_SIZE = 20

const JOB_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-amber-100 text-amber-700',
}

const FREQ_LABELS: Record<string, string> = {
  'one-time': 'One-Time',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
}

const JOB_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  deep: 'Deep Clean',
  'move-out': 'Move-Out',
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-32 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 flex-1">{value}</dd>
    </div>
  )
}

export default async function ClientProfilePage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const jobPage = Math.max(1, parseInt(sp.jobPage ?? '1', 10))
  const jobStatus = sp.jobStatus ?? ''

  const client = await db.client.findUnique({
    where: { id },
    include: {
      preferredCleaner: { select: { id: true, name: true } },
    },
  })
  if (!client) notFound()

  const today = new Date()
  const ninetyDaysAgo = subDays(today, 90)
  const jobSkip = (jobPage - 1) * JOB_PAGE_SIZE

  const jobWhere: Record<string, unknown> = { clientId: id }
  if (jobStatus) jobWhere.status = jobStatus

  const [financialSummary, outstandingJobs, lastJob, nextJob, jobs, totalJobs, futureJobCount] =
    await Promise.all([
      db.job.aggregate({
        where: { clientId: id, status: 'paid' },
        _sum: { actualRevenue: true },
        _count: { id: true },
        _avg: { actualRevenue: true },
      }),
      db.job.findMany({
        where: { clientId: id, status: 'completed' },
        select: { id: true, estimatedValue: true, scheduledAt: true },
      }),
      db.job.findFirst({
        where: { clientId: id, status: { in: ['completed', 'paid'] } },
        orderBy: { scheduledAt: 'desc' },
        select: { scheduledAt: true },
      }),
      db.job.findFirst({
        where: { clientId: id, scheduledAt: { gte: today }, status: { not: 'cancelled' } },
        orderBy: { scheduledAt: 'asc' },
        select: { id: true, scheduledAt: true, jobType: true },
      }),
      db.job.findMany({
        where: jobWhere,
        orderBy: { scheduledAt: 'desc' },
        skip: jobSkip,
        take: JOB_PAGE_SIZE,
        select: {
          id: true,
          scheduledAt: true,
          jobType: true,
          serviceAddress: true,
          status: true,
          actualRevenue: true,
          estimatedValue: true,
          assignments: {
            select: { cleaner: { select: { name: true } } },
          },
        },
      }),
      db.job.count({ where: jobWhere }),
      db.job.count({
        where: { clientId: id, scheduledAt: { gte: today }, status: { not: 'cancelled' } },
      }),
    ])

  const lifetimeValue = financialSummary._sum.actualRevenue ?? 0
  const totalPaidJobs = financialSummary._count.id
  const avgJobValue = financialSummary._avg.actualRevenue ?? 0
  const outstandingBalance = outstandingJobs.reduce((sum, j) => sum + (j.estimatedValue ?? 0), 0)

  const isActive =
    (await db.job.findFirst({
      where: {
        clientId: id,
        OR: [
          { scheduledAt: { gte: today }, status: { not: 'cancelled' } },
          { scheduledAt: { gte: ninetyDaysAgo }, status: { in: ['completed', 'paid'] } },
        ],
      },
    })) !== null

  const totalJobPages = Math.ceil(totalJobs / JOB_PAGE_SIZE)

  const outstandingColor =
    outstandingBalance > 200
      ? 'text-red-600'
      : outstandingBalance > 0
        ? 'text-amber-600'
        : 'text-gray-900'

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
              {client.name}
            </h1>
            {client.companyName && (
              <p className="text-sm text-gray-500">{client.companyName}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                client.type === 'residential' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {client.type === 'residential' ? 'Residential' : 'Commercial'}
              </span>
              {!client.active && (
                <span className="text-xs px-3 py-1 rounded-full font-semibold bg-gray-100 text-gray-500">
                  Inactive
                </span>
              )}
              {client.active && !isActive && (
                <span className="text-xs px-3 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">
                  Dormant
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/clients/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-4 h-4" /> Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Identity */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Identity</h2>
            <dl>
              <InfoRow label="Name" value={client.name} />
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Phone" value={client.phone} />
              <InfoRow label="Client Since" value={format(new Date(client.clientSince), 'MMM d, yyyy')} />
            </dl>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <ClientActions
                clientId={id}
                clientName={client.name}
                isActive={client.active}
                futureJobCount={futureJobCount}
              />
            </div>
          </div>

          {/* Address & Access */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Address & Access</h2>
            <dl>
              <InfoRow
                label="Address"
                value={
                  [client.defaultAddress, client.defaultCity, client.defaultZip]
                    .filter(Boolean)
                    .join(', ') || null
                }
              />
            </dl>
            {client.accessNotes && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Access Notes</p>
                <p className="text-sm text-gray-700 bg-amber-50 rounded-lg p-3 border border-amber-100">{client.accessNotes}</p>
              </div>
            )}
            {client.petNotes && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Pet Notes</p>
                <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3 border border-blue-100">{client.petNotes}</p>
              </div>
            )}
            {client.specialInstructions && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Special Instructions</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">{client.specialInstructions}</p>
              </div>
            )}
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Preferences</h2>
            <dl>
              <InfoRow label="Frequency" value={client.defaultFrequency ? FREQ_LABELS[client.defaultFrequency] ?? client.defaultFrequency : null} />
              <InfoRow label="Job Type" value={client.defaultJobType ? JOB_TYPE_LABELS[client.defaultJobType] ?? client.defaultJobType : null} />
              <InfoRow label="Preferred Day" value={client.preferredDay ? client.preferredDay.charAt(0).toUpperCase() + client.preferredDay.slice(1) : null} />
              <InfoRow label="Preferred Time" value={client.preferredTime ? client.preferredTime.charAt(0).toUpperCase() + client.preferredTime.slice(1) : null} />
              <InfoRow label="Preferred Cleaner" value={client.preferredCleaner?.name ?? null} />
              <InfoRow label="Standard Rate" value={client.standardRate != null ? `$${client.standardRate.toFixed(2)}/visit` : null} />
              <InfoRow label="Payment Method" value={client.preferredPaymentMethod ? client.preferredPaymentMethod.charAt(0).toUpperCase() + client.preferredPaymentMethod.slice(1) : null} />
            </dl>
          </div>

          {/* Secondary Contact — commercial only */}
          {client.type === 'commercial' && client.secondaryContactName && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Secondary Contact</h2>
              <dl>
                <InfoRow label="Name" value={client.secondaryContactName} />
                <InfoRow label="Title" value={client.secondaryContactTitle} />
                <InfoRow label="Email" value={client.secondaryContactEmail} />
                <InfoRow label="Phone" value={client.secondaryContactPhone} />
              </dl>
            </div>
          )}

          {/* Relationship */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Relationship</h2>
            <dl>
              <InfoRow
                label="Source"
                value={
                  client.acquisitionSource
                    ? client.acquisitionSource.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                    : null
                }
              />
              <InfoRow label="Referred By" value={client.referredBy} />
            </dl>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <ClientInternalNotes
                clientId={id}
                initialNotes={client.internalNotes}
                updatedAt={client.updatedAt}
              />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quick Actions */}
          <div className="flex gap-3">
            <Link
              href={`/jobs/new?clientId=${id}`}
              className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-navy-dark transition-colors"
            >
              Schedule New Job
            </Link>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Financial Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Lifetime Value</p>
                <p className="text-xl font-bold text-gray-900 mt-1">${lifetimeValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Jobs Completed</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{totalPaidJobs}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Avg Job Value</p>
                <p className="text-xl font-bold text-gray-900 mt-1">${avgJobValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Est. Outstanding</p>
                <p className={`text-xl font-bold mt-1 ${outstandingColor}`}>${outstandingBalance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Last Service</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {lastJob ? formatDistanceToNow(new Date(lastJob.scheduledAt), { addSuffix: true }) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Next Scheduled</p>
                {nextJob ? (
                  <Link href={`/jobs/${nextJob.id}`} className="text-sm font-medium text-brand-navy hover:underline mt-1 block">
                    {format(new Date(nextJob.scheduledAt), 'EEE, MMM d')}
                    {nextJob.jobType && ` — ${JOB_TYPE_LABELS[nextJob.jobType] ?? nextJob.jobType}`}
                  </Link>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">None scheduled</p>
                )}
              </div>
            </div>
          </div>

          {/* Job History */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Job History</h2>
              <div className="flex gap-2">
                {['', 'scheduled', 'completed', 'paid', 'cancelled'].map((s) => (
                  <Link
                    key={s}
                    href={`/clients/${id}?${new URLSearchParams({ ...(s ? { jobStatus: s } : {}), jobPage: '1' }).toString()}`}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      jobStatus === s
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
                  </Link>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cleaners</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-400">No jobs found.</td>
                    </tr>
                  )}
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <Link href={`/jobs/${job.id}`} className="text-gray-900 hover:text-brand-navy">
                          {format(new Date(job.scheduledAt), 'MMM d, yyyy')}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {job.jobType ? (JOB_TYPE_LABELS[job.jobType] ?? job.jobType) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {job.assignments.map((a) => a.cleaner.name).join(', ') || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-700 font-medium">
                        {job.actualRevenue != null
                          ? `$${job.actualRevenue.toFixed(2)}`
                          : job.estimatedValue != null
                            ? `~$${job.estimatedValue.toFixed(2)}`
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalJobPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Page {jobPage} of {totalJobPages}
                </p>
                <div className="flex gap-2">
                  {jobPage > 1 && (
                    <Link
                      href={`/clients/${id}?${new URLSearchParams({ ...(jobStatus ? { jobStatus } : {}), jobPage: String(jobPage - 1) }).toString()}`}
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Previous
                    </Link>
                  )}
                  {jobPage < totalJobPages && (
                    <Link
                      href={`/clients/${id}?${new URLSearchParams({ ...(jobStatus ? { jobStatus } : {}), jobPage: String(jobPage + 1) }).toString()}`}
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
