import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { format } from 'date-fns'

async function sendInvoiceEmail(params: {
  to: string
  clientName: string
  invoiceNumber: string
  amount: number
  scheduledAt: Date
  jobType: string
  serviceAddress: string
  paymentType: string
  invoiceId: string
  isResend?: boolean
  pdfUrl?: string | null
}) {
  if (!process.env.RESEND_API_KEY) return
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comfycleanco.com'
  const fromEmail = process.env.EMAIL_NOREPLY ?? 'noreply@comfycleanco.com'
  const isZelle = params.paymentType === 'zelle'
  const payUrl = `${siteUrl}/pay/${params.invoiceId}`

  const dateStr = format(new Date(params.scheduledAt), 'EEEE, MMMM d, yyyy')
  const timeStr = format(new Date(params.scheduledAt), 'h:mm a')
  const subjectPrefix = params.isResend ? 'Updated: ' : ''
  const subject = `${subjectPrefix}Your Comfy Clean Appointment — ${dateStr} at ${timeStr}`

  const jobTypeLabel: Record<string, string> = {
    standard: 'Standard Cleaning',
    deep: 'Deep Clean',
    'move-out': 'Move-Out Cleaning',
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#F9FAFB;color:#111827;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <tr><td style="text-align:center;padding-bottom:24px;">
      <h2 style="color:#2B5C78;font-size:22px;margin:0;">Comfy Clean Co.</h2>
      <p style="color:#6B7280;font-size:12px;margin:4px 0;">Far East El Paso, TX · Clean · Fresh · Reliable</p>
    </td></tr>
    <tr><td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;padding:32px;">
      <h1 style="color:#111827;font-size:20px;margin-top:0;">Hi ${params.clientName}!</h1>
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        ${params.isResend ? 'Your appointment details have been updated.' : 'Thank you for booking with Comfy Clean Co.'}
        Here are your appointment details and invoice.
      </p>
      <div style="background:#F0F9FF;border-left:4px solid #2B5C78;padding:16px;margin:20px 0;border-radius:4px;">
        <p style="margin:4px 0;"><strong>Date:</strong> ${dateStr} at ${timeStr}</p>
        <p style="margin:4px 0;"><strong>Service:</strong> ${jobTypeLabel[params.jobType] ?? params.jobType}</p>
        <p style="margin:4px 0;"><strong>Address:</strong> ${params.serviceAddress}</p>
        <p style="margin:4px 0;"><strong>Invoice:</strong> ${params.invoiceNumber}</p>
        <p style="margin:4px 0;"><strong>Amount Due:</strong> $${params.amount.toFixed(2)}</p>
      </div>
      ${isZelle ? `
      <div style="background:#FFF7ED;border:1px solid #FED7AA;padding:16px;border-radius:4px;margin-bottom:20px;">
        <p style="font-weight:bold;color:#92400E;margin-top:0;">Payment Due at Time of Service</p>
        <p style="color:#78350F;font-size:13px;">Please pay via Zelle before your appointment to confirm your booking:</p>
        <p style="text-align:center;margin:16px 0;">
          <a href="${payUrl}" style="background:#2B5C78;color:#FFFFFF;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">Pay Now via Zelle →</a>
        </p>
        <p style="color:#9CA3AF;font-size:11px;">Can't click the button? Copy this link: ${payUrl}</p>
      </div>` : `
      <div style="background:#FFF7ED;border:1px solid #FED7AA;padding:16px;border-radius:4px;margin-bottom:20px;">
        <p style="font-weight:bold;color:#92400E;margin-top:0;">Payment at Time of Service</p>
        <p style="color:#78350F;font-size:13px;">Payment of <strong>$${params.amount.toFixed(2)}</strong> in <strong>${params.paymentType}</strong> is due at time of service. By scheduling this appointment you agree to pay the above amount.</p>
      </div>`}
      <p style="color:#6B7280;font-size:12px;border-top:1px solid #E5E7EB;padding-top:16px;margin-bottom:0;">
        Cancellations made less than 24 hours before your appointment may be subject to a cancellation fee.
        Questions? Reply to this email or call us directly.
      </p>
    </td></tr>
    <tr><td style="text-align:center;padding-top:20px;">
      <p style="color:#9CA3AF;font-size:11px;">Comfy Clean Co. · Far East El Paso, TX · comfycleanco.com</p>
    </td></tr>
  </table>
</body>
</html>`

  await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject,
    html,
  })
}

async function sendConfirmationEmail(params: {
  to: string
  clientName: string
  scheduledAt: Date
  jobType: string
  serviceAddress: string
}) {
  if (!process.env.RESEND_API_KEY) return
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const fromEmail = process.env.EMAIL_NOREPLY ?? 'noreply@comfycleanco.com'
  const dateStr = format(new Date(params.scheduledAt), 'EEEE, MMMM d, yyyy')
  const timeStr = format(new Date(params.scheduledAt), 'h:mm a')
  const subject = `Appointment Confirmed — ${dateStr} at ${timeStr}`
  const jobTypeLabel: Record<string, string> = {
    standard: 'Standard Cleaning',
    deep: 'Deep Clean',
    'move-out': 'Move-Out Cleaning',
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#F9FAFB;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <tr><td style="text-align:center;padding-bottom:24px;">
      <h2 style="color:#2B5C78;font-size:22px;margin:0;">Comfy Clean Co.</h2>
    </td></tr>
    <tr><td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;padding:32px;">
      <h1 style="color:#51A755;font-size:22px;margin-top:0;">✓ Appointment Confirmed</h1>
      <p style="color:#374151;">Hi ${params.clientName}, your appointment is confirmed! Here's a recap:</p>
      <div style="background:#F0FDF4;border-left:4px solid #51A755;padding:16px;margin:20px 0;border-radius:4px;">
        <p style="margin:4px 0;"><strong>Date:</strong> ${dateStr} at ${timeStr}</p>
        <p style="margin:4px 0;"><strong>Service:</strong> ${jobTypeLabel[params.jobType] ?? params.jobType}</p>
        <p style="margin:4px 0;"><strong>Address:</strong> ${params.serviceAddress}</p>
      </div>
      <p style="color:#374151;">Your cleaner will arrive at the scheduled time. Please ensure the property is accessible and any gate codes or entry instructions are ready.</p>
      <p style="color:#6B7280;font-size:12px;border-top:1px solid #E5E7EB;padding-top:16px;">
        Need to cancel or reschedule? Contact us at least 24 hours in advance to avoid a cancellation fee.
      </p>
    </td></tr>
  </table>
</body>
</html>`

  await resend.emails.send({ from: fromEmail, to: params.to, subject, html })
}

export async function generateInvoice(jobId: string, isResend = false) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { client: true },
  })

  if (!job) throw new Error('Job not found')
  if (!job.estimatedValue) {
    await logActivity({
      eventType: ACTIVITY_EVENTS.INVOICE_GENERATION_SKIP,
      description: `Invoice generation skipped for job ${jobId} — no estimated value`,
      linkPath: `/jobs/${jobId}`,
    })
    return null
  }

  const invoiceCount = await db.invoice.count()
  const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, '0')}`

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      jobId: job.id,
      clientId: job.clientId,
      amount: job.estimatedValue,
      paymentType: job.paymentMethod ?? 'cash',
      dueDate: job.scheduledAt,
      status: 'draft',
    },
  })

  // Mark sent
  await db.invoice.update({
    where: { id: invoice.id },
    data: { status: 'sent', sentAt: new Date() },
  })

  // Send invoice email if client has email
  if (job.client.email) {
    try {
      await sendInvoiceEmail({
        to: job.client.email,
        clientName: job.client.name,
        invoiceNumber,
        amount: job.estimatedValue,
        scheduledAt: job.scheduledAt,
        jobType: job.jobType,
        serviceAddress: `${job.serviceAddress}, ${job.serviceCity}`,
        paymentType: job.paymentMethod ?? 'cash',
        invoiceId: invoice.id,
        isResend,
      })
    } catch (_) {
      // Email failure doesn't block invoice creation
    }
  }

  await logActivity({
    eventType: ACTIVITY_EVENTS.INVOICE_SENT,
    description: `Invoice ${invoiceNumber} sent to ${job.client.name} — $${job.estimatedValue.toFixed(2)}`,
    linkPath: `/jobs/${jobId}`,
  })

  return invoice
}

export async function resendInvoiceEmail(jobId: string) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { client: true, invoice: true },
  })
  if (!job?.invoice || !job.client.email) return

  await sendInvoiceEmail({
    to: job.client.email,
    clientName: job.client.name,
    invoiceNumber: job.invoice.invoiceNumber,
    amount: job.invoice.amount,
    scheduledAt: job.scheduledAt,
    jobType: job.jobType,
    serviceAddress: `${job.serviceAddress}, ${job.serviceCity}`,
    paymentType: job.invoice.paymentType,
    invoiceId: job.invoice.id,
    isResend: true,
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.INVOICE_RESENT,
    description: `Invoice ${job.invoice.invoiceNumber} resent to ${job.client.name}`,
    linkPath: `/jobs/${jobId}`,
  })
}

export async function sendAppointmentConfirmation(jobId: string) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { client: true },
  })
  if (!job?.client.email) return

  try {
    await sendConfirmationEmail({
      to: job.client.email,
      clientName: job.client.name,
      scheduledAt: job.scheduledAt,
      jobType: job.jobType,
      serviceAddress: `${job.serviceAddress}, ${job.serviceCity}`,
    })
  } catch (_) {
    // Non-blocking
  }
}
