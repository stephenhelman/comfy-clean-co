import Link from 'next/link'
import { db } from '@/lib/db'
import { startOfDay, endOfDay } from 'date-fns'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

async function getStatusData() {
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [todayJobs, inProgressJobs, outstandingInvoices, newLeads, last24hLeads] = await Promise.all([
    db.job.findMany({
      where: { scheduledAt: { gte: todayStart, lte: todayEnd }, status: { not: 'cancelled' } },
      include: { assignments: { select: { id: true } } },
    }),
    db.job.count({ where: { status: 'in_progress' } }),
    db.invoice.findMany({
      where: { status: { in: ['sent', 'pending', 'overdue'] } },
      select: { amount: true, amountPaid: true },
    }),
    db.leadInquiry.count({ where: { status: 'new' } }),
    db.leadInquiry.count({ where: { status: 'new', createdAt: { gte: oneDayAgo } } }),
    db.jobAssignment.count({ where: { clockedInAt: { not: null }, clockedOutAt: null } }),
  ])

  const totalToday = todayJobs.length
  const assignedToday = todayJobs.filter((j) => j.assignments.length > 0).length
  const unassignedToday = totalToday - assignedToday

  const outstandingCount = outstandingInvoices.length
  const outstandingValue = outstandingInvoices.reduce((sum, inv) => {
    return sum + inv.amount - (inv.amountPaid ?? 0)
  }, 0)

  const activeClockedIn = await db.jobAssignment.count({
    where: { clockedInAt: { not: null }, clockedOutAt: null },
  })

  return {
    todayTotal: totalToday,
    todayAssigned: assignedToday,
    todayUnassigned: unassignedToday,
    inProgressCount: inProgressJobs,
    activeClockedIn,
    outstandingCount,
    outstandingValue,
    newLeadsCount: newLeads,
    last24hLeads,
  }
}

function cardColor(level: 'green' | 'amber' | 'red' | 'teal' | 'gray') {
  const map = {
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red:   'bg-red-50 border-red-200 text-red-700',
    teal:  'bg-teal-50 border-teal-200 text-teal-700',
    gray:  'bg-gray-50 border-gray-200 text-gray-500',
  }
  return map[level]
}

function dotColor(level: 'green' | 'amber' | 'red' | 'teal' | 'gray') {
  const map = {
    green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500',
    teal: 'bg-teal-500', gray: 'bg-gray-400',
  }
  return map[level]
}

export async function StatusCards({ role }: { role: string }) {
  const data = await getStatusData()

  const jobsLevel = data.todayUnassigned === 0 ? 'green' : data.todayUnassigned < data.todayTotal ? 'amber' : 'red'
  const progressLevel = data.inProgressCount > 0 ? 'teal' : 'gray'
  const paymentsLevel = data.outstandingCount === 0 ? 'green' : data.outstandingCount <= 3 ? 'amber' : 'red'
  const leadsLevel = data.newLeadsCount > 0 ? 'teal' : 'gray'

  const showJobs     = role !== 'bookkeeper'
  const showPayments = role === 'owner' || role === 'bookkeeper'
  const showLeads    = role === 'owner' || role === 'manager'

  const allCards = [
    {
      title: 'Jobs Today',
      show: showJobs,
      value: data.todayTotal,
      sub: data.todayTotal === 0 ? 'No jobs scheduled' : `${data.todayAssigned} assigned / ${data.todayUnassigned} unassigned`,
      level: jobsLevel as Parameters<typeof cardColor>[0],
      href: '/calendar',
    },
    {
      title: 'In Progress Now',
      show: showJobs,
      value: data.inProgressCount,
      sub: `${data.activeClockedIn} cleaners on the clock`,
      level: progressLevel as Parameters<typeof cardColor>[0],
      href: '/calendar',
    },
    {
      title: 'Outstanding Payments',
      show: showPayments,
      value: data.outstandingCount,
      sub: data.outstandingCount > 0 ? formatCurrency(data.outstandingValue) + ' total' : 'All caught up',
      level: paymentsLevel as Parameters<typeof cardColor>[0],
      href: '/invoices',
    },
    {
      title: 'New Leads',
      show: showLeads,
      value: data.newLeadsCount,
      sub: data.last24hLeads > 0 ? `${data.last24hLeads} received in last 24 hours` : 'No new leads today',
      level: leadsLevel as Parameters<typeof cardColor>[0],
      href: '/leads',
    },
  ]

  const cards = allCards.filter((c) => c.show)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link
          key={card.title}
          href={card.href}
          className={`flex flex-col justify-between min-h-22 rounded-xl border p-4 transition-shadow hover:shadow-md ${cardColor(card.level)}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70 pr-2">{card.title}</p>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${dotColor(card.level)}`} />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none mb-1">{card.value}</p>
            <p className="text-xs opacity-70">{card.sub}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function StatusCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-4 animate-pulse bg-white">
          <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-8 bg-gray-200 rounded w-12 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>
      ))}
    </div>
  )
}
