import Link from 'next/link'
import { db } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'
import { ACTIVITY_EVENTS } from '@/lib/activityLog'

const EVENT_ICONS: Record<string, string> = {
  job_created:            '📋',
  cleaner_assigned:       '👤',
  job_cancelled:          '❌',
  job_completed:          '✅',
  payment_confirmed:      '💵',
  lead_submitted:         '📩',
  lead_converted:         '🎉',
  review_received:        '⭐',
  negative_review_received: '⚠️',
  cleaner_timeclock_edited: '⏱️',
  invoice_sent:           '📄',
  invoice_overdue:        '🔔',
}

const MANAGER_EVENTS = [
  ACTIVITY_EVENTS.JOB_CREATED, ACTIVITY_EVENTS.JOB_EDITED, ACTIVITY_EVENTS.JOB_CANCELLED,
  ACTIVITY_EVENTS.JOB_BUMPED, ACTIVITY_EVENTS.JOB_LOCK_OUT, ACTIVITY_EVENTS.JOB_COMPLETED,
  ACTIVITY_EVENTS.CLEANER_ASSIGNED, ACTIVITY_EVENTS.CLEANER_REMOVED,
  ACTIVITY_EVENTS.LEAD_SUBMITTED, ACTIVITY_EVENTS.LEAD_CONTACTED, ACTIVITY_EVENTS.LEAD_CALL_LOGGED,
  ACTIVITY_EVENTS.LEAD_QUOTE_SENT, ACTIVITY_EVENTS.LEAD_CONVERTED, ACTIVITY_EVENTS.LEAD_LOST,
  ACTIVITY_EVENTS.LEAD_REOPENED, ACTIVITY_EVENTS.LEAD_DUPLICATE, ACTIVITY_EVENTS.LEAD_CREATED_MANUAL,
  ACTIVITY_EVENTS.CLIENT_CREATED, ACTIVITY_EVENTS.CLIENT_UPDATED, ACTIVITY_EVENTS.CLIENT_DEACTIVATED,
  ACTIVITY_EVENTS.CLIENT_REACTIVATED, ACTIVITY_EVENTS.CLIENT_NOTES_UPDATED,
  ACTIVITY_EVENTS.CLEANER_CREATED, ACTIVITY_EVENTS.CLEANER_UPDATED, ACTIVITY_EVENTS.CLEANER_DEACTIVATED,
  ACTIVITY_EVENTS.CLEANER_REACTIVATED, ACTIVITY_EVENTS.CLEANER_PIN_RESET, ACTIVITY_EVENTS.CLEANER_PIN_UNLOCKED,
  ACTIVITY_EVENTS.CLEANER_TIMECLOCK_EDITED,
  ACTIVITY_EVENTS.REVIEW_REQUEST_QUEUED, ACTIVITY_EVENTS.REVIEW_REQUEST_SENT,
  ACTIVITY_EVENTS.REVIEW_RECEIVED, ACTIVITY_EVENTS.NEGATIVE_REVIEW_RECEIVED,
  ACTIVITY_EVENTS.NEGATIVE_REVIEW_ACK, ACTIVITY_EVENTS.REVIEW_AUTO_MATCHED, ACTIVITY_EVENTS.REVIEW_MANUAL_MATCHED,
  ACTIVITY_EVENTS.SMS_OPT_IN_CONFIRMED, ACTIVITY_EVENTS.SMS_OPT_OUT, ACTIVITY_EVENTS.SMS_OPT_IN_OVERRIDE,
]

const BOOKKEEPER_EVENTS = [
  ACTIVITY_EVENTS.PAYMENT_CONFIRMED, ACTIVITY_EVENTS.INVOICE_SENT, ACTIVITY_EVENTS.INVOICE_RESENT,
  ACTIVITY_EVENTS.INVOICE_OVERDUE, ACTIVITY_EVENTS.INVOICE_VOIDED, ACTIVITY_EVENTS.INVOICE_WRITTEN_OFF,
  ACTIVITY_EVENTS.RECEIPT_SENT,
]

const DISPATCHER_EVENTS = [
  ACTIVITY_EVENTS.JOB_CREATED, ACTIVITY_EVENTS.CLEANER_ASSIGNED,
  ACTIVITY_EVENTS.JOB_CANCELLED, ACTIVITY_EVENTS.JOB_BUMPED,
]

const VIEWER_EVENTS = [
  ACTIVITY_EVENTS.JOB_CREATED, ACTIVITY_EVENTS.CLEANER_ASSIGNED,
]

function getAllowedEvents(role: string): string[] | null {
  switch (role) {
    case 'owner':      return null                // all events
    case 'manager':    return MANAGER_EVENTS
    case 'bookkeeper': return BOOKKEEPER_EVENTS
    case 'dispatcher': return DISPATCHER_EVENTS
    case 'viewer':     return VIEWER_EVENTS
    default:           return VIEWER_EVENTS
  }
}

async function getRecentActivity(role: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const allowedEvents = getAllowedEvents(role)
  return db.activityLog.findMany({
    where: {
      createdAt: { gte: since },
      ...(allowedEvents ? { eventType: { in: allowedEvents } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function ActivityFeed({ role }: { role: string }) {
  const events = await getRecentActivity(role)

  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0">
      <div className="rounded-xl border border-gray-200 bg-white h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Activity className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Activity Feed</h2>
          <span className="ml-auto text-xs text-gray-400">Last 24h</span>
        </div>

        {events.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No recent activity.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {events.map((event) => {
              const icon = EVENT_ICONS[event.eventType] ?? '•'
              const timeAgo = formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })
              return (
                <li key={event.id}>
                  {event.linkPath ? (
                    <Link
                      href={event.linkPath}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-base shrink-0 leading-5 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-snug">{event.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 px-4 py-2.5">
                      <span className="text-base shrink-0 leading-5 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-snug">{event.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-50">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5 animate-pulse">
              <div className="w-5 h-5 bg-gray-200 rounded shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-2.5 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
