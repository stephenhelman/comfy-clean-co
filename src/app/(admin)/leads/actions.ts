'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { z } from 'zod'
import { sendSms } from '@/lib/communications/sendSms'
import { COMM_EVENT_TYPES, SMS_TEMPLATES } from '@/lib/communications/templates'

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
      // Phase 11: carry over SMS opt-in state exactly
      smsOptedIn: lead.smsOptedIn,
      smsOptedOut: lead.smsOptedOut,
      smsOptedInAt: lead.smsOptedInAt ?? null,
      smsOptedOutAt: lead.smsOptedOutAt ?? null,
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

// ─── Phase 11b — Manual Lead Creation ───────────────────────────────────────

const manualLeadSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  type: z.enum(['residential', 'commercial']),
  frequency: z.string().min(1, 'Frequency required'),
  preferredDay: z.string().optional().or(z.literal('')),
  preferredTime: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  adminNotes: z.string().optional().or(z.literal('')),
  smsChoice: z.enum(['send_now', 'verbal', 'email_only']).optional(),
})

export async function createManualLead(formData: FormData) {
  const session = await getSession()

  const phone = (formData.get('phone') as string) || ''
  const smsChoice = (formData.get('smsChoice') as string) || 'email_only'

  if (phone && !['send_now', 'verbal', 'email_only'].includes(smsChoice)) {
    throw new Error('Please select an SMS communication preference')
  }

  const parsed = manualLeadSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    phone: phone || undefined,
    type: formData.get('type'),
    frequency: formData.get('frequency'),
    preferredDay: formData.get('preferredDay') || undefined,
    preferredTime: formData.get('preferredTime') || undefined,
    source: formData.get('source') || undefined,
    notes: formData.get('notes') || undefined,
    adminNotes: formData.get('adminNotes') || undefined,
    smsChoice: phone ? smsChoice : undefined,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed')
  }

  const data = parsed.data

  const lead = await db.leadInquiry.create({
    data: {
      name: data.name,
      email: data.email || '',
      phone: data.phone || '',
      type: data.type,
      frequency: data.frequency,
      preferredDay: data.preferredDay || null,
      preferredTime: data.preferredTime || null,
      source: data.source || 'manual',
      notes: data.notes || null,
      adminNotes: data.adminNotes || null,
      status: 'new',
      smsOptedIn: smsChoice === 'verbal',
      smsOptedInAt: smsChoice === 'verbal' ? new Date() : null,
      smsOptedOut: false,
      smsOptInSent: phone ? smsChoice === 'send_now' : false,
      smsOptInSentAt: phone && smsChoice === 'send_now' ? new Date() : null,
    },
  })

  if (phone && smsChoice === 'send_now') {
    void sendSms({
      to: phone,
      body: SMS_TEMPLATES.OPT_IN(),
      eventType: COMM_EVENT_TYPES.SMS_OPT_IN,
      recipientName: lead.name,
      leadId: lead.id,
      skipOptInCheck: true,
    }).catch((err: unknown) => console.error('Manual lead opt-in SMS failed:', err))
  }

  if (phone && smsChoice === 'verbal') {
    void sendSms({
      to: phone,
      body: SMS_TEMPLATES.WELCOME(),
      eventType: COMM_EVENT_TYPES.SMS_WELCOME,
      recipientName: lead.name,
      leadId: lead.id,
      skipOptInCheck: true,
    }).catch((err: unknown) => console.error('Manual lead welcome SMS failed:', err))
  }

  const smsLabel = { send_now: 'opt-in text sent', verbal: 'verbally opted in', email_only: 'email only' }[smsChoice] ?? 'email only'

  await logActivity({
    eventType: ACTIVITY_EVENTS.LEAD_SUBMITTED,
    description: `Manual lead created — ${lead.name} — SMS: ${smsLabel}`,
    linkPath: `/leads/${lead.id}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect(`/leads/${lead.id}`)
}

// ─── Phase 11 — SMS Opt-In Panel Actions ────────────────────────────────────

export async function leadSendOptIn(leadId: string) {
  const session = await getSession()
  const lead = await db.leadInquiry.findUniqueOrThrow({ where: { id: leadId } })
  if (!lead.phone) throw new Error('No phone number on file')

  await sendSms({
    to: lead.phone,
    body: SMS_TEMPLATES.OPT_IN(),
    eventType: COMM_EVENT_TYPES.SMS_OPT_IN,
    recipientName: lead.name,
    leadId: lead.id,
    skipOptInCheck: true,
  })

  await db.leadInquiry.update({
    where: { id: leadId },
    data: { smsOptInSent: true, smsOptInSentAt: new Date() },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.SMS_OPT_IN_CONFIRMED,
    description: `${session.user.name} resent SMS opt-in to ${lead.name}`,
    linkPath: `/leads/${leadId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/leads/${leadId}`)
}

export async function leadMarkVerbalOptIn(leadId: string) {
  const session = await getSession()
  const lead = await db.leadInquiry.findUniqueOrThrow({ where: { id: leadId } })
  if (!lead.phone) throw new Error('No phone number on file')

  await db.leadInquiry.update({
    where: { id: leadId },
    data: { smsOptedIn: true, smsOptedInAt: new Date() },
  })

  await sendSms({
    to: lead.phone,
    body: SMS_TEMPLATES.WELCOME(),
    eventType: COMM_EVENT_TYPES.SMS_WELCOME,
    recipientName: lead.name,
    leadId: lead.id,
    skipOptInCheck: true,
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.SMS_OPT_IN_CONFIRMED,
    description: `${session.user.name} marked ${lead.name} as verbally opted in`,
    linkPath: `/leads/${leadId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/leads/${leadId}`)
}

export async function leadMarkOptedOut(leadId: string) {
  const session = await getSession()
  const lead = await db.leadInquiry.findUniqueOrThrow({ where: { id: leadId } })

  await db.leadInquiry.update({
    where: { id: leadId },
    data: { smsOptedOut: true, smsOptedOutAt: new Date() },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.SMS_OPT_OUT,
    description: `${session.user.name} marked ${lead.name} as opted out of SMS`,
    linkPath: `/leads/${leadId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/leads/${leadId}`)
}

export async function leadOverrideOptOut(leadId: string) {
  const session = await getSession()
  const lead = await db.leadInquiry.findUniqueOrThrow({ where: { id: leadId } })

  await db.leadInquiry.update({
    where: { id: leadId },
    data: { smsOptedOut: false, smsOptedIn: true, smsOptedInAt: new Date() },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.SMS_OPT_IN_OVERRIDE,
    description: `${session.user.name} manually overrode SMS opt-out for ${lead.name}`,
    linkPath: `/leads/${leadId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/leads/${leadId}`)
}
