import { db } from '@/lib/db'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: { filename: string; content: Buffer }[]
  eventType: string
  recipientName: string
  clientId?: string
  leadId?: string
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const settings = await db.businessSettings.findFirst({
    select: { emailFromName: true, emailReplyTo: true },
  })

  const comm = await db.communication.create({
    data: {
      recipientName: params.recipientName,
      recipientEmail: params.to,
      channel: 'email',
      eventType: params.eventType,
      subject: params.subject,
      body: params.html,
      clientId: params.clientId ?? null,
      leadId: params.leadId ?? null,
      status: 'pending',
    },
  })

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const fromName = settings?.emailFromName ?? 'Comfy Clean Co.'
    const result = await resend.emails.send({
      from: `${fromName} <hello@comfycleanco.com>`,
      replyTo: settings?.emailReplyTo ?? undefined,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments,
    })

    await db.communication.update({
      where: { id: comm.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        externalId: result.data?.id ?? null,
      },
    })
  } catch (error) {
    await db.communication.update({
      where: { id: comm.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })
    console.error(`Email send failed [${params.eventType}]:`, error)
  }
}
