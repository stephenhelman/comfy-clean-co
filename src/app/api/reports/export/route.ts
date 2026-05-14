import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const v = row[h]
        if (v == null) return ''
        const s = String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
      }).join(',')
    ),
  ]
  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'revenue'
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  const fromDate = fromParam ? startOfDay(new Date(fromParam)) : startOfDay(subDays(new Date(), 30))
  const toDate = toParam ? endOfDay(new Date(toParam)) : endOfDay(new Date())

  let csv = ''
  let filename = ''

  if (type === 'revenue') {
    const invoices = await db.invoice.findMany({
      where: { paidAt: { gte: fromDate, lte: toDate }, status: 'paid' },
      include: {
        client: { select: { name: true } },
        job: { select: { scheduledAt: true, jobType: true, serviceAddress: true, serviceCity: true, serviceZip: true } },
      },
      orderBy: { paidAt: 'asc' },
    })

    const rows = invoices.map(i => ({
      'Invoice #': i.invoiceNumber,
      'Client': i.client.name,
      'Service Date': format(i.job.scheduledAt, 'yyyy-MM-dd'),
      'Address': `${i.job.serviceAddress}, ${i.job.serviceCity}, TX ${i.job.serviceZip}`,
      'Job Type': i.job.jobType,
      'Invoice Amount': i.amount.toFixed(2),
      'Amount Paid': (i.amountPaid ?? i.amount).toFixed(2),
      'Payment Method': i.paymentType,
      'Paid Date': i.paidAt ? format(i.paidAt, 'yyyy-MM-dd') : '',
      'Invoice Date': format(i.invoiceDate, 'yyyy-MM-dd'),
    }))

    csv = toCsv(rows)
    filename = `revenue-${format(fromDate, 'yyyy-MM-dd')}-to-${format(toDate, 'yyyy-MM-dd')}.csv`
  } else if (type === 'payroll') {
    const assignments = await db.jobAssignment.findMany({
      where: {
        clockedOutAt: { not: null },
        job: { scheduledAt: { gte: fromDate, lte: toDate } },
      },
      include: {
        cleaner: { select: { name: true } },
        job: {
          select: {
            scheduledAt: true, serviceAddress: true, serviceCity: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: [{ cleaner: { name: 'asc' } }, { clockedInAt: 'asc' }],
    })

    const rows = assignments.map(a => ({
      'Cleaner': a.cleaner.name,
      'Client': a.job.client.name,
      'Service Date': format(a.job.scheduledAt, 'yyyy-MM-dd'),
      'Address': `${a.job.serviceAddress}, ${a.job.serviceCity}`,
      'Clock In': a.clockedInAt ? format(a.clockedInAt, 'yyyy-MM-dd HH:mm') : '',
      'Clock Out': a.clockedOutAt ? format(a.clockedOutAt, 'yyyy-MM-dd HH:mm') : '',
      'Duration (min)': a.durationMins ?? '',
      'Hours': a.durationMins != null ? (a.durationMins / 60).toFixed(2) : '',
      'Hourly Rate': a.hourlyRateSnapshot?.toFixed(2) ?? '',
      'Labor Cost': a.laborCost?.toFixed(2) ?? '',
    }))

    csv = toCsv(rows)
    filename = `payroll-${format(fromDate, 'yyyy-MM-dd')}-to-${format(toDate, 'yyyy-MM-dd')}.csv`
  } else if (type === 'jobs') {
    const jobs = await db.job.findMany({
      where: { scheduledAt: { gte: fromDate, lte: toDate } },
      include: {
        client: { select: { name: true } },
        invoice: { select: { invoiceNumber: true, amount: true, status: true } },
        assignments: { include: { cleaner: { select: { name: true } } } },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    const rows = jobs.map(j => ({
      'Job Date': format(j.scheduledAt, 'yyyy-MM-dd HH:mm'),
      'Client': j.client.name,
      'Address': `${j.serviceAddress}, ${j.serviceCity}, TX ${j.serviceZip}`,
      'Job Type': j.jobType,
      'Status': j.status,
      'Cleaners': j.assignments.map(a => a.cleaner.name).join('; '),
      'Est. Value': j.estimatedValue?.toFixed(2) ?? '',
      'Actual Revenue': j.actualRevenue?.toFixed(2) ?? '',
      'Invoice #': j.invoice?.invoiceNumber ?? '',
      'Invoice Status': j.invoice?.status ?? '',
      'Recurring': j.recurringRule ? 'Yes' : 'No',
    }))

    csv = toCsv(rows)
    filename = `jobs-${format(fromDate, 'yyyy-MM-dd')}-to-${format(toDate, 'yyyy-MM-dd')}.csv`
  } else {
    return NextResponse.json({ error: 'Unknown export type' }, { status: 400 })
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
