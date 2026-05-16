'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'

async function getSession() {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  return session
}

async function getOrCreateSettings() {
  const existing = await db.businessSettings.findFirst()
  if (existing) return existing
  return db.businessSettings.create({ data: {} })
}

async function logSettings(actorName: string | null | undefined, actorId: string, section: string) {
  await logActivity({
    eventType: ACTIVITY_EVENTS.SETTINGS_UPDATED,
    description: `Settings updated — ${section}`,
    linkPath: '/settings',
    actorName: actorName ?? undefined,
    actorId,
  })
}

export async function saveBusinessInfo(formData: FormData) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      businessName: (formData.get('businessName') as string) || undefined,
      businessAddress: (formData.get('businessAddress') as string) || null,
      businessCity: (formData.get('businessCity') as string) || null,
      businessZip: (formData.get('businessZip') as string) || null,
      businessPhone: (formData.get('businessPhone') as string) || null,
      businessEmail: (formData.get('businessEmail') as string) || null,
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  await logSettings(session.user.name, session.user.id, 'Business Info')
  revalidatePath('/settings')
}

export async function saveBranding(formData: FormData) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      brandColor: (formData.get('brandColor') as string) || '#0D9488',
      emailFromName: (formData.get('emailFromName') as string) || 'Comfy Clean Co.',
      emailReplyTo: (formData.get('emailReplyTo') as string) || null,
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  await logSettings(session.user.name, session.user.id, 'Branding')
  revalidatePath('/settings')
}

export async function saveScheduling(formData: FormData) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  const zips = (formData.get('serviceZipCodes') as string)
    .split(/[\s,]+/)
    .map(z => z.trim())
    .filter(Boolean)

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      maxJobsPerDay: parseInt(formData.get('maxJobsPerDay') as string) || 8,
      maxJobsPerCleaner: parseInt(formData.get('maxJobsPerCleaner') as string) || 3,
      workdayStartHour: parseInt(formData.get('workdayStartHour') as string) || 8,
      workdayEndHour: parseInt(formData.get('workdayEndHour') as string) || 18,
      serviceZipCodes: zips,
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  await logSettings(session.user.name, session.user.id, 'Scheduling')
  revalidatePath('/settings')
}

export async function addBlackoutDate(dateStr: string) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) throw new Error('Invalid date')

  const existing = settings.blackoutDates.map(d => d.toISOString().slice(0, 10))
  if (existing.includes(dateStr)) return

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      blackoutDates: { push: date },
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.BLACKOUT_ADDED,
    description: `Blackout date added: ${dateStr}`,
    linkPath: '/settings',
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/settings')
}

export async function removeBlackoutDate(dateStr: string) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  const updated = settings.blackoutDates.filter(
    d => d.toISOString().slice(0, 10) !== dateStr,
  )

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      blackoutDates: updated,
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.BLACKOUT_REMOVED,
    description: `Blackout date removed: ${dateStr}`,
    linkPath: '/settings',
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/settings')
}

export async function saveInvoicing(formData: FormData) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      cancellationWindowHours: parseInt(formData.get('cancellationWindowHours') as string) || 24,
      cancellationFeeDefault: parseFloat(formData.get('cancellationFeeDefault') as string) || null,
      invoiceFooterText: (formData.get('invoiceFooterText') as string) || null,
      invoiceNumberPrefix: (formData.get('invoiceNumberPrefix') as string) || 'INV',
      zellePaymentLink: (formData.get('zellePaymentLink') as string) || null,
      defaultPaymentMethod: (formData.get('defaultPaymentMethod') as string) || 'zelle',
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  await logSettings(session.user.name, session.user.id, 'Invoicing')
  revalidatePath('/settings')
}

export async function saveReviewSettings(formData: FormData) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      googlePlaceId: (formData.get('googlePlaceId') as string) || null,
      // C-34: reviewRequestHour change requires redeployment — warning shown in UI
      reviewRequestHour: parseInt(formData.get('reviewRequestHour') as string) || 9,
      reviewRequestSkipWeekends: formData.get('reviewRequestSkipWeekends') === 'on',
      reviewCooldownDays: parseInt(formData.get('reviewCooldownDays') as string) || 30,
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  await logSettings(session.user.name, session.user.id, 'Review Settings')
  revalidatePath('/settings')
}

export async function saveAutomationSettings(automationSettings: object, appointmentReminderHour: number) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      automationSettings,
      appointmentReminderHour,
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  // Log global pause transitions
  const prev = settings.automationSettings as { globalPause?: boolean } | null
  const next = automationSettings as { globalPause?: boolean }
  if (prev?.globalPause !== next?.globalPause) {
    await logActivity({
      eventType: next?.globalPause
        ? ACTIVITY_EVENTS.GLOBAL_PAUSE_ENABLED
        : ACTIVITY_EVENTS.GLOBAL_PAUSE_DISABLED,
      description: next?.globalPause
        ? 'Global pause enabled — client communications paused'
        : 'Global pause disabled — automations resumed',
      linkPath: '/settings',
      actorName: session.user.name ?? undefined,
      actorId: session.user.id,
    })
  } else {
    await logActivity({
      eventType: ACTIVITY_EVENTS.AUTOMATION_TOGGLED,
      description: 'Automation settings updated',
      linkPath: '/settings',
      actorName: session.user.name ?? undefined,
      actorId: session.user.id,
    })
  }

  revalidatePath('/settings')
}

export async function savePayrollSettings(formData: FormData) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  const frequency = formData.get('payPeriodFrequency') as string
  const startDay = parseInt((formData.get('payPeriodStartDay') as string) ?? '1')

  const validFrequencies = ['weekly', 'biweekly', 'semi_monthly', 'monthly']
  if (!validFrequencies.includes(frequency)) {
    throw new Error('Invalid pay period frequency')
  }

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      payPeriodFrequency: frequency,
      payPeriodStartDay: startDay,
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  await logActivity({
    eventType: ACTIVITY_EVENTS.SETTINGS_UPDATED,
    description: `Payroll settings updated — ${frequency} starting ${dayNames[startDay] ?? startDay}`,
    linkPath: '/settings',
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/settings')
}

export async function saveNotifications(formData: FormData) {
  const session = await getSession()
  const settings = await getOrCreateSettings()

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      adminNotificationEmail: (formData.get('adminNotificationEmail') as string) || null,
      adminNotificationPhone: (formData.get('adminNotificationPhone') as string) || null,
      updatedBy: session.user.name ?? 'Admin',
    },
  })

  await logSettings(session.user.name, session.user.id, 'Notifications')
  revalidatePath('/settings')
}
