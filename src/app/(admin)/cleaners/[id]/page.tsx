import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, subDays, startOfDay } from 'date-fns'
import { ArrowLeft, Pencil } from 'lucide-react'
import { db } from '@/lib/db'
import CleanerNotesEditor from '@/components/admin/cleaners/CleanerNotesEditor'
import CleanerPinPanel from '@/components/admin/cleaners/CleanerPinPanel'
import CleanerDeactivateButton from '@/components/admin/cleaners/CleanerDeactivateButton'
import ClockOutEditForm from '@/components/admin/cleaners/ClockOutEditForm'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const JOB_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-amber-100 text-amber-700',
}

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_ABBR: Record<string, string> = {
  monday: 'M', tuesday: 'T', wednesday: 'W',
  thursday: 'Th', friday: 'F', saturday: 'Sa', sunday: 'Su',
}

function formatDuration(mins: number | null | undefined) {
  if (mins == null) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default async function CleanerProfilePage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const tab = sp.tab ?? 'upcoming'

  const cleaner = await db.cleaner.findUnique({ where: { id } })
  if (!cleaner) notFound()

  const today = startOfDay(new Date())
  const payPeriodStart = subDays(new Date(), 14)

  const [payPeriodAssignments, upcomingAssignments, pastAssignments, preferredClients, futureJobsForDeactivate] =
    await Promise.all([
      db.jobAssignment.findMany({
        where: {
          cleanerId: id,
          clockedOutAt: { not: null },
          job: { scheduledAt: { gte: payPeriodStart } },
        },
        select: { durationMins: true, laborCost: true },
      }),
      db.jobAssignment.findMany({
        where: {
          cleanerId: id,
          job: { scheduledAt: { gte: today }, status: { notIn: ['cancelled'] } },
        },
        include: {
          job: {
            include: { client: { select: { id: true, name: true } } },
          },
        },
        orderBy: { job: { scheduledAt: 'asc' } },
      }),
      db.jobAssignment.findMany({
        where: {
          cleanerId: id,
          job: { scheduledAt: { lt: today } },
        },
        include: {
          job: {
            include: { client: { select: { id: true, name: true } } },
          },
        },
        orderBy: { job: { scheduledAt: 'desc' } },
        take: 50,
      }),
      db.client.findMany({
        where: { preferredCleanerId: id, active: true },
        select: { id: true, name: true, type: true, defaultFrequency: true },
        orderBy: { name: 'asc' },
      }),
      db.jobAssignment.findMany({
        where: {
          cleanerId: id,
          job: { scheduledAt: { gte: today }, status: 'scheduled' },
        },
        include: {
          job: { include: { client: { select: { name: true } } } },
        },
        orderBy: { job: { scheduledAt: 'asc' } },
      }),
    ])

  const totalMinutes = payPeriodAssignments.reduce((s, a) => s + (a.durationMins ?? 0), 0)
  const totalPay = payPeriodAssignments.reduce((s, a) => s + (a.laborCost ?? 0), 0)
  const jobsCompleted = payPeriodAssignments.length
  const avgMins = jobsCompleted > 0 ? Math.round(totalMinutes / jobsCompleted) : 0

  const futureJobsForModal = futureJobsForDeactivate.map((a) => ({
    id: a.id,
    clientName: a.job.client.name,
    scheduledAt: a.job.scheduledAt,
  }))

  const isLocked = cleaner.pinLockedUntil != null && new Date(cleaner.pinLockedUntil) > new Date()

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/cleaners" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Cleaners
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
              {cleaner.name}
            </h1>
            {!cleaner.active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium mt-1 inline-block">
                Inactive
              </span>
            )}
          </div>
          <Link
            href={`/cleaners/${id}/edit`}
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
            <dl className="space-y-0">
              {cleaner.email && (
                <div className="flex gap-3 py-2 border-b border-gray-100">
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Email</dt>
                  <dd className="text-sm text-gray-900">{cleaner.email}</dd>
                </div>
              )}
              {cleaner.phone && (
                <div className="flex gap-3 py-2 border-b border-gray-100">
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Phone</dt>
                  <dd className="text-sm text-gray-900">{cleaner.phone}</dd>
                </div>
              )}
              {cleaner.dateHired && (
                <div className="flex gap-3 py-2 border-b border-gray-100">
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Hired</dt>
                  <dd className="text-sm text-gray-900">{format(new Date(cleaner.dateHired), 'MMM d, yyyy')}</dd>
                </div>
              )}
            </dl>

            {/* Emergency contact */}
            {(cleaner.emergencyContactName || cleaner.emergencyContactPhone) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Emergency Contact</p>
                {cleaner.emergencyContactName && (
                  <p className="text-sm font-medium text-gray-900">{cleaner.emergencyContactName}</p>
                )}
                {cleaner.emergencyContactPhone && (
                  <p className="text-sm text-gray-600">{cleaner.emergencyContactPhone}</p>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <CleanerDeactivateButton
                cleanerId={id}
                cleanerName={cleaner.name}
                isActive={cleaner.active}
                futureJobs={futureJobsForModal}
              />
            </div>
          </div>

          {/* Compensation */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Compensation</h2>
            <dl>
              <div className="flex gap-3 py-2 border-b border-gray-100">
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Rate</dt>
                <dd className="text-sm text-gray-900">${cleaner.hourlyRate.toFixed(2)}/hr</dd>
              </div>
              <div className="flex gap-3 py-2">
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Pay Type</dt>
                <dd className="text-sm text-gray-900 capitalize">{cleaner.payType.replace('_', ' ')}</dd>
              </div>
            </dl>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Availability</h2>
            {cleaner.availableDays.length === 0 ? (
              <p className="text-sm text-gray-400">No specific days set (flexible)</p>
            ) : (
              <div className="flex gap-1.5">
                {ALL_DAYS.map((d) => (
                  <div
                    key={d}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                      cleaner.availableDays.includes(d)
                        ? 'bg-brand-green text-white'
                        : 'bg-gray-100 text-gray-300'
                    }`}
                  >
                    {DAY_ABBR[d]}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PIN Management */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">PIN Management</h2>
            <CleanerPinPanel
              cleanerId={id}
              pinLockedUntil={cleaner.pinLockedUntil}
              updatedAt={cleaner.updatedAt}
            />
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CleanerNotesEditor
              cleanerId={id}
              initialNotes={cleaner.internalNotes}
              updatedAt={cleaner.updatedAt}
            />
          </div>

          {/* Clients who prefer this cleaner */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Preferred By</h2>
            {preferredClients.length === 0 ? (
              <p className="text-sm text-gray-400">No clients have requested this cleaner specifically.</p>
            ) : (
              <ul className="space-y-2">
                {preferredClients.map((c) => (
                  <li key={c.id}>
                    <Link href={`/clients/${c.id}`} className="text-sm text-brand-navy hover:underline font-medium">
                      {c.name}
                    </Link>
                    <p className="text-xs text-gray-400 capitalize">
                      {c.type} · {c.defaultFrequency ?? 'no frequency set'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Pay Period Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Pay Period (Last 14 Days)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Hours</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatDuration(totalMinutes)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Est. Pay</p>
                <p className="text-xl font-bold text-gray-900 mt-1">${totalPay.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Jobs</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{jobsCompleted}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Avg Duration</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatDuration(avgMins)}</p>
              </div>
            </div>
          </div>

          {/* Schedule tabs */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex gap-1 mb-5 border-b border-gray-200">
              {(['upcoming', 'past'] as const).map((t) => (
                <Link
                  key={t}
                  href={`/cleaners/${id}?tab=${t}`}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    tab === t
                      ? 'border-brand-navy text-brand-navy'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'upcoming' ? 'Upcoming' : 'Past'}
                </Link>
              ))}
            </div>

            {tab === 'upcoming' && (
              <>
                {upcomingAssignments.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No upcoming jobs scheduled.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {upcomingAssignments.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3">
                              <Link href={`/jobs/${a.job.id}`} className="text-gray-900 hover:text-brand-navy">
                                {format(new Date(a.job.scheduledAt), 'MMM d, yyyy h:mm a')}
                              </Link>
                            </td>
                            <td className="py-2.5 px-3">
                              <Link href={`/clients/${a.job.client.id}`} className="text-gray-700 hover:text-brand-navy">
                                {a.job.client.name}
                              </Link>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 text-xs">{a.job.serviceAddress ?? '—'}</td>
                            <td className="py-2.5 px-3 text-gray-600 capitalize">{a.job.jobType ?? '—'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLORS[a.job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                {a.job.status.charAt(0).toUpperCase() + a.job.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === 'past' && (
              <>
                {pastAssignments.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No past jobs recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pastAssignments.map((a) => {
                          const isOpen = a.clockedInAt != null && a.clockedOutAt == null
                          return (
                            <tr key={a.id} className={`hover:bg-gray-50 ${isOpen ? 'bg-amber-50' : ''}`}>
                              <td className="py-2.5 px-3">
                                <Link href={`/jobs/${a.job.id}`} className="text-gray-900 hover:text-brand-navy">
                                  {format(new Date(a.job.scheduledAt), 'MMM d, yyyy')}
                                </Link>
                                {isOpen && (
                                  <div className="mt-1">
                                    <ClockOutEditForm
                                      assignmentId={a.id}
                                      cleanerId={id}
                                      clockedInAt={a.clockedInAt!}
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <Link href={`/clients/${a.job.client.id}`} className="text-gray-700 hover:text-brand-navy">
                                  {a.job.client.name}
                                </Link>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLORS[a.job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                  {a.job.status.charAt(0).toUpperCase() + a.job.status.slice(1)}
                                </span>
                                {isOpen && (
                                  <span className="ml-2 text-xs text-amber-600 font-medium">Open entry</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600">
                                {a.clockedInAt && a.clockedOutAt
                                  ? formatDuration(a.durationMins)
                                  : a.clockedInAt
                                    ? `In: ${format(new Date(a.clockedInAt), 'h:mm a')}`
                                    : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-700 font-medium">
                                {a.laborCost != null ? `$${a.laborCost.toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
