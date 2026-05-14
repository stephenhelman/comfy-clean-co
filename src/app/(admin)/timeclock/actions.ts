'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { handleFinalClockOut } from '@/lib/jobs/clockOut'

export async function adminEditClockOut(
  assignmentId: string,
  clockedOutAt: string,
  reason: string,
) {
  // ROLE CHECK STUB — timeclock.edit_entry — Owner, Manager only — Phase 12
  // TODO Phase 12: enforce via hasPermission(session.user.role, 'timeclock.edit_entry')
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const assignment = await db.jobAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: {
      cleaner: { select: { id: true, name: true, hourlyRate: true } },
      job: { select: { id: true, serviceAddress: true, serviceCity: true } },
    },
  })

  if (!assignment.clockedInAt) throw new Error('No clock-in recorded for this assignment')

  const clockOut = new Date(clockedOutAt)
  const now = new Date()

  if (clockOut <= assignment.clockedInAt) throw new Error('Clock-out must be after clock-in')
  if (clockOut > now) throw new Error('Clock-out cannot be in the future')

  const durationMins = Math.round(
    (clockOut.getTime() - assignment.clockedInAt.getTime()) / 60000,
  )
  const hourlyRateSnapshot = assignment.cleaner.hourlyRate
  const laborCost = (durationMins / 60) * hourlyRateSnapshot

  await db.jobAssignment.update({
    where: { id: assignmentId },
    data: { clockedOutAt: clockOut, durationMins, hourlyRateSnapshot, laborCost },
  })

  await handleFinalClockOut(assignment.job.id)

  const address = [assignment.job.serviceAddress, assignment.job.serviceCity]
    .filter(Boolean)
    .join(', ')

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_TIMECLOCK_EDITED,
    description: `${session.user.name} set clock-out for ${assignment.cleaner.name} at ${address} — ${reason}`,
    linkPath: `/timeclock`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/timeclock')
  revalidatePath(`/cleaners/${assignment.cleaner.id}`)
}

export async function adminForceClockOut(assignmentId: string, reason: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const now = new Date()
  const nowIso = now.toISOString().slice(0, 16)
  await adminEditClockOut(assignmentId, nowIso, reason)
}
