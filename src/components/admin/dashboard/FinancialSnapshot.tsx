import { db } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, getDaysInMonth } from 'date-fns'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function pct(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <Minus className="w-4 h-4 text-gray-400" />
  const delta = current - previous
  if (delta > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
  if (delta < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
  return <Minus className="w-4 h-4 text-gray-400" />
}

function projection(currentRevenue: number): number | null {
  const today = new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = getDaysInMonth(today)
  const daysRemaining = daysInMonth - dayOfMonth
  if (daysRemaining <= 3) return null
  return (currentRevenue / dayOfMonth) * daysInMonth
}

async function getFinancials() {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const [thisRevJobs, lastRevJobs, thisLaborAssignments, lastLaborAssignments] = await Promise.all([
    db.job.findMany({
      where: { status: 'paid', scheduledAt: { gte: thisMonthStart, lte: thisMonthEnd }, actualRevenue: { not: null } },
      select: { actualRevenue: true },
    }),
    db.job.findMany({
      where: { status: 'paid', scheduledAt: { gte: lastMonthStart, lte: lastMonthEnd }, actualRevenue: { not: null } },
      select: { actualRevenue: true },
    }),
    db.jobAssignment.findMany({
      where: {
        clockedOutAt: { not: null },
        job: { scheduledAt: { gte: thisMonthStart, lte: thisMonthEnd } },
      },
      select: { laborCost: true },
    }),
    db.jobAssignment.findMany({
      where: {
        clockedOutAt: { not: null },
        job: { scheduledAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      },
      select: { laborCost: true },
    }),
  ])

  const thisRevenue  = thisRevJobs.reduce((s, j) => s + (j.actualRevenue ?? 0), 0)
  const lastRevenue  = lastRevJobs.reduce((s, j) => s + (j.actualRevenue ?? 0), 0)
  const thisLabor    = thisLaborAssignments.reduce((s, a) => s + (a.laborCost ?? 0), 0)
  const lastLabor    = lastLaborAssignments.reduce((s, a) => s + (a.laborCost ?? 0), 0)
  const thisMargin   = thisRevenue - thisLabor
  const lastMargin   = lastRevenue - lastLabor
  const proj         = projection(thisRevenue)

  return { thisRevenue, lastRevenue, thisLabor, lastLabor, thisMargin, lastMargin, proj }
}

function marginColor(margin: number, revenue: number) {
  const m = pct(margin, revenue)
  if (m >= 50) return 'text-green-600'
  if (m >= 30) return 'text-amber-600'
  return 'text-red-600'
}

export async function FinancialSnapshot() {
  const f = await getFinancials()

  const metrics = [
    {
      label: 'Revenue',
      this: f.thisRevenue,
      last: f.lastRevenue,
      extra: f.proj ? (
        <span className="text-xs text-gray-500">Projected: {fmt(f.proj)}</span>
      ) : null,
    },
    {
      label: 'Labor Cost',
      this: f.thisLabor,
      last: f.lastLabor,
      extra: null,
    },
    {
      label: 'Gross Margin',
      this: f.thisMargin,
      last: f.lastMargin,
      extra: (
        <span className={`text-xs font-semibold ${marginColor(f.thisMargin, f.thisRevenue)}`}>
          {pct(f.thisMargin, f.thisRevenue)}% margin
        </span>
      ),
    },
  ]

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Financial Snapshot — This Month</h2>
      {/* ROLE CHECK STUB — dashboard.financial — Owner, Bookkeeper only — Phase 12 */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-4 px-5 py-4">
            <div className="w-28 shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{m.label}</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">{fmt(m.this)}</span>
                <Trend current={m.this} previous={m.last} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">vs {fmt(m.last)} last month</p>
              {m.extra && <div className="mt-1">{m.extra}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function FinancialSnapshotSkeleton() {
  return (
    <section>
      <div className="h-5 bg-gray-200 rounded w-48 mb-3 animate-pulse" />
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="flex-1 space-y-1.5">
              <div className="h-6 bg-gray-200 rounded w-20" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
