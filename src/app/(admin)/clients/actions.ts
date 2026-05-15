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

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().min(10).max(11))
    .optional()
    .or(z.literal('')),
  type: z.enum(['residential', 'commercial']),
  companyName: z.string().optional(),
  secondaryContactName: z.string().optional(),
  secondaryContactEmail: z.string().email().optional().or(z.literal('')),
  secondaryContactPhone: z.string().optional(),
  secondaryContactTitle: z.string().optional(),
  defaultAddress: z.string().min(1, 'Address required'),
  defaultCity: z.string().min(1, 'City required'),
  defaultZip: z.string().length(5, 'Zip must be 5 digits'),
  accessNotes: z.string().optional(),
  petNotes: z.string().optional(),
  specialInstructions: z.string().optional(),
  defaultFrequency: z.string().optional(),
  defaultJobType: z.string().optional(),
  preferredDay: z.string().optional(),
  preferredTime: z.string().optional(),
  preferredCleanerId: z.string().optional(),
  standardRate: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive().optional(),
  ),
  preferredPaymentMethod: z.string().optional(),
  acquisitionSource: z.string().optional(),
  referredBy: z.string().optional(),
  internalNotes: z.string().optional(),
})

function parseFormData(formData: FormData) {
  return {
    name: formData.get('name') as string,
    email: (formData.get('email') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    type: formData.get('type') as string,
    companyName: (formData.get('companyName') as string) || undefined,
    secondaryContactName: (formData.get('secondaryContactName') as string) || undefined,
    secondaryContactEmail: (formData.get('secondaryContactEmail') as string) || undefined,
    secondaryContactPhone: (formData.get('secondaryContactPhone') as string) || undefined,
    secondaryContactTitle: (formData.get('secondaryContactTitle') as string) || undefined,
    defaultAddress: formData.get('defaultAddress') as string,
    defaultCity: formData.get('defaultCity') as string,
    defaultZip: formData.get('defaultZip') as string,
    accessNotes: (formData.get('accessNotes') as string) || undefined,
    petNotes: (formData.get('petNotes') as string) || undefined,
    specialInstructions: (formData.get('specialInstructions') as string) || undefined,
    defaultFrequency: (formData.get('defaultFrequency') as string) || undefined,
    defaultJobType: (formData.get('defaultJobType') as string) || undefined,
    preferredDay: (formData.get('preferredDay') as string) || undefined,
    preferredTime: (formData.get('preferredTime') as string) || undefined,
    preferredCleanerId: (formData.get('preferredCleanerId') as string) || undefined,
    standardRate: (formData.get('standardRate') as string) || undefined,
    preferredPaymentMethod: (formData.get('preferredPaymentMethod') as string) || undefined,
    acquisitionSource: (formData.get('acquisitionSource') as string) || undefined,
    referredBy: (formData.get('referredBy') as string) || undefined,
    internalNotes: (formData.get('internalNotes') as string) || undefined,
  }
}

export async function createClient(formData: FormData) {
  const session = await getSession()

  const parsed = clientSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed')
  }

  const data = parsed.data
  const phone = data.phone || null
  const smsChoice = (formData.get('smsChoice') as string) || 'email_only'

  const client = await db.client.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone,
      type: data.type,
      companyName: data.companyName || null,
      secondaryContactName: data.secondaryContactName || null,
      secondaryContactEmail: data.secondaryContactEmail || null,
      secondaryContactPhone: data.secondaryContactPhone || null,
      secondaryContactTitle: data.secondaryContactTitle || null,
      defaultAddress: data.defaultAddress,
      defaultCity: data.defaultCity,
      defaultZip: data.defaultZip,
      accessNotes: data.accessNotes || null,
      petNotes: data.petNotes || null,
      specialInstructions: data.specialInstructions || null,
      defaultFrequency: data.defaultFrequency || null,
      defaultJobType: data.defaultJobType || null,
      preferredDay: data.preferredDay || null,
      preferredTime: data.preferredTime || null,
      preferredCleanerId: data.preferredCleanerId || null,
      standardRate: data.standardRate ?? null,
      preferredPaymentMethod: data.preferredPaymentMethod || null,
      acquisitionSource: data.acquisitionSource || null,
      referredBy: data.referredBy || null,
      internalNotes: data.internalNotes || null,
      active: true,
      // Phase 11b: SMS opt-in state
      smsOptedIn: phone ? smsChoice === 'verbal' : false,
      smsOptedInAt: phone && smsChoice === 'verbal' ? new Date() : null,
      smsOptedOut: false,
    },
  })

  if (phone && smsChoice === 'send_now') {
    void sendSms({
      to: phone,
      body: SMS_TEMPLATES.OPT_IN(),
      eventType: COMM_EVENT_TYPES.SMS_OPT_IN,
      recipientName: client.name,
      clientId: client.id,
      skipOptInCheck: true,
    }).catch((err: unknown) => console.error('Client opt-in SMS failed:', err))
  }

  if (phone && smsChoice === 'verbal') {
    void sendSms({
      to: phone,
      body: SMS_TEMPLATES.WELCOME(),
      eventType: COMM_EVENT_TYPES.SMS_WELCOME,
      recipientName: client.name,
      clientId: client.id,
      skipOptInCheck: true,
    }).catch((err: unknown) => console.error('Client welcome SMS failed:', err))
  }

  const smsLabel = { send_now: 'opt-in text sent', verbal: 'verbally opted in', email_only: 'email only' }[smsChoice] ?? 'email only'

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_CREATED,
    description: `New client added — ${client.name} — SMS: ${phone ? smsLabel : 'no phone'}`,
    linkPath: `/clients/${client.id}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect(`/clients/${client.id}`)
}

export async function updateClient(clientId: string, formData: FormData) {
  const session = await getSession()
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } })

  const parsed = clientSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed')
  }

  const data = parsed.data
  await db.client.update({
    where: { id: clientId },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      companyName: data.companyName || null,
      secondaryContactName: data.secondaryContactName || null,
      secondaryContactEmail: data.secondaryContactEmail || null,
      secondaryContactPhone: data.secondaryContactPhone || null,
      secondaryContactTitle: data.secondaryContactTitle || null,
      defaultAddress: data.defaultAddress,
      defaultCity: data.defaultCity,
      defaultZip: data.defaultZip,
      accessNotes: data.accessNotes || null,
      petNotes: data.petNotes || null,
      specialInstructions: data.specialInstructions || null,
      defaultFrequency: data.defaultFrequency || null,
      defaultJobType: data.defaultJobType || null,
      preferredDay: data.preferredDay || null,
      preferredTime: data.preferredTime || null,
      preferredCleanerId: data.preferredCleanerId || null,
      standardRate: data.standardRate ?? null,
      preferredPaymentMethod: data.preferredPaymentMethod || null,
      acquisitionSource: data.acquisitionSource || null,
      referredBy: data.referredBy || null,
      internalNotes: data.internalNotes || null,
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_UPDATED,
    description: `${session.user.name} updated client record for ${client.name}`,
    linkPath: `/clients/${clientId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect(`/clients/${clientId}`)
}

export async function deactivateClient(clientId: string) {
  const session = await getSession()
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } })

  await db.client.update({
    where: { id: clientId },
    data: { active: false },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_DEACTIVATED,
    description: `${session.user.name} deactivated client ${client.name}`,
    linkPath: `/clients/${clientId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect('/clients')
}

export async function reactivateClient(clientId: string) {
  const session = await getSession()
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } })

  await db.client.update({
    where: { id: clientId },
    data: { active: true },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_REACTIVATED,
    description: `${session.user.name} reactivated client ${client.name}`,
    linkPath: `/clients/${clientId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients')
}

export async function saveClientNotes(clientId: string, notes: string) {
  const session = await getSession()
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } })

  await db.client.update({
    where: { id: clientId },
    data: { internalNotes: notes },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_NOTES_UPDATED,
    description: `${session.user.name} updated notes for ${client.name}`,
    linkPath: `/clients/${clientId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })
}

// ─── Phase 11 — Client SMS Opt-In Panel Actions ──────────────────────────────

export async function clientSendOptIn(clientId: string) {
  const session = await getSession()
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } })
  if (!client.phone) throw new Error('No phone number on file')

  await sendSms({
    to: client.phone,
    body: SMS_TEMPLATES.OPT_IN(),
    eventType: COMM_EVENT_TYPES.SMS_OPT_IN,
    recipientName: client.name,
    clientId: client.id,
    skipOptInCheck: true,
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_UPDATED,
    description: `${session.user.name} resent SMS opt-in to ${client.name}`,
    linkPath: `/clients/${clientId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/clients/${clientId}`)
}

export async function clientMarkVerbalOptIn(clientId: string) {
  const session = await getSession()
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } })
  if (!client.phone) throw new Error('No phone number on file')

  await db.client.update({
    where: { id: clientId },
    data: { smsOptedIn: true, smsOptedInAt: new Date() },
  })

  await sendSms({
    to: client.phone,
    body: SMS_TEMPLATES.WELCOME(),
    eventType: COMM_EVENT_TYPES.SMS_WELCOME,
    recipientName: client.name,
    clientId: client.id,
    skipOptInCheck: true,
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_UPDATED,
    description: `${session.user.name} marked ${client.name} as verbally opted in`,
    linkPath: `/clients/${clientId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/clients/${clientId}`)
}

export async function clientMarkOptedOut(clientId: string) {
  const session = await getSession()
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } })

  await db.client.update({
    where: { id: clientId },
    data: { smsOptedOut: true, smsOptedOutAt: new Date() },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_UPDATED,
    description: `${session.user.name} marked ${client.name} as opted out of SMS`,
    linkPath: `/clients/${clientId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/clients/${clientId}`)
}

export async function clientOverrideOptOut(clientId: string) {
  const session = await getSession()
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } })

  await db.client.update({
    where: { id: clientId },
    data: { smsOptedOut: false, smsOptedIn: true, smsOptedInAt: new Date() },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.CLIENT_UPDATED,
    description: `${session.user.name} manually overrode SMS opt-out for ${client.name}`,
    linkPath: `/clients/${clientId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/clients/${clientId}`)
}
