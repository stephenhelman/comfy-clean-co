import { db } from '@/lib/db'

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

  // Verify Resend webhook signature using svix headers
  if (webhookSecret) {
    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response('Unauthorized', { status: 401 })
    }

    try {
      const { Webhook } = await import('svix')
      const wh = new Webhook(webhookSecret)
      const payload = await request.text()
      wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      })
    } catch {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let payload: { type: string; data: Record<string, unknown> }
  try {
    payload = await request.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const { type, data } = payload
  const emailId = data.email_id as string | undefined

  if (type === 'email.delivered' && emailId) {
    await db.communication.updateMany({
      where: { externalId: emailId },
      data: { status: 'delivered', deliveredAt: new Date() },
    })
  }

  if (type === 'email.bounced' && emailId) {
    const bounce = data.bounce as Record<string, unknown> | undefined
    await db.communication.updateMany({
      where: { externalId: emailId },
      data: {
        status: 'bounced',
        errorMessage: `Bounced: ${bounce?.type ?? 'unknown'}`,
      },
    })

    const to = data.to as string | undefined
    await db.activityLog.create({
      data: {
        eventType: 'email_bounced',
        description: `Email bounced for ${to ?? emailId}`,
        linkPath: `/communications`,
      },
    })
  }

  return new Response('OK', { status: 200 })
}
