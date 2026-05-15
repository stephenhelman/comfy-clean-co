'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { sendEmail } from '@/lib/communications/sendEmail'
import { sendSms } from '@/lib/communications/sendSms'

async function getSession() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

export async function retryCommunication(commId: string) {
  const session = await getSession()

  const comm = await db.communication.findUniqueOrThrow({ where: { id: commId } })

  if (!['failed', 'bounced'].includes(comm.status)) {
    throw new Error('Only failed or bounced communications can be retried')
  }

  if (comm.channel === 'email' && comm.recipientEmail && comm.subject) {
    await sendEmail({
      to: comm.recipientEmail,
      subject: comm.subject,
      html: comm.body ?? '',
      eventType: comm.eventType,
      recipientName: comm.recipientName ?? comm.recipientEmail,
      clientId: comm.clientId ?? undefined,
      leadId: comm.leadId ?? undefined,
    })
  } else if (comm.channel === 'sms' && comm.recipientPhone) {
    // Strip the previously-appended STOP line so sendSms adds it fresh
    const body = (comm.body ?? '').replace(/\n\nReply STOP to unsubscribe\.$/, '').trim()
    await sendSms({
      to: comm.recipientPhone,
      body,
      eventType: comm.eventType,
      recipientName: comm.recipientName ?? comm.recipientPhone,
      clientId: comm.clientId ?? undefined,
      leadId: comm.leadId ?? undefined,
      skipOptInCheck: true,
    })
  } else {
    throw new Error('Cannot retry this communication — missing recipient details')
  }

  await logActivity({
    eventType: ACTIVITY_EVENTS.SETTINGS_UPDATED,
    description: `${session.user.name} retried ${comm.channel} to ${comm.recipientName ?? 'recipient'}`,
    linkPath: `/communications`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/communications')
}
