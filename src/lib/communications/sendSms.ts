import { db } from '@/lib/db'

/**
 * The single consent gate for lead-directed SMS: opted in AND not opted out.
 * Call this before any lead-directed send that doesn't pass skipOptInCheck.
 *
 * IMPORTANT: keep all sends TRANSACTIONAL (appointment confirmations, reminders,
 * service updates) until a registered A2P 10DLC campaign exists. Do not send
 * marketing/promotional content under this consent.
 */
export function canTextLead(lead: { smsOptedIn: boolean; smsOptedOut: boolean }): boolean {
  return lead.smsOptedIn === true && lead.smsOptedOut === false
}

interface SendSmsParams {
  to: string
  body: string
  eventType: string
  recipientName: string
  clientId?: string
  leadId?: string
  skipOptInCheck?: boolean
}

export async function sendSms(params: SendSmsParams): Promise<void> {
  // Consent gate (equivalent to canTextLead): require opted in AND not opted out.
  // Sends must stay transactional pre-A2P-10DLC registration — see canTextLead.
  if (!params.skipOptInCheck) {
    const optedOut = await isOptedOut(params.clientId, params.leadId)
    if (optedOut) {
      await db.communication.create({
        data: {
          recipientName: params.recipientName,
          recipientPhone: params.to,
          channel: 'sms',
          eventType: params.eventType,
          body: params.body,
          clientId: params.clientId ?? null,
          leadId: params.leadId ?? null,
          status: 'opted_out',
        },
      })
      return
    }

    const optedIn = await isOptedIn(params.clientId, params.leadId)
    if (!optedIn) return
  }

  const fullBody = `${params.body}\n\nReply STOP to unsubscribe.`

  const comm = await db.communication.create({
    data: {
      recipientName: params.recipientName,
      recipientPhone: params.to,
      channel: 'sms',
      eventType: params.eventType,
      body: fullBody,
      clientId: params.clientId ?? null,
      leadId: params.leadId ?? null,
      status: 'pending',
    },
  })

  try {
    const twilio = await import('twilio')
    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const message = await client.messages.create({
      body: fullBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: params.to,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`,
    })

    await db.communication.update({
      where: { id: comm.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        externalId: message.sid,
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
    console.error(`SMS send failed [${params.eventType}]:`, error)
  }
}

async function isOptedOut(clientId?: string, leadId?: string): Promise<boolean> {
  if (clientId) {
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { smsOptedOut: true },
    })
    return client?.smsOptedOut ?? false
  }
  if (leadId) {
    const lead = await db.leadInquiry.findUnique({
      where: { id: leadId },
      select: { smsOptedOut: true },
    })
    return lead?.smsOptedOut ?? false
  }
  return false
}

async function isOptedIn(clientId?: string, leadId?: string): Promise<boolean> {
  if (clientId) {
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { smsOptedIn: true },
    })
    return client?.smsOptedIn ?? false
  }
  if (leadId) {
    const lead = await db.leadInquiry.findUnique({
      where: { id: leadId },
      select: { smsOptedIn: true },
    })
    return lead?.smsOptedIn ?? false
  }
  return false
}
