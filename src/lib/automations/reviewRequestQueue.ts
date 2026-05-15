import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { isAutomationEnabled } from './checkAutomation'
import { subDays } from 'date-fns'

/**
 * After a job is paid, check eligibility and queue a review request.
 * Called from markInvoicePaid. Respects reviewCooldownDays and automation toggle.
 */
export async function checkAndQueueReviewRequest(jobId: string): Promise<void> {
  const enabled = await isAutomationEnabled('clientCommunications', 'reviewRequest')
  if (!enabled) return

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      client: {
        select: { id: true, name: true, lastReviewRequestedAt: true },
      },
    },
  })

  if (!job?.client) return

  const settings = await db.businessSettings.findFirst({
    select: { reviewCooldownDays: true },
  })
  const cooldownDays = settings?.reviewCooldownDays ?? 30

  // Check cooldown
  if (job.client.lastReviewRequestedAt) {
    const cutoff = subDays(new Date(), cooldownDays)
    if (job.client.lastReviewRequestedAt > cutoff) {
      await logActivity({
        eventType: ACTIVITY_EVENTS.REVIEW_REQUEST_SKIPPED,
        description: `Review request skipped for ${job.client.name} — within ${cooldownDays}-day cooldown`,
        linkPath: `/jobs/${jobId}`,
      })
      return
    }
  }

  // Check for existing queued/sent request for this job
  const existing = await db.reviewRequest.findFirst({
    where: { jobId, status: { in: ['queued', 'sent'] } },
  })
  if (existing) return

  await db.reviewRequest.create({
    data: {
      clientId: job.client.id,
      jobId,
      status: 'queued',
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.REVIEW_REQUEST_QUEUED,
    description: `Review request queued for ${job.client.name}`,
    linkPath: `/jobs/${jobId}`,
  })
}
