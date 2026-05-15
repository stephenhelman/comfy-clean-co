import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { sendSms } from '@/lib/communications/sendSms'
import { COMM_EVENT_TYPES, SMS_TEMPLATES } from '@/lib/communications/templates'
import { isAutomationEnabled } from '@/lib/automations/checkAutomation'
import { subHours } from 'date-fns'

// GET /api/cron/nightly-checks — runs nightly at 9 PM
// Checks: stale leads, overdue invoices, open clock entries, capacity warnings
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await db.businessSettings.findFirst({
    select: {
      adminNotificationPhone: true,
      overdueDailyAlertThreshold: true,
      maxJobsPerDay: true,
    },
  })

  const results = await Promise.allSettled([
    checkStaleLead(settings?.adminNotificationPhone ?? null),
    checkOverdueInvoices(settings?.adminNotificationPhone ?? null, settings?.overdueDailyAlertThreshold ?? 1),
    checkOpenClockEntries(settings?.adminNotificationPhone ?? null),
    checkCapacityWarning(settings?.adminNotificationPhone ?? null, settings?.maxJobsPerDay ?? 8),
  ])

  const summary = {
    staleLead: results[0].status === 'fulfilled' ? results[0].value : 'error',
    overdueInvoices: results[1].status === 'fulfilled' ? results[1].value : 'error',
    openClockEntries: results[2].status === 'fulfilled' ? results[2].value : 'error',
    capacityWarning: results[3].status === 'fulfilled' ? results[3].value : 'error',
  }

  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('Nightly check failed:', r.reason)
    }
  }

  return NextResponse.json(summary)
}

async function checkStaleLead(adminPhone: string | null) {
  const enabled = await isAutomationEnabled('adminAlerts', 'staleLead')
  if (!enabled) return 'skipped'

  const settings = await db.businessSettings.findFirst({ select: { overdueDailyAlertThreshold: true } })
  const thresholdHours = (settings?.overdueDailyAlertThreshold ?? 1) * 24

  const cutoff = subHours(new Date(), thresholdHours)
  const staleLeads = await db.leadInquiry.findMany({
    where: {
      status: 'new',
      createdAt: { lte: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: 1,
  })

  if (staleLeads.length === 0) return 'ok'

  const lead = staleLeads[0]
  const hoursAgo = Math.round((Date.now() - lead.createdAt.getTime()) / 3_600_000)

  await logActivity({
    eventType: ACTIVITY_EVENTS.STALE_LEAD_ALERT,
    description: `Stale lead alert — ${lead.name} waiting ${hoursAgo} hours`,
    linkPath: `/leads/${lead.id}`,
  })

  if (adminPhone) {
    void sendSms({
      to: adminPhone,
      body: SMS_TEMPLATES.ADMIN_STALE_LEAD({ name: lead.name, hoursAgo }),
      eventType: COMM_EVENT_TYPES.ADMIN_STALE_LEAD,
      recipientName: 'Admin',
      skipOptInCheck: true,
    }).catch((err: unknown) => console.error('Stale lead SMS failed:', err))
  }

  return `alerted:${lead.name}`
}

async function checkOverdueInvoices(adminPhone: string | null, threshold: number) {
  const enabled = await isAutomationEnabled('adminAlerts', 'overdueInvoice')
  if (!enabled) return 'skipped'

  const overdueInvoices = await db.invoice.findMany({
    where: { status: 'overdue' },
    include: { client: { select: { name: true } } },
    orderBy: { overdueMarkedAt: 'asc' },
    take: threshold,
  })

  if (overdueInvoices.length === 0) return 'ok'

  for (const invoice of overdueInvoices) {
    await logActivity({
      eventType: ACTIVITY_EVENTS.OVERDUE_INVOICE_ALERT,
      description: `Overdue invoice alert — ${invoice.invoiceNumber} ${invoice.client.name} $${invoice.amount.toFixed(2)}`,
      linkPath: `/invoices`,
    })

    if (adminPhone) {
      void sendSms({
        to: adminPhone,
        body: SMS_TEMPLATES.ADMIN_OVERDUE_INVOICE({
          clientName: invoice.client.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount.toFixed(2),
        }),
        eventType: COMM_EVENT_TYPES.ADMIN_OVERDUE_INVOICE,
        recipientName: 'Admin',
        skipOptInCheck: true,
      }).catch((err: unknown) => console.error('Overdue invoice SMS failed:', err))
    }
  }

  return `alerted:${overdueInvoices.length}`
}

async function checkOpenClockEntries(adminPhone: string | null) {
  const enabled = await isAutomationEnabled('adminAlerts', 'openClockEntry')
  if (!enabled) return 'skipped'

  const yesterday = subHours(new Date(), 12)

  const openEntries = await db.jobAssignment.findMany({
    where: {
      clockedInAt: { not: null, lte: yesterday },
      clockedOutAt: null,
    },
    include: {
      cleaner: { select: { name: true } },
      job: { select: { serviceAddress: true, serviceCity: true } },
    },
  })

  if (openEntries.length === 0) return 'ok'

  for (const entry of openEntries) {
    const address = [entry.job.serviceAddress, entry.job.serviceCity].filter(Boolean).join(', ')

    await logActivity({
      eventType: ACTIVITY_EVENTS.OPEN_CLOCK_ALERT,
      description: `Open clock entry — ${entry.cleaner.name} never clocked out of ${address}`,
      linkPath: `/timeclock`,
    })

    if (adminPhone) {
      void sendSms({
        to: adminPhone,
        body: SMS_TEMPLATES.ADMIN_OPEN_CLOCK_ENTRY({
          cleanerName: entry.cleaner.name,
          jobAddress: address,
        }),
        eventType: COMM_EVENT_TYPES.ADMIN_OPEN_CLOCK_ENTRY,
        recipientName: 'Admin',
        skipOptInCheck: true,
      }).catch((err: unknown) => console.error('Open clock SMS failed:', err))
    }
  }

  return `alerted:${openEntries.length}`
}

async function checkCapacityWarning(adminPhone: string | null, maxJobsPerDay: number) {
  const enabled = await isAutomationEnabled('adminAlerts', 'capacityWarning')
  if (!enabled) return 'skipped'

  // Check tomorrow's job count
  const { startOfTomorrow, endOfTomorrow } = await import('date-fns')
  const tStart = startOfTomorrow()
  const tEnd = endOfTomorrow()

  const tomorrowCount = await db.job.count({
    where: {
      scheduledAt: { gte: tStart, lte: tEnd },
      status: { notIn: ['cancelled'] },
    },
  })

  const threshold = Math.floor(maxJobsPerDay * 0.9)
  if (tomorrowCount < threshold) return 'ok'

  const { format } = await import('date-fns')
  const dateStr = format(tStart, 'MMM d')

  await logActivity({
    eventType: ACTIVITY_EVENTS.CAPACITY_WARNING,
    description: `Capacity warning — ${tomorrowCount}/${maxJobsPerDay} jobs scheduled for ${dateStr}`,
    linkPath: `/calendar`,
  })

  if (adminPhone) {
    void sendSms({
      to: adminPhone,
      body: `Capacity warning: ${tomorrowCount} jobs scheduled for ${dateStr} (max ${maxJobsPerDay}). Review calendar.`,
      eventType: COMM_EVENT_TYPES.ADMIN_NEW_LEAD,
      recipientName: 'Admin',
      skipOptInCheck: true,
    }).catch((err: unknown) => console.error('Capacity warning SMS failed:', err))
  }

  return `warned:${tomorrowCount}/${maxJobsPerDay}`
}
