'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { generateInvoice, resendInvoiceEmail, sendAppointmentConfirmation } from '@/lib/invoiceGenerator'
import { isAutomationEnabled } from '@/lib/automations/checkAutomation'
import { z } from 'zod'
import { format, addWeeks, addMonths, isBefore } from 'date-fns'
import { randomBytes } from 'crypto'
function createId() { return randomBytes(12).toString('hex') }

async function getSession() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

const jobSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  serviceAddress: z.string().min(1, 'Address required'),
  serviceCity: z.string().min(1, 'City required'),
  serviceZip: z.string().length(5, 'Zip must be 5 digits'),
  scheduledAt: z.string().min(1, 'Date and time required'),
  estimatedHours: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive().optional(),
  ),
  jobType: z.enum(['standard', 'deep', 'move-out']),
  recurringRule: z.enum(['none', 'weekly', 'biweekly', 'monthly']).default('none'),
  notes: z.string().optional(),
  estimatedValue: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive('Estimated value must be a positive number').optional(),
  ),
  paymentMethod: z.string().optional(),
})

function generateRecurringDates(startDate: Date, rule: string): Date[] {
  const dates: Date[] = [startDate]
  const sixMonthsOut = addMonths(startDate, 6)
  let current = startDate

  while (true) {
    if (rule === 'weekly') current = addWeeks(current, 1)
    else if (rule === 'biweekly') current = addWeeks(current, 2)
    else if (rule === 'monthly') current = addMonths(current, 1)
    else break

    if (!isBefore(current, sixMonthsOut)) break
    dates.push(new Date(current))
  }

  return dates
}

export async function createJob(formData: FormData) {
  const session = await getSession()

  const parsed = jobSchema.safeParse({
    clientId: formData.get('clientId'),
    serviceAddress: formData.get('serviceAddress'),
    serviceCity: formData.get('serviceCity'),
    serviceZip: formData.get('serviceZip'),
    scheduledAt: formData.get('scheduledAt'),
    estimatedHours: formData.get('estimatedHours') || undefined,
    jobType: formData.get('jobType'),
    recurringRule: formData.get('recurringRule') || 'none',
    notes: formData.get('notes') || undefined,
    estimatedValue: formData.get('estimatedValue') || undefined,
    paymentMethod: formData.get('paymentMethod') || undefined,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed')
  }

  const data = parsed.data

  // Check blackout dates (C-18)
  const settings = await db.businessSettings.findFirst()
  const scheduledDate = new Date(data.scheduledAt)
  const blackoutDates = settings?.blackoutDates ?? []
  const isBlackout = blackoutDates.some((d) => {
    const bd = new Date(d)
    return (
      bd.getFullYear() === scheduledDate.getFullYear() &&
      bd.getMonth() === scheduledDate.getMonth() &&
      bd.getDate() === scheduledDate.getDate()
    )
  })
  if (isBlackout) {
    throw new Error('This date is marked as unavailable. Please select another date.')
  }

  const client = await db.client.findUniqueOrThrow({ where: { id: data.clientId } })

  const recurringRule = data.recurringRule === 'none' ? null : data.recurringRule
  const dates = recurringRule ? generateRecurringDates(scheduledDate, recurringRule) : [scheduledDate]
  const recurringGroupId = recurringRule ? createId() : null

  let firstJob: { id: string } | null = null

  for (let i = 0; i < dates.length; i++) {
    const job = await db.job.create({
      data: {
        clientId: data.clientId,
        serviceAddress: data.serviceAddress,
        serviceCity: data.serviceCity,
        serviceZip: data.serviceZip,
        scheduledAt: dates[i],
        estimatedHours: data.estimatedHours ?? null,
        jobType: data.jobType,
        notes: data.notes ?? null,
        estimatedValue: data.estimatedValue ?? null,
        paymentMethod: data.paymentMethod ?? null,
        status: 'stand_by',
        recurringRule,
        recurringGroupId,
        isRecurringRoot: i === 0,
      },
    })

    if (i === 0) firstJob = job

    // Auto-generate invoice for each instance (skipped if financialAutomations.invoiceGeneration is off)
    if (await isAutomationEnabled('financialAutomations', 'invoiceGeneration')) {
      await generateInvoice(job.id)
    }
  }

  await logActivity({
    eventType: ACTIVITY_EVENTS.JOB_CREATED,
    description: `New job created — ${client.name} on ${format(scheduledDate, 'MMM d, yyyy')}${dates.length > 1 ? ` (+${dates.length - 1} recurring)` : ''}`,
    linkPath: `/jobs/${firstJob!.id}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect(`/calendar?date=${format(scheduledDate, 'yyyy-MM-dd')}&jobId=${firstJob!.id}`)
}

export async function updateJob(jobId: string, formData: FormData) {
  const session = await getSession()

  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { client: true, invoice: true },
  })

  const editScope = (formData.get('editScope') as string) ?? 'this'

  const data = {
    serviceAddress: formData.get('serviceAddress') as string,
    serviceCity: formData.get('serviceCity') as string,
    serviceZip: formData.get('serviceZip') as string,
    scheduledAt: formData.get('scheduledAt') as string,
    estimatedHours: formData.get('estimatedHours') ? Number(formData.get('estimatedHours')) : null,
    jobType: formData.get('jobType') as string,
    notes: (formData.get('notes') as string) || null,
    estimatedValue: formData.get('estimatedValue') ? Number(formData.get('estimatedValue')) : null,
    paymentMethod: (formData.get('paymentMethod') as string) || null,
  }

  const newScheduledAt = new Date(data.scheduledAt)
  const rescheduled = job.scheduledAt.toISOString() !== newScheduledAt.toISOString()

  if (editScope === 'this' || !job.recurringGroupId) {
    await db.job.update({
      where: { id: jobId },
      data: {
        serviceAddress: data.serviceAddress,
        serviceCity: data.serviceCity,
        serviceZip: data.serviceZip,
        scheduledAt: newScheduledAt,
        estimatedHours: data.estimatedHours,
        jobType: data.jobType,
        notes: data.notes,
        estimatedValue: data.estimatedValue,
        paymentMethod: data.paymentMethod,
        recurringGroupId: editScope === 'this' ? null : job.recurringGroupId,
      },
    })

    if (rescheduled && job.invoice) {
      await db.invoice.update({
        where: { id: job.invoice.id },
        data: { dueDate: newScheduledAt },
      })
      await resendInvoiceEmail(jobId)
    }
  } else {
    // Edit this and all future stand_by instances
    const today = new Date()
    const futureJobs = await db.job.findMany({
      where: {
        recurringGroupId: job.recurringGroupId,
        scheduledAt: { gte: today },
        status: 'stand_by',
      },
    })

    for (const fj of futureJobs) {
      await db.job.update({
        where: { id: fj.id },
        data: {
          serviceAddress: data.serviceAddress,
          serviceCity: data.serviceCity,
          serviceZip: data.serviceZip,
          jobType: data.jobType,
          notes: data.notes,
          estimatedValue: data.estimatedValue,
          paymentMethod: data.paymentMethod,
        },
      })
    }
  }

  await logActivity({
    eventType: ACTIVITY_EVENTS.JOB_EDITED,
    description: `${session.user.name} edited ${job.client.name} job on ${format(new Date(job.scheduledAt), 'MMM d, yyyy')}`,
    linkPath: `/jobs/${jobId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect(`/calendar?date=${format(newScheduledAt, 'yyyy-MM-dd')}&jobId=${jobId}`)
}

export async function confirmZellePayment(jobId: string, amountPaid: number) {
  const session = await getSession()

  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { client: true, invoice: true },
  })

  if (!job.invoice) throw new Error('No invoice found for this job')

  await db.$transaction([
    db.invoice.update({
      where: { id: job.invoice.id },
      data: { status: 'paid', paidAt: new Date(), amountPaid },
    }),
    db.job.update({
      where: { id: jobId },
      data: { status: 'scheduled', actualRevenue: amountPaid },
    }),
  ])

  await sendAppointmentConfirmation(jobId)

  await logActivity({
    eventType: ACTIVITY_EVENTS.PAYMENT_CONFIRMED,
    description: `Payment confirmed for ${job.invoice.invoiceNumber} — ${job.client.name} $${amountPaid.toFixed(2)}`,
    linkPath: `/jobs/${jobId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/calendar`)
  revalidatePath(`/jobs/${jobId}`)
}

export async function confirmCashAppointment(jobId: string) {
  const session = await getSession()

  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { client: true, invoice: true },
  })

  if (!job.invoice) throw new Error('No invoice found for this job')

  await db.$transaction([
    db.invoice.update({
      where: { id: job.invoice.id },
      data: {
        status: 'paid',
        manuallyConfirmedAt: new Date(),
        manuallyConfirmedBy: session.user.name ?? 'Admin',
      },
    }),
    db.job.update({
      where: { id: jobId },
      data: { status: 'scheduled' },
    }),
  ])

  await sendAppointmentConfirmation(jobId)

  await logActivity({
    eventType: ACTIVITY_EVENTS.APPOINTMENT_CONFIRMED,
    description: `Cash appointment confirmed — ${job.client.name} on ${format(new Date(job.scheduledAt), 'MMM d, yyyy')}`,
    linkPath: `/jobs/${jobId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/calendar`)
  revalidatePath(`/jobs/${jobId}`)
}

export async function assignCleaner(jobId: string, cleanerId: string) {
  const session = await getSession()

  const [job, cleaner] = await Promise.all([
    db.job.findUniqueOrThrow({ where: { id: jobId }, include: { client: true } }),
    db.cleaner.findUniqueOrThrow({ where: { id: cleanerId } }),
  ])

  await db.jobAssignment.create({
    data: { jobId, cleanerId },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_ASSIGNED,
    description: `${cleaner.name} assigned to ${job.client.name} job on ${format(new Date(job.scheduledAt), 'MMM d, yyyy')}`,
    linkPath: `/jobs/${jobId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/calendar`)
  revalidatePath(`/jobs/${jobId}`)
}

export async function removeCleaner(assignmentId: string, jobId: string) {
  const session = await getSession()

  const assignment = await db.jobAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: {
      cleaner: true,
      job: { include: { client: true } },
    },
  })

  if (assignment.clockedInAt) {
    throw new Error('Cannot remove a cleaner who has already clocked in')
  }

  await db.jobAssignment.delete({ where: { id: assignmentId } })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLEANER_REMOVED,
    description: `${assignment.cleaner.name} removed from ${assignment.job.client.name} job on ${format(new Date(assignment.job.scheduledAt), 'MMM d, yyyy')}`,
    linkPath: `/jobs/${jobId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/calendar`)
  revalidatePath(`/jobs/${jobId}`)
}

export async function cancelJob(
  jobId: string,
  cancelReason: string,
  cancellationType: string,
  cancellationFee: number | null,
  refundAmount: number | null,
  cancelScope: 'this' | 'future',
) {
  const session = await getSession()

  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { client: true, invoice: true },
  })

  if (job.status === 'in_progress') {
    throw new Error('Cannot cancel a job in progress. Clock out all cleaners first.')
  }

  await db.job.update({
    where: { id: jobId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason,
      cancellationType,
      cancellationFee,
    },
  })

  // Update invoice based on type
  if (job.invoice) {
    let invoiceStatus = 'voided'
    const invoiceUpdate: Record<string, unknown> = { voidedAt: new Date() }

    if (cancellationType === 'full_refund') {
      invoiceStatus = 'refunded'
      invoiceUpdate.refundAmount = job.invoice.amountPaid
      invoiceUpdate.voidedAt = null
    } else if (cancellationType === 'partial_refund') {
      invoiceStatus = 'partially_refunded'
      invoiceUpdate.refundAmount = refundAmount
      invoiceUpdate.voidedAt = null
    }

    await db.invoice.update({
      where: { id: job.invoice.id },
      data: { status: invoiceStatus, ...invoiceUpdate },
    })
  }

  await logActivity({
    eventType: ACTIVITY_EVENTS.JOB_CANCELLED,
    description: `${job.client.name} job cancelled — ${cancellationType} — ${cancelReason}`,
    linkPath: `/jobs/${jobId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  // Cancel future recurring instances (stand_by only)
  if (cancelScope === 'future' && job.recurringGroupId) {
    const today = new Date()
    const futureJobs = await db.job.findMany({
      where: {
        recurringGroupId: job.recurringGroupId,
        scheduledAt: { gt: job.scheduledAt },
        status: 'stand_by',
        NOT: { id: jobId },
      },
      include: { invoice: true },
    })

    for (const fj of futureJobs) {
      await db.job.update({
        where: { id: fj.id },
        data: { status: 'cancelled', cancelledAt: today, cancelReason, cancellationType: 'no_fee' },
      })
      if (fj.invoice) {
        await db.invoice.update({
          where: { id: fj.invoice.id },
          data: { status: 'voided', voidedAt: today },
        })
      }
    }
  }

  revalidatePath('/calendar')
  revalidatePath(`/jobs/${jobId}`)
}

export async function bumpJob(jobId: string, newDate: string) {
  const session = await getSession()

  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { client: true, invoice: true },
  })

  const newScheduledAt = new Date(newDate)

  // Mark original as bumped, void its invoice
  await db.job.update({
    where: { id: jobId },
    data: { status: 'bump', cancelledAt: new Date() },
  })
  if (job.invoice) {
    await db.invoice.update({
      where: { id: job.invoice.id },
      data: { status: 'voided', voidedAt: new Date() },
    })
  }

  // Create replacement job
  const newJob = await db.job.create({
    data: {
      clientId: job.clientId,
      serviceAddress: job.serviceAddress,
      serviceCity: job.serviceCity,
      serviceZip: job.serviceZip,
      scheduledAt: newScheduledAt,
      estimatedHours: job.estimatedHours,
      jobType: job.jobType,
      notes: job.notes,
      estimatedValue: job.estimatedValue,
      paymentMethod: job.paymentMethod,
      status: 'stand_by',
    },
  })

  if (await isAutomationEnabled('financialAutomations', 'invoiceGeneration')) {
    await generateInvoice(newJob.id)
  }

  await logActivity({
    eventType: ACTIVITY_EVENTS.JOB_BUMPED,
    description: `${session.user.name} bumped ${job.client.name} from ${format(new Date(job.scheduledAt), 'MMM d')} to ${format(newScheduledAt, 'MMM d, yyyy')}`,
    linkPath: `/jobs/${newJob.id}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect(`/calendar?date=${format(newScheduledAt, 'yyyy-MM-dd')}&jobId=${newJob.id}`)
}

export async function markLockOut(jobId: string, notes: string) {
  const session = await getSession()

  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { client: true },
  })

  await db.job.update({
    where: { id: jobId },
    data: { status: 'lock_out', notes: notes || job.notes },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.JOB_LOCK_OUT,
    description: `Locked out at ${job.client.name} on ${format(new Date(job.scheduledAt), 'MMM d, yyyy')}`,
    linkPath: `/jobs/${jobId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/calendar')
  revalidatePath(`/jobs/${jobId}`)
}

export async function resendInvoice(jobId: string) {
  const session = await getSession()
  await resendInvoiceEmail(jobId)
  revalidatePath(`/jobs/${jobId}`)
}
