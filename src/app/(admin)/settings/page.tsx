import { Suspense } from 'react'
import { db } from '@/lib/db'
import SettingsClient from '@/components/admin/settings/SettingsClient'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  // C-27: No migration needed — BusinessSettings already in init schema
  let settings = await db.businessSettings.findFirst()

  if (!settings) {
    settings = await db.businessSettings.create({ data: {} })
  }

  const serialized = {
    id: settings.id,
    businessName: settings.businessName,
    businessAddress: settings.businessAddress,
    businessCity: settings.businessCity,
    businessZip: settings.businessZip,
    businessPhone: settings.businessPhone,
    businessEmail: settings.businessEmail,
    brandColor: settings.brandColor,
    emailFromName: settings.emailFromName,
    emailReplyTo: settings.emailReplyTo,
    maxJobsPerDay: settings.maxJobsPerDay,
    maxJobsPerCleaner: settings.maxJobsPerCleaner,
    workdayStartHour: settings.workdayStartHour,
    workdayEndHour: settings.workdayEndHour,
    serviceZipCodes: settings.serviceZipCodes,
    blackoutDates: settings.blackoutDates.map(d => d.toISOString().slice(0, 10)),
    cancellationWindowHours: settings.cancellationWindowHours,
    cancellationFeeDefault: settings.cancellationFeeDefault,
    invoiceFooterText: settings.invoiceFooterText,
    invoiceNumberPrefix: settings.invoiceNumberPrefix,
    zellePaymentLink: settings.zellePaymentLink,
    defaultPaymentMethod: settings.defaultPaymentMethod,
    googlePlaceId: settings.googlePlaceId,
    reviewRequestHour: settings.reviewRequestHour,
    reviewRequestSkipWeekends: settings.reviewRequestSkipWeekends,
    reviewCooldownDays: settings.reviewCooldownDays,
    adminNotificationEmail: settings.adminNotificationEmail,
    adminNotificationPhone: settings.adminNotificationPhone,
    automationSettings: settings.automationSettings as object,
    appointmentReminderHour: settings.appointmentReminderHour,
    updatedBy: settings.updatedBy,
  }

  return (
    <Suspense>
      <SettingsClient settings={serialized} />
    </Suspense>
  )
}
