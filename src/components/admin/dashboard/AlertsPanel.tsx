import Link from 'next/link'
import { db } from '@/lib/db'
import { startOfDay, subDays, addHours, format } from 'date-fns'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface Alert {
  level: 'critical' | 'warning' | 'info'
  message: string
  href: string
}

async function buildAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = []
  const now = new Date()
  const yesterday = startOfDay(subDays(now, 1))
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const todayStart = startOfDay(now)
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Critical: open clock entries from previous days
  const staleClockIns = await db.jobAssignment.findMany({
    where: { clockedInAt: { lte: yesterday }, clockedOutAt: null },
    include: {
      cleaner: { select: { name: true } },
      job: { select: { id: true, serviceAddress: true } },
    },
    take: 5,
  })
  for (const entry of staleClockIns) {
    alerts.push({
      level: 'critical',
      message: `${entry.cleaner.name} never clocked out of ${entry.job.serviceAddress} on ${format(new Date(entry.clockedInAt!), 'MMM d')}`,
      href: `/jobs/${entry.jobId}`,
    })
  }

  // Critical: cleaner clocked in 2+ hrs past job's estimated end
  const activeAssignments = await db.jobAssignment.findMany({
    where: { clockedInAt: { not: null }, clockedOutAt: null },
    include: {
      cleaner: { select: { name: true } },
      job: { select: { id: true, scheduledAt: true, estimatedHours: true, serviceAddress: true } },
    },
  })
  for (const a of activeAssignments) {
    const estimatedEnd = addHours(new Date(a.job.scheduledAt), a.job.estimatedHours ?? 2)
    const overBy = now.getTime() - estimatedEnd.getTime()
    if (overBy > 2 * 60 * 60 * 1000) {
      const hoursOver = Math.round(overBy / (60 * 60 * 1000))
      alerts.push({
        level: 'critical',
        message: `${a.cleaner.name} has been clocked in at ${a.job.serviceAddress} for ${hoursOver}+ hours — possible forgotten clock-out`,
        href: `/jobs/${a.job.id}`,
      })
    }
  }

  // Warning: jobs today with no cleaner assigned
  const unassignedToday = await db.job.findMany({
    where: {
      scheduledAt: { gte: todayStart, lte: todayEnd },
      status: 'scheduled',
      assignments: { none: {} },
    },
    include: { client: { select: { name: true } } },
    take: 5,
  })
  for (const job of unassignedToday) {
    alerts.push({
      level: 'warning',
      message: `${job.client.name} at ${format(new Date(job.scheduledAt), 'h:mm a')} — no cleaner assigned`,
      href: `/jobs/${job.id}`,
    })
  }

  // Warning: stale new leads (>48 hours)
  const staleLeads = await db.leadInquiry.findMany({
    where: { status: 'new', createdAt: { lte: fortyEightHoursAgo } },
    orderBy: { createdAt: 'asc' },
    take: 5,
  })
  for (const lead of staleLeads) {
    const hoursAgo = Math.round((now.getTime() - new Date(lead.createdAt).getTime()) / (60 * 60 * 1000))
    alerts.push({
      level: 'warning',
      message: `${lead.name} submitted an inquiry ${hoursAgo} hours ago — no response yet`,
      href: `/leads/${lead.id}`,
    })
  }

  // Info: unacknowledged flagged Google reviews
  const flaggedReviews = await db.googleReview.findMany({
    where: { flagged: true, flagAcknowledgedAt: null },
    orderBy: { publishedAt: 'desc' },
    take: 3,
  })
  for (const review of flaggedReviews) {
    alerts.push({
      level: 'info',
      message: `New ${review.rating}-star review from ${review.authorName}`,
      href: '/reviews',
    })
  }

  // Info: cleaner PINs locked (pinLockedUntil in the future)
  const lockedCleaners = await db.cleaner.findMany({
    where: { pinLockedUntil: { gt: now }, active: true },
    select: { id: true, name: true },
    take: 5,
  })
  for (const cleaner of lockedCleaners) {
    alerts.push({
      level: 'info',
      message: `${cleaner.name}'s PIN is locked — too many failed attempts`,
      href: `/cleaners/${cleaner.id}`,
    })
  }

  // Sort: critical first, then warning, then info
  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => order[a.level] - order[b.level])

  return alerts.slice(0, 10)
}

function AlertIcon({ level }: { level: Alert['level'] }) {
  if (level === 'critical') return <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
  if (level === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
  return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
}

export async function AlertsPanel() {
  const alerts = await buildAlerts()

  if (alerts.length === 0) return null

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Alerts & Flags</h2>
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {alerts.map((alert, i) => (
          <Link
            key={i}
            href={alert.href}
            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <AlertIcon level={alert.level} />
            <p className="text-sm text-gray-700 leading-snug">{alert.message}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
