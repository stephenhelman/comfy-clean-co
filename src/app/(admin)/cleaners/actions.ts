'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { requirePermission } from '@/lib/requirePermission'
import { handleFinalClockOut } from '@/lib/jobs/clockOut'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

async function getSession() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

const cleanerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().min(10).max(11))
    .optional()
    .or(z.literal('')),
  dateHired: z.string().optional().or(z.literal('')),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  hourlyRate: z.preprocess(
    (v) => Number(v),
    z.number().positive('Hourly rate must be a positive number'),
  ),
  payType: z.enum(['hourly', 'per_job']).default('hourly'),
  availableDays: z.array(z.string()).optional().default([]),
  internalNotes: z.string().optional(),
})

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  confirmPin: z.string(),
})

function parseCleanerFormData(formData: FormData) {
  const availableDays = formData.getAll('availableDays') as string[]
  return {
    name: formData.get('name') as string,
    email: (formData.get('email') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    dateHired: (formData.get('dateHired') as string) || undefined,
    emergencyContactName: (formData.get('emergencyContactName') as string) || undefined,
    emergencyContactPhone: (formData.get('emergencyContactPhone') as string) || undefined,
    hourlyRate: formData.get('hourlyRate') as string,
    payType: (formData.get('payType') as string) || 'hourly',
    availableDays,
    internalNotes: (formData.get('internalNotes') as string) || undefined,
  }
}

export async function createCleaner(formData: FormData) {
  const session = await getSession()

  const pin = formData.get('pin') as string
  const confirmPin = formData.get('confirmPin') as string

  const pinResult = pinSchema.safeParse({ pin, confirmPin })
  if (!pinResult.success) {
    throw new Error(pinResult.error.issues[0]?.message ?? 'Invalid PIN')
  }
  if (pin !== confirmPin) {
    throw new Error('PINs do not match')
  }

  const parsed = cleanerSchema.safeParse(parseCleanerFormData(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed')
  }

  const data = parsed.data
  const pinHash = await bcrypt.hash(pin, 10)

  const cleaner = await db.cleaner.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      dateHired: data.dateHired ? new Date(data.dateHired) : null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      pinHash,
      hourlyRate: data.hourlyRate,
      payType: data.payType,
      availableDays: data.availableDays,
      internalNotes: data.internalNotes || null,
      active: true,
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_CREATED,
    description: `New cleaner added — ${cleaner.name}`,
    linkPath: `/cleaners/${cleaner.id}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect(`/cleaners/${cleaner.id}`)
}

export async function updateCleaner(cleanerId: string, formData: FormData) {
  const session = await getSession()
  const cleaner = await db.cleaner.findUniqueOrThrow({ where: { id: cleanerId } })

  const parsed = cleanerSchema.safeParse(parseCleanerFormData(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed')
  }

  const data = parsed.data
  await db.cleaner.update({
    where: { id: cleanerId },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      dateHired: data.dateHired ? new Date(data.dateHired) : null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      hourlyRate: data.hourlyRate,
      payType: data.payType,
      availableDays: data.availableDays,
      internalNotes: data.internalNotes || null,
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_UPDATED,
    description: `${session.user.name} updated cleaner record for ${cleaner.name}`,
    linkPath: `/cleaners/${cleanerId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect(`/cleaners/${cleanerId}`)
}

export async function deactivateCleaner(cleanerId: string) {
  const session = await getSession()
  const cleaner = await db.cleaner.findUniqueOrThrow({ where: { id: cleanerId } })

  const today = new Date()
  const futureAssignments = await db.jobAssignment.findMany({
    where: {
      cleanerId,
      job: { scheduledAt: { gte: today }, status: 'scheduled' },
    },
    select: { id: true },
  })

  await db.$transaction([
    db.jobAssignment.deleteMany({
      where: { id: { in: futureAssignments.map((a) => a.id) } },
    }),
    db.cleaner.update({
      where: { id: cleanerId },
      data: { active: false },
    }),
  ])

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_DEACTIVATED,
    description: `${session.user.name} deactivated cleaner ${cleaner.name} — removed from ${futureAssignments.length} upcoming job${futureAssignments.length !== 1 ? 's' : ''}`,
    linkPath: `/cleaners/${cleanerId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect('/cleaners')
}

export async function reactivateCleaner(cleanerId: string) {
  const session = await getSession()
  const cleaner = await db.cleaner.findUniqueOrThrow({ where: { id: cleanerId } })

  await db.cleaner.update({
    where: { id: cleanerId },
    data: { active: true, pinLockedUntil: null, pinAttempts: 0 },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_REACTIVATED,
    description: `${session.user.name} reactivated cleaner ${cleaner.name}`,
    linkPath: `/cleaners/${cleanerId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/cleaners/${cleanerId}`)
  revalidatePath('/cleaners')
}

export async function resetPin(cleanerId: string, pin: string, confirmPin: string) {
  const session = await getSession()
  const cleaner = await db.cleaner.findUniqueOrThrow({ where: { id: cleanerId } })

  const result = pinSchema.safeParse({ pin, confirmPin })
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Invalid PIN')
  }
  if (pin !== confirmPin) {
    throw new Error('PINs do not match')
  }

  const pinHash = await bcrypt.hash(pin, 10)
  await db.cleaner.update({
    where: { id: cleanerId },
    data: { pinHash, pinAttempts: 0, pinLockedUntil: null },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_PIN_RESET,
    description: `${session.user.name} reset PIN for ${cleaner.name}`,
    linkPath: `/cleaners/${cleanerId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/cleaners/${cleanerId}`)
}

export async function unlockPin(cleanerId: string) {
  const session = await getSession()
  const cleaner = await db.cleaner.findUniqueOrThrow({ where: { id: cleanerId } })

  await db.cleaner.update({
    where: { id: cleanerId },
    data: { pinLockedUntil: null, pinAttempts: 0 },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_PIN_RESET,
    description: `${session.user.name} unlocked PIN for ${cleaner.name}`,
    linkPath: `/cleaners/${cleanerId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/cleaners/${cleanerId}`)
}

export async function saveCleanerNotes(cleanerId: string, notes: string) {
  const session = await getSession()
  const cleaner = await db.cleaner.findUniqueOrThrow({ where: { id: cleanerId } })

  await db.cleaner.update({
    where: { id: cleanerId },
    data: { internalNotes: notes },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_UPDATED,
    description: `${session.user.name} updated notes for ${cleaner.name}`,
    linkPath: `/cleaners/${cleanerId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })
}

export async function editClockOut(
  assignmentId: string,
  clockedOutAt: string,
  reason: string,
) {
  const session = await getSession()

  const assignment = await db.jobAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: {
      cleaner: true,
      job: { select: { id: true, serviceAddress: true, serviceCity: true } },
    },
  })

  if (!assignment.clockedInAt) {
    throw new Error('No clock-in recorded for this assignment')
  }

  const clockOut = new Date(clockedOutAt)
  const now = new Date()

  if (clockOut <= assignment.clockedInAt) {
    throw new Error('Clock-out must be after clock-in')
  }
  if (clockOut > now) {
    throw new Error('Clock-out cannot be in the future')
  }

  const durationMins = Math.round(
    (clockOut.getTime() - assignment.clockedInAt.getTime()) / 60000,
  )
  const hourlyRateSnapshot = assignment.cleaner.hourlyRate
  const laborCost = (durationMins / 60) * hourlyRateSnapshot

  await db.jobAssignment.update({
    where: { id: assignmentId },
    data: { clockedOutAt: clockOut, durationMins, hourlyRateSnapshot, laborCost },
  })

  await handleFinalClockOut(assignment.jobId)

  const address = [assignment.job.serviceAddress, assignment.job.serviceCity]
    .filter(Boolean)
    .join(', ')

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_UPDATED,
    description: `${session.user.name} manually set clock-out for ${assignment.cleaner.name} on ${address} — ${reason}`,
    linkPath: `/cleaners/${assignment.cleanerId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/cleaners/${assignment.cleanerId}`)
}

export async function resetCleanerDeviceAccess(cleanerId: string) {
  const session = await getSession()
  await requirePermission('cleaners.reset_pin')

  const cleaner = await db.cleaner.findUniqueOrThrow({ where: { id: cleanerId } })

  await db.cleanerSession.deleteMany({ where: { cleanerId } })
  await db.cleaner.update({
    where: { id: cleanerId },
    data: { pinAttempts: 0, pinLockedUntil: null },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_DEVICE_RESET,
    description: `${session.user.name} reset device access for ${cleaner.name}`,
    linkPath: `/cleaners/${cleanerId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/cleaners/${cleanerId}`)
  return { success: true }
}
