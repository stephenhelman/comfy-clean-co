import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'

/**
 * Queue a review request after a job completes.
 * Respects cooldown window from BusinessSettings.reviewCooldownDays.
 * Non-blocking — call without await from job completion paths.
 */
export async function queueReviewRequest(jobId: string): Promise<void> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { client: true },
  })
  if (!job || job.status !== 'completed') return

  const settings = await db.businessSettings.findFirst({
    select: { reviewCooldownDays: true },
  })
  const cooldownDays = settings?.reviewCooldownDays ?? 30

  // Skip if client was recently sent a review request
  if (job.client.lastReviewRequestedAt) {
    const daysSince =
      (Date.now() - job.client.lastReviewRequestedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < cooldownDays) {
      await logActivity({
        eventType: ACTIVITY_EVENTS.REVIEW_REQUEST_SKIPPED,
        description: `Review request skipped for ${job.client.name} — in cooldown (${Math.floor(daysSince)}d < ${cooldownDays}d)`,
        linkPath: `/reviews`,
      })
      return
    }
  }

  // Check if there's already a queued/sent request for this job
  const existing = await db.reviewRequest.findFirst({
    where: { jobId, status: { in: ['queued', 'sent'] } },
  })
  if (existing) return

  await db.reviewRequest.create({
    data: { jobId, clientId: job.clientId, status: 'queued' },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.REVIEW_REQUEST_QUEUED,
    description: `Review request queued for ${job.client.name} after completed job`,
    linkPath: `/reviews`,
  })
}
