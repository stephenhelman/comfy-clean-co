import Link from 'next/link'
import { db } from '@/lib/db'
import { startOfDay, endOfDay, format } from 'date-fns'

type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | string

function statusPill(status: JobStatus) {
  const styles: Record<string, string> = {
    scheduled:   'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed:   'bg-green-100 text-green-700',
    cancelled:   'bg-gray-100 text-gray-500 line-through',
  }
  const labels: Record<string, string> = {
    scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
  }
  return { cls: styles[status] ?? 'bg-gray-100 text-gray-500', label: labels[status] ?? status }
}

function jobTypeBadge(type: string) {
  const map: Record<string, string> = {
    standard: 'bg-brand-navy/10 text-brand-navy',
    deep:     'bg-purple-100 text-purple-700',
    move_out: 'bg-orange-100 text-orange-700',
  }
  return map[type] ?? 'bg-gray-100 text-gray-600'
}

function jobTypeLabel(type: string) {
  const map: Record<string, string> = { standard: 'Standard', deep: 'Deep Clean', move_out: 'Move-Out' }
  return map[type] ?? type
}

async function getTodayJobs() {
  const today = new Date()
  return db.job.findMany({
    where: {
      scheduledAt: { gte: startOfDay(today), lte: endOfDay(today) },
      status: { not: 'cancelled' },
    },
    include: {
      client: { select: { name: true } },
      assignments: { include: { cleaner: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 11,
  })
}

export async function TodaySchedule() {
  const jobs = await getTodayJobs()
  const hasMore = jobs.length > 10
  const displayed = hasMore ? jobs.slice(0, 10) : jobs

  if (displayed.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Today&apos;s Schedule</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500 text-sm mb-3">No jobs scheduled for today.</p>
          <Link
            href="/jobs/new"
            className="inline-flex items-center px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-brand-navy-dark transition-colors"
          >
            Create a Job
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Today&apos;s Schedule</h2>
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {displayed.map((job) => {
          const { cls, label } = statusPill(job.status)
          const isUnassigned = job.assignments.length === 0
          const cleanerNames = job.assignments.map((a) => a.cleaner.name).join(', ')
          return (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-16 shrink-0">
                <p className="text-xs font-semibold text-gray-700">
                  {format(new Date(job.scheduledAt), 'h:mm a')}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{job.client.name}</p>
                <p className="text-xs text-gray-500 truncate">{job.serviceAddress}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${jobTypeBadge(job.jobType)}`}>
                  {jobTypeLabel(job.jobType)}
                </span>

                {isUnassigned ? (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                    Unassigned
                  </span>
                ) : (
                  <span className="text-xs text-gray-600 max-w-[120px] truncate">{cleanerNames}</span>
                )}

                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
                  {label}
                </span>
              </div>
            </Link>
          )
        })}

        {hasMore && (
          <div className="px-4 py-3 text-center">
            <Link href="/calendar" className="text-sm text-brand-navy hover:underline font-medium">
              View all {jobs.length}+ jobs today →
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

export function TodayScheduleSkeleton() {
  return (
    <section>
      <div className="h-5 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-14" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
            <div className="h-5 bg-gray-200 rounded-full w-20" />
          </div>
        ))}
      </div>
    </section>
  )
}
