'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { sendPaidReceipt } from '@/lib/invoiceGenerator'
import { checkAndQueueReviewRequest } from '@/lib/automations/reviewRequestQueue'

async function getSession() {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function markInvoicePaid(
  invoiceId: string,
  amountPaid: number,
  method: string,
) {
  const session = await getSession()

  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { client: true, job: true },
  })

  await db.$transaction([
    db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        amountPaid,
        paymentType: method,
        manuallyConfirmedAt: new Date(),
        manuallyConfirmedBy: session.user.name ?? 'Admin',
      },
    }),
    db.job.update({
      where: { id: invoice.jobId },
      data: { actualRevenue: amountPaid },
    }),
  ])

  await logActivity({
    eventType: ACTIVITY_EVENTS.PAYMENT_CONFIRMED,
    description: `${invoice.invoiceNumber} marked paid — ${invoice.client.name} $${amountPaid.toFixed(2)} via ${method}`,
    linkPath: `/invoices`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  // Non-blocking receipt
  void sendPaidReceipt(invoiceId)

  // Queue review request if eligible (respects automation toggle + cooldown)
  void checkAndQueueReviewRequest(invoice.jobId).catch(
    (err: unknown) => console.error('Review request queue failed:', err),
  )

  revalidatePath('/invoices')
  revalidatePath(`/jobs/${invoice.jobId}`)
  revalidatePath('/calendar')
}

export async function voidInvoice(invoiceId: string, reason: string) {
  const session = await getSession()

  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { client: true },
  })

  if (['paid', 'voided', 'written_off'].includes(invoice.status)) {
    throw new Error('Cannot void a paid, voided, or written-off invoice')
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: 'voided', voidedAt: new Date() },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.INVOICE_VOIDED,
    description: `${invoice.invoiceNumber} voided — ${invoice.client.name} — ${reason}`,
    linkPath: `/invoices`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/invoices')
  revalidatePath(`/jobs/${invoice.jobId}`)
  revalidatePath('/calendar')
}

export async function writeOffInvoice(invoiceId: string, reason: string) {
  const session = await getSession()

  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { client: true },
  })

  if (invoice.status === 'paid') throw new Error('Cannot write off a paid invoice')

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'written_off',
      writtenOffAt: new Date(),
      writtenOffBy: session.user.name ?? 'Admin',
      writtenOffReason: reason,
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.INVOICE_WRITTEN_OFF,
    description: `${invoice.invoiceNumber} written off — ${invoice.client.name} — ${reason}`,
    linkPath: `/invoices`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/invoices')
  revalidatePath(`/jobs/${invoice.jobId}`)
}

export async function markInvoiceOverdue(invoiceId: string) {
  const session = await getSession()

  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { client: true },
  })

  if (!['sent', 'pending'].includes(invoice.status)) return

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: 'overdue', overdueMarkedAt: new Date() },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.INVOICE_OVERDUE,
    description: `${invoice.invoiceNumber} marked overdue — ${invoice.client.name}`,
    linkPath: `/invoices`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/invoices')
  revalidatePath(`/jobs/${invoice.jobId}`)
}

export async function sendReceiptEmail(invoiceId: string) {
  const session = await getSession()

  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { client: true },
  })

  if (invoice.status !== 'paid') throw new Error('Can only send receipts for paid invoices')
  if (!invoice.client.email) throw new Error('Client has no email address on file')

  await sendPaidReceipt(invoiceId)

  revalidatePath('/invoices')
}

/** Bulk transition: move all sent/pending invoices past due-date to overdue. */
export async function bulkMarkOverdue(): Promise<number> {
  const session = await getSession()
  const now = new Date()

  const stale = await db.invoice.findMany({
    where: { status: { in: ['sent', 'pending'] }, dueDate: { lt: now } },
    include: { client: true },
  })

  if (stale.length === 0) return 0

  await db.invoice.updateMany({
    where: { id: { in: stale.map(i => i.id) } },
    data: { status: 'overdue', overdueMarkedAt: now },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.INVOICE_OVERDUE,
    description: `${stale.length} invoice${stale.length !== 1 ? 's' : ''} transitioned to overdue`,
    linkPath: `/invoices`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/invoices')
  return stale.length
}
