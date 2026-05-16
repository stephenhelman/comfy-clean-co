'use server'

import { db } from '@/lib/db'
import { verifyCleanerSession } from '@/lib/cleanerAuth'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { handleFinalClockOut } from '@/lib/jobs/clockOut' // PC-08: static import
import { revalidatePath } from 'next/cache'

// ── Clock In ───────────────────────────────────────────────

export async function clockIn(assignmentId: string) {
  const session = await verifyCleanerSession()
  if (!session) return { error: 'Not authenticated' }

  const assignment = await db.jobAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      job: {
        include: {
          client: { select: { name: true } },
        },
      },
    },
  })

  if (!assignment) return { error: 'Assignment not found.' }
  if (assignment.cleanerId !== session.cleanerId) return { error: 'Not authorized.' }
  if (assignment.clockedInAt) return { error: 'Already clocked in.' }

  if (!['scheduled', 'in_progress'].includes(assignment.job.status)) {
    return { error: 'This job cannot be clocked into.' }
  }

  // Check for any other active clock-in for this cleaner
  const activeClockIn = await db.jobAssignment.findFirst({
    where: {
      cleanerId: session.cleanerId,
      clockedInAt: { not: null },
      clockedOutAt: null,
    },
  })

  if (activeClockIn) {
    return { error: 'You are already clocked into another job. Clock out first.' }
  }

  const now = new Date()

  await db.jobAssignment.update({
    where: { id: assignmentId },
    data: { clockedInAt: now },
  })

  await db.job.update({
    where: { id: assignment.jobId },
    data: { status: 'in_progress' },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_CLOCKED_IN,
    description: `${session.name} clocked in at ${assignment.job.client.name}`,
    linkPath: `/jobs/${assignment.jobId}`,
  })

  // Cleaner on the way automation — dynamic because module may not exist in all envs
  try {
    const { handleClockIn } = await import('@/lib/automations/cleanerOnTheWay')
    await handleClockIn(assignmentId)
  } catch {
    // Automation failure never blocks clock-in
  }

  revalidatePath('/home')
  return { success: true, clockedInAt: now.toISOString() }
}

// ── Clock In GPS (called after clockIn succeeds) ───────────

export async function clockInWithGps(
  assignmentId: string,
  gpsLat: number | null,
  gpsLng: number | null,
  gpsBlocked: boolean,
) {
  const session = await verifyCleanerSession()
  if (!session) return { error: 'Not authenticated' }

  await db.jobAssignment.update({
    where: { id: assignmentId, cleanerId: session.cleanerId },
    data: { gpsLat, gpsLng, gpsBlocked },
  })

  return { success: true }
}

// ── Clock Out ──────────────────────────────────────────────

export async function clockOut(assignmentId: string) {
  const session = await verifyCleanerSession()
  if (!session) return { error: 'Not authenticated' }

  const assignment = await db.jobAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      job: { include: { client: { select: { name: true } } } },
      cleaner: { select: { hourlyRate: true } },
    },
  })

  if (!assignment) return { error: 'Assignment not found.' }
  if (assignment.cleanerId !== session.cleanerId) return { error: 'Not authorized.' }
  if (!assignment.clockedInAt) return { error: 'Not clocked in.' }
  if (assignment.clockedOutAt) return { error: 'Already clocked out.' }

  const now = new Date()
  const minutesElapsed = (now.getTime() - assignment.clockedInAt.getTime()) / 60000

  // 5-minute soft warning — client shows confirmation before calling clockOutConfirmed
  if (minutesElapsed < 5) {
    return {
      warning: true,
      message: `You clocked in less than 5 minutes ago. Are you sure you want to clock out?`,
    }
  }

  return processClockOut(assignmentId, session.cleanerId, session.name, now, assignment)
}

// ── Clock Out Confirmed (after early-clock-out warning) ───

export async function clockOutConfirmed(assignmentId: string) {
  const session = await verifyCleanerSession()
  if (!session) return { error: 'Not authenticated' }

  const assignment = await db.jobAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      job: { include: { client: { select: { name: true } } } },
      cleaner: { select: { hourlyRate: true } },
    },
  })

  if (!assignment || assignment.cleanerId !== session.cleanerId) {
    return { error: 'Not authorized.' }
  }

  return processClockOut(assignmentId, session.cleanerId, session.name, new Date(), assignment)
}

// ── Shared clock-out logic ─────────────────────────────────

async function processClockOut(
  assignmentId: string,
  cleanerId: string,
  cleanerName: string,
  now: Date,
  assignment: {
    clockedInAt: Date | null
    jobId: string
    job: { client: { name: string } }
    cleaner: { hourlyRate: number }
  },
) {
  const clockedInAt = assignment.clockedInAt!
  const durationMins = Math.floor((now.getTime() - clockedInAt.getTime()) / 60000)
  const hourlyRate = assignment.cleaner.hourlyRate
  const laborCost = (durationMins / 60) * hourlyRate

  await db.jobAssignment.update({
    where: { id: assignmentId },
    data: {
      clockedOutAt: now,
      durationMins,
      hourlyRateSnapshot: hourlyRate,
      laborCost,
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_CLOCKED_OUT,
    description: `${cleanerName} clocked out of ${assignment.job.client.name} — ${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
    linkPath: `/jobs/${assignment.jobId}`,
  })

  // Transition job to completed if all cleaners have clocked out
  try {
    await handleFinalClockOut(assignment.jobId) // PC-08: static import used above
  } catch {
    // Never block clock-out if this fails
  }

  revalidatePath('/home')

  return {
    success: true,
    clockedOutAt: now.toISOString(),
    durationMins,
    summary: {
      clockedInAt: clockedInAt.toISOString(),
      clockedOutAt: now.toISOString(),
      durationMins,
    },
  }
}

// ── Clock Out GPS (called after clockOut succeeds) ─────────

export async function clockOutWithGps(
  assignmentId: string,
  gpsLat: number | null,
  gpsLng: number | null,
  gpsBlocked: boolean,
) {
  const session = await verifyCleanerSession()
  if (!session) return

  await db.jobAssignment.update({
    where: { id: assignmentId, cleanerId: session.cleanerId },
    data: { clockOutGpsLat: gpsLat, clockOutGpsLng: gpsLng, clockOutGpsBlocked: gpsBlocked },
  })
}
