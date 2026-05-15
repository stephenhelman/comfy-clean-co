// C-22: Shared utility — imported by both admin portal and cleaner portal (time.comfycleanco.com)
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { isAutomationEnabled } from '@/lib/automations/checkAutomation'
import { checkAndQueueReviewRequest } from '@/lib/automations/reviewRequestQueue'

/**
 * After an assignment is clocked out, check if all clocked-in assignments for
 * the job now have a clock-out. If so, mark the job as completed and run
 * overdue transition + review request queue if automations are enabled.
 *
 * Must be called after any clock-out write (admin override OR cleaner self-clock-out).
 */
export async function handleFinalClockOut(jobId: string): Promise<void> {
  const openAssignments = await db.jobAssignment.count({
    where: {
      jobId,
      clockedInAt: { not: null },
      clockedOutAt: null,
    },
  })

  if (openAssignments > 0) return

  await db.job.update({
    where: { id: jobId },
    data: { status: 'completed' },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.JOB_COMPLETED,
    description: `Job completed — all cleaners clocked out`,
    linkPath: `/calendar`,
  })

  // Overdue transition: move associated invoice to overdue if past due date
  const overdueEnabled = await isAutomationEnabled('financialAutomations', 'overdueTransition')
  if (overdueEnabled) {
    const invoice = await db.invoice.findFirst({
      where: { jobId, status: { in: ['sent', 'pending'] } },
    })
    if (invoice && invoice.dueDate < new Date()) {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: 'overdue', overdueMarkedAt: new Date() },
      })
      await logActivity({
        eventType: ACTIVITY_EVENTS.INVOICE_OVERDUE,
        description: `Invoice ${invoice.invoiceNumber} auto-transitioned to overdue on job completion`,
        linkPath: `/invoices`,
      })
    }
  }

  // Queue review request — skipped if automation is off or client is in cooldown
  void checkAndQueueReviewRequest(jobId).catch((err: unknown) =>
    console.error('Review request queue failed:', err),
  )
}
