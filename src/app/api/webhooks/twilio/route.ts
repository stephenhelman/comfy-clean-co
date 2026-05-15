import { db } from '@/lib/db'
import { sendSms } from '@/lib/communications/sendSms'
import { COMM_EVENT_TYPES, SMS_TEMPLATES } from '@/lib/communications/templates'

const STOP_WORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']

export async function POST(request: Request) {
  const twilioSignature = request.headers.get('x-twilio-signature') ?? ''
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`

  const body = await request.formData()
  const params: Record<string, string> = {}
  body.forEach((value, key) => {
    params[key] = value as string
  })

  // Verify Twilio signature in production
  if (process.env.TWILIO_AUTH_TOKEN && process.env.NODE_ENV === 'production') {
    const { validateRequest } = await import('twilio/lib/webhooks/webhooks')
    const isValid = validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      params
    )
    if (!isValid) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const from = params.From ?? ''
  const rawBody = params.Body ?? ''
  const messageBody = rawBody.trim().toUpperCase()
  const messageSid = params.MessageSid ?? ''
  const messageStatus = params.MessageStatus

  // Handle status callback (outbound message delivery update)
  if (messageSid && messageStatus) {
    const statusMap: Record<string, string> = {
      delivered: 'delivered',
      failed: 'failed',
      undelivered: 'failed',
      sent: 'sent',
    }
    const mappedStatus = statusMap[messageStatus]
    if (mappedStatus) {
      await db.communication.updateMany({
        where: { externalId: messageSid },
        data: {
          status: mappedStatus,
          deliveredAt: mappedStatus === 'delivered' ? new Date() : undefined,
          errorMessage:
            messageStatus === 'failed' || messageStatus === 'undelivered'
              ? `Twilio status: ${messageStatus}`
              : undefined,
        },
      })
    }
    return new Response('OK', { status: 200 })
  }

  if (!from) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }

  // Look up lead or client by phone
  const lead = await db.leadInquiry.findFirst({
    where: { phone: from, smsOptInSent: true, smsOptedIn: false, smsOptedOut: false },
  })

  const client = await db.client.findFirst({
    where: { phone: from, smsOptedOut: false },
  })

  const isOptIn = messageBody === 'YES'
  const isOptOut = STOP_WORDS.includes(messageBody)

  // Log inbound communication
  await db.communication.create({
    data: {
      recipientName: lead?.name ?? client?.name ?? from,
      recipientPhone: from,
      channel: 'sms',
      eventType: isOptIn
        ? COMM_EVENT_TYPES.SMS_REPLY_OPTIN
        : isOptOut
        ? COMM_EVENT_TYPES.SMS_REPLY_OPTOUT
        : COMM_EVENT_TYPES.SMS_REPLY_OTHER,
      body: rawBody,
      direction: 'inbound',
      clientId: client?.id ?? null,
      leadId: lead?.id ?? null,
      status: 'delivered',
      externalId: messageSid || null,
    },
  })

  if (isOptIn && lead) {
    await db.leadInquiry.update({
      where: { id: lead.id },
      data: { smsOptedIn: true, smsOptedInAt: new Date() },
    })

    await sendSms({
      to: from,
      body: SMS_TEMPLATES.WELCOME(),
      eventType: COMM_EVENT_TYPES.SMS_WELCOME,
      recipientName: lead.name,
      leadId: lead.id,
      skipOptInCheck: true,
    })

    await db.activityLog.create({
      data: {
        eventType: 'sms_opt_in_confirmed',
        description: `${lead.name} confirmed SMS opt-in`,
        linkPath: `/leads/${lead.id}`,
      },
    })
  }

  if (isOptOut) {
    if (lead) {
      await db.leadInquiry.update({
        where: { id: lead.id },
        data: { smsOptedOut: true, smsOptedOutAt: new Date() },
      })
      await db.activityLog.create({
        data: {
          eventType: 'sms_opted_out',
          description: `${lead.name} opted out of SMS`,
          linkPath: `/leads/${lead.id}`,
        },
      })
    }
    if (client) {
      await db.client.update({
        where: { id: client.id },
        data: { smsOptedOut: true, smsOptedOutAt: new Date() },
      })
      await db.activityLog.create({
        data: {
          eventType: 'sms_opted_out',
          description: `${client.name} opted out of SMS`,
          linkPath: `/clients/${client.id}`,
        },
      })
    }
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}
