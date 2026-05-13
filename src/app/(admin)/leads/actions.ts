'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { z } from 'zod'

async function getSession() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

export async function logCall(leadId: string, outcome: string, notes: string) {
  const session = await getSession()
  const lead = await db.leadInquiry.findUniqueOrThrow({ where: { id: leadId } })

  // auto-transition new → contacted
  const nowContacted = lead.status === 'new'
  await db.leadInquiry.update({
    where: { id: leadId },
    data: {
      ...(nowContacted ? { status: 'contacted', contactedAt: new Date(), contactedBy: session.user.name ?? '' } : {}),
      updatedAt: new Date(),
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.LEAD_CALL_LOGGED,
    description: `${session.user.name} logged a call with ${lead.name} — ${outcome}`,
    linkPath: `/leads/${leadId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  if (nowContacted) {
    await logActivity({
      eventType: ACTIVITY_EVENTS.LEAD_CONTACTED,
      description: `${session.user.name} contacted ${lead.name}`,
      linkPath: `/leads/${leadId}`,
      actorName: session.user.name ?? undefined,
      actorId: session.user.id,
    })
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
}

export async function markQuoteSent(leadId: string) {
  const session = await getSession()
  const lead = await db.leadInquiry.findUniqueOrThrow({ where: { id: leadId } })

  await db.leadInquiry.update({
    where: { id: leadId },
    data: { status: 'quote_sent', updatedAt: new Date() },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.LEAD_QUOTE_SENT,
    description: `${session.user.name} marked quote sent to ${lead.name}`,
    // TODO: wire quoteId when quoting system is built
    linkPath: `/leads/${leadId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
}

const convertSchema = z.object({
  serviceAddress: z.string().min(5, 'Address required'),
  serviceCity: z.string().min(2, 'City required'),
  serviceZip: z.string().length(5, 'Zip must be 5 digits'),
  clientNotes: z.string().optional(),
})

export async function convertLead(leadId: string, formData: FormData) {
  const session = await getSession()
  const lead = await db.leadInquiry.findUniqueOrThrow({ where: { id: leadId } })

  const parsed = convertSchema.safeParse({
    serviceAddress: formData.get('serviceAddress'),
    serviceCity: formData.get('serviceCity'),
    serviceZip: formData.get('serviceZip'),
    clientNotes: formData.get('clientNotes') ?? undefined,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed')
  }

  const { serviceAddress, serviceCity, serviceZip, clientNotes } = parsed.data

  const client = await db.client.create({
    data: {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      type: lead.type,
      defaultFrequency: lead.frequency,
      defaultAddress: serviceAddress,
      defaultCity: serviceCity,
      defaultZip: serviceZip,
      internalNotes: clientNotes || null,
      acquisitionSource: lead.source || null,
      active: true,
    },
  })

  await db.leadInquiry.update({
    where: { id: leadId },
    data: { status: 'converted', convertedAt: new Date(), clientId: client.id },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.LEAD_CONVERTED,
    description: `${lead.name} converted to client`,
    linkPath: `/clients/${client.id}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_CREATED,
    description: `Client ${client.name} created from lead conversion`,
    linkPath: `/clients/${client.id}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect(`/clients/${client.id}`)
}

export async function markLost(leadId: string, reason: string) {
  const session = await getSession()
  const lead = await db.leadInquiry.findUniqueOrThrow({ where: { id: leadId } })

  await db.leadInquiry.update({
    where: { id: leadId },
    data: { status: 'lost', lostAt: new Date(), lostReason: reason },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.LEAD_LOST,
    description: `${lead.name} marked lost — ${reason}`,
    linkPath: `/leads/${leadId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
}

export async function reopenLead(leadId: string) {
  const session = await getSession()
  const lead = await db.leadInquiry.findUniqueOrThrow({ where: { id: leadId } })

  await db.leadInquiry.update({
    where: { id: leadId },
    data: { status: 'contacted', lostAt: null, lostReason: null },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.LEAD_REOPENED,
    description: `${session.user.name} reopened lead for ${lead.name}`,
    linkPath: `/leads/${leadId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
}

export async function saveAdminNotes(leadId: string, notes: string) {
  await getSession()
  await db.leadInquiry.update({
    where: { id: leadId },
    data: { adminNotes: notes },
  })
}
