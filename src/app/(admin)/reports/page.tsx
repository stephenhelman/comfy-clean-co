import { Suspense } from 'react'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import ReportsClient from '@/components/admin/reports/ReportsClient'

export const metadata = { title: 'Reports' }

interface Props {
  searchParams: Promise<{ from?: string; to?: string; tab?: string }>
}

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams
  const session = await auth()
  const role = (session?.user?.role ?? 'viewer') as Role

  const defaultFrom = startOfDay(subDays(new Date(), 30))
  const defaultTo = endOfDay(new Date())
  const fromDate = params.from ? startOfDay(new Date(params.from)) : defaultFrom
  const toDate = params.to ? endOfDay(new Date(params.to)) : defaultTo

  const [allInvoicesInRange, jobsInRange, assignmentsInRange, allActiveClients, newClientsRaw] = await Promise.all([
    // Invoices in range — used only for outstanding/written-off metrics
    db.invoice.findMany({
      where: { invoiceDate: { gte: fromDate, lte: toDate } },
      select: { status: true, amount: true, amountPaid: true },
    }),
    // Jobs in range — single source of truth for all revenue calculations
    db.job.findMany({
      where: { scheduledAt: { gte: fromDate, lte: toDate } },
      select: {
        id: true, status: true, jobType: true, clientId: true,
        scheduledAt: true, paymentMethod: true,
        client: { select: { id: true, name: true } },
        estimatedValue: true, actualRevenue: true,
      },
    }),
    // Completed assignments (clocked out) in range for payroll
    db.jobAssignment.findMany({
      where: {
        clockedOutAt: { not: null },
        job: { scheduledAt: { gte: fromDate, lte: toDate } },
      },
      include: { cleaner: { select: { id: true, name: true } } },
    }),
    // Active clients count
    db.client.count({ where: { active: true } }),
    // New clients created in range
    db.client.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: { id: true, name: true, createdAt: true },
    }),
  ])

  // ── Revenue metrics — source of truth: Job.actualRevenue where status = 'paid' ──
  const paidJobs = jobsInRange.filter(j => j.status === 'paid' && j.actualRevenue != null)

  const totalRevenue = paidJobs.reduce((s, j) => s + (j.actualRevenue ?? 0), 0)
  const totalOutstanding = allInvoicesInRange
    .filter(i => ['sent', 'pending', 'overdue'].includes(i.status))
    .reduce((s, i) => s + i.amount, 0)
  const totalWrittenOff = allInvoicesInRange
    .filter(i => i.status === 'written_off')
    .reduce((s, i) => s + i.amount, 0)

  // Revenue by month (keyed on job scheduledAt)
  const monthMap = new Map<string, number>()
  for (const job of paidJobs) {
    const key = format(new Date(job.scheduledAt), 'MMM yyyy')
    monthMap.set(key, (monthMap.get(key) ?? 0) + (job.actualRevenue ?? 0))
  }
  const revenueByMonth = Array.from(monthMap.entries()).map(([month, revenue]) => ({ month, revenue }))

  // Revenue by job type
  const typeRevMap = new Map<string, { revenue: number; count: number }>()
  for (const job of paidJobs) {
    const t = job.jobType
    const cur = typeRevMap.get(t) ?? { revenue: 0, count: 0 }
    typeRevMap.set(t, { revenue: cur.revenue + (job.actualRevenue ?? 0), count: cur.count + 1 })
  }
  const revenueByType = Array.from(typeRevMap.entries()).map(([type, d]) => ({ type, ...d }))

  // Revenue by payment method (uses job.paymentMethod; null → 'other')
  const pmMap = new Map<string, { revenue: number; count: number }>()
  for (const job of paidJobs) {
    const m = job.paymentMethod ?? 'other'
    const cur = pmMap.get(m) ?? { revenue: 0, count: 0 }
    pmMap.set(m, { revenue: cur.revenue + (job.actualRevenue ?? 0), count: cur.count + 1 })
  }
  const revenueByPayment = Array.from(pmMap.entries()).map(([method, d]) => ({ method, ...d }))

  // ── Job metrics ─────────────────────────────────────────────────────────────
  const statusMap = new Map<string, number>()
  const typeJobMap = new Map<string, number>()
  for (const job of jobsInRange) {
    statusMap.set(job.status, (statusMap.get(job.status) ?? 0) + 1)
    typeJobMap.set(job.jobType, (typeJobMap.get(job.jobType) ?? 0) + 1)
  }
  const jobsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }))
  const jobsByType = Array.from(typeJobMap.entries()).map(([type, count]) => ({ type, count }))
  const completed = statusMap.get('completed') ?? 0
  const cancelled = statusMap.get('cancelled') ?? 0
  const completionRate = (completed + cancelled) > 0 ? (completed / (completed + cancelled)) * 100 : 0

  // ── Payroll metrics ──────────────────────────────────────────────────────────
  const payrollMap = new Map<string, { name: string; totalMins: number; totalCost: number; jobCount: number }>()
  for (const a of assignmentsInRange) {
    const cur = payrollMap.get(a.cleaner.id) ?? { name: a.cleaner.name, totalMins: 0, totalCost: 0, jobCount: 0 }
    payrollMap.set(a.cleaner.id, {
      name: a.cleaner.name,
      totalMins: cur.totalMins + (a.durationMins ?? 0),
      totalCost: cur.totalCost + (a.laborCost ?? 0),
      jobCount: cur.jobCount + 1,
    })
  }
  const cleanerPayroll = Array.from(payrollMap.entries()).map(([cleanerId, d]) => ({
    cleanerId,
    cleanerName: d.name,
    totalHours: Math.round((d.totalMins / 60) * 10) / 10,
    totalLaborCost: d.totalCost,
    jobCount: d.jobCount,
  })).sort((a, b) => b.totalLaborCost - a.totalLaborCost)
  const totalLaborCost = cleanerPayroll.reduce((s, c) => s + c.totalLaborCost, 0)

  // ── Client metrics ───────────────────────────────────────────────────────────
  // Top clients by paid revenue in range
  const clientRevMap = new Map<string, { name: string; revenue: number; jobCount: number }>()
  for (const job of paidJobs) {
    const cur = clientRevMap.get(job.clientId) ?? { name: job.client.name, revenue: 0, jobCount: 0 }
    clientRevMap.set(job.clientId, {
      name: job.client.name,
      revenue: cur.revenue + (job.actualRevenue ?? 0),
      jobCount: cur.jobCount + 1,
    })
  }
  const topClients = Array.from(clientRevMap.entries())
    .map(([clientId, d]) => ({ clientId, clientName: d.name, revenue: d.revenue, jobCount: d.jobCount }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return (
    <Suspense>
      <ReportsClient
        role={role}
        fromDate={fromDate.toISOString()}
        toDate={toDate.toISOString()}
        currentTab={params.tab ?? 'revenue'}
        revenue={{ totalRevenue, totalOutstanding, totalWrittenOff, revenueByMonth, revenueByType, revenueByPayment }}
        jobs={{ total: jobsInRange.length, jobsByStatus, jobsByType, completionRate }}
        payroll={{ cleanerPayroll, totalLaborCost }}
        clients={{ totalActive: allActiveClients, newInPeriod: newClientsRaw.length, topClients }}
      />
    </Suspense>
  )
}
