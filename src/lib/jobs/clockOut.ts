// C-22: Shared utility — imported by both admin portal and cleaner portal (time.comfycleanco.com)
import { db } from '@/lib/db'

/**
 * After an assignment is clocked out, check if all clocked-in assignments for
 * the job now have a clock-out. If so, mark the job as completed.
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

  if (openAssignments === 0) {
    await db.job.update({
      where: { id: jobId },
      data: { status: 'completed' },
    })
  }
}
