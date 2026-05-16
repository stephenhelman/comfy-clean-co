'use client'

import { useState, useTransition, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { X, Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  saveBusinessInfo, saveBranding, saveScheduling,
  addBlackoutDate, removeBlackoutDate,
  saveInvoicing, saveReviewSettings, saveNotifications,
  saveAutomationSettings, savePayrollSettings,
} from '@/app/(admin)/settings/actions'
import { getPayPeriod, type PayPeriodFrequency } from '@/lib/payPeriod'

type Tab = 'business' | 'scheduling' | 'invoicing' | 'payroll' | 'reviews' | 'notifications' | 'automations'

const TABS: { key: Tab; label: string }[] = [
  { key: 'business', label: 'Business & Branding' },
  { key: 'scheduling', label: 'Scheduling' },
  { key: 'invoicing', label: 'Invoicing & Payment' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'automations', label: 'Automations' },
]

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12
  const ampm = i < 12 ? 'AM' : 'PM'
  return { value: i, label: `${h}:00 ${ampm}` }
})

function SaveButton({ isPending, saved }: { isPending: boolean; saved: boolean }) {
  return (
    <button type="submit" disabled={isPending}
      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50">
      {isPending ? 'Saving…' : saved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Save Changes'}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

function Input({ name, defaultValue, type = 'text', placeholder, className = '' }: {
  name: string; defaultValue?: string | number | null; type?: string; placeholder?: string; className?: string
}) {
  return (
    <input name={name} type={type} defaultValue={defaultValue ?? ''} placeholder={placeholder}
      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy ${className}`} />
  )
}

interface AutomationSettings {
  globalPause?: boolean
  clientCommunications?: { enabled?: boolean; appointmentReminder?: boolean; cleanerOnTheWay?: boolean; reviewRequest?: boolean }
  adminAlerts?: { enabled?: boolean; staleLead?: boolean; overdueInvoice?: boolean; openClockEntry?: boolean; capacityWarning?: boolean; negativeReview?: boolean; pinLocked?: boolean; newLead?: boolean }
  financialAutomations?: { enabled?: boolean; invoiceGeneration?: boolean; overdueTransition?: boolean }
}

interface SettingsData {
  id: string
  businessName: string
  businessAddress: string | null
  businessCity: string | null
  businessZip: string | null
  businessPhone: string | null
  businessEmail: string | null
  brandColor: string
  emailFromName: string
  emailReplyTo: string | null
  maxJobsPerDay: number
  maxJobsPerCleaner: number
  workdayStartHour: number
  workdayEndHour: number
  serviceZipCodes: string[]
  blackoutDates: string[]
  cancellationWindowHours: number
  cancellationFeeDefault: number | null
  invoiceFooterText: string | null
  invoiceNumberPrefix: string
  zellePaymentLink: string | null
  defaultPaymentMethod: string
  googlePlaceId: string | null
  reviewRequestHour: number
  reviewRequestSkipWeekends: boolean
  reviewCooldownDays: number
  adminNotificationEmail: string | null
  adminNotificationPhone: string | null
  automationSettings: object
  appointmentReminderHour: number
  payPeriodFrequency: string
  payPeriodStartDay: number
  updatedBy: string | null
}

function useFormSave(action: (fd: FormData) => Promise<void>) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaved(false)
    setError('')
    startTransition(async () => {
      try {
        await action(fd)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return { isPending, saved, error, handleSubmit, formRef }
}

export default function SettingsClient({ settings }: { settings: SettingsData }) {
  const [tab, setTab] = useState<Tab>('business')
  const [blackoutDates, setBlackoutDates] = useState<string[]>(settings.blackoutDates)
  const [newBlackout, setNewBlackout] = useState('')
  const [blackoutPending, startBlackoutTransition] = useTransition()

  const defaultAuto = settings.automationSettings as AutomationSettings
  const [autoSettings, setAutoSettings] = useState<AutomationSettings>(defaultAuto)
  const [autoReminderHour, setAutoReminderHour] = useState<number>(settings.appointmentReminderHour)
  const [autoPending, startAutoTransition] = useTransition()
  const [autoSaved, setAutoSaved] = useState(false)
  const [autoError, setAutoError] = useState('')

  const [payFreq, setPayFreq] = useState<PayPeriodFrequency>(
    settings.payPeriodFrequency as PayPeriodFrequency,
  )
  const [payStartDay, setPayStartDay] = useState(settings.payPeriodStartDay)
  const [payrollPending, startPayrollTransition] = useTransition()
  const [payrollSaved, setPayrollSaved] = useState(false)
  const [payrollError, setPayrollError] = useState('')

  const business = useFormSave(saveBusinessInfo)
  const branding = useFormSave(saveBranding)
  const scheduling = useFormSave(saveScheduling)
  const invoicing = useFormSave(saveInvoicing)
  const reviews = useFormSave(saveReviewSettings)
  const notifications = useFormSave(saveNotifications)

  function handleAutoSave() {
    setAutoSaved(false)
    setAutoError('')
    startAutoTransition(async () => {
      try {
        await saveAutomationSettings(autoSettings, autoReminderHour)
        setAutoSaved(true)
        setTimeout(() => setAutoSaved(false), 3000)
      } catch (err) {
        setAutoError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  function setAutoGroup<G extends keyof AutomationSettings>(group: G, key: string, value: boolean) {
    setAutoSettings(prev => ({
      ...prev,
      [group]: { ...(prev[group] as Record<string, unknown> ?? {}), [key]: value },
    }))
  }

  function handleAddBlackout() {
    if (!newBlackout) return
    startBlackoutTransition(async () => {
      await addBlackoutDate(newBlackout)
      setBlackoutDates(prev => [...prev, newBlackout].sort())
      setNewBlackout('')
    })
  }

  function handlePayrollSave() {
    setPayrollSaved(false)
    setPayrollError('')
    startPayrollTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('payPeriodFrequency', payFreq)
        fd.set('payPeriodStartDay', String(payStartDay))
        await savePayrollSettings(fd)
        setPayrollSaved(true)
        setTimeout(() => setPayrollSaved(false), 3000)
      } catch (err) {
        setPayrollError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  function handleRemoveBlackout(date: string) {
    startBlackoutTransition(async () => {
      await removeBlackoutDate(date)
      setBlackoutDates(prev => prev.filter(d => d !== date))
    })
  }

  return (
    <div className="max-w-screen-2xl mx-auto">
      {/* Header + Tabs — sticky so they stay visible while scrolling */}
      <div className="sticky top-0 z-10 bg-brand-off-white">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Settings</h1>
          {settings.updatedBy && (
            <p className="text-xs text-gray-400 mt-0.5">Last updated by {settings.updatedBy}</p>
          )}
        </div>

        <div className="px-4 sm:px-6 border-b border-gray-200 flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6 space-y-5 max-w-2xl">

        {/* ── Business & Branding ─────────────────────────────────────────────── */}
        {tab === 'business' && (
          <>
            <form onSubmit={business.handleSubmit} className="space-y-5">
              <Section title="Business Information">
                <div className="space-y-4">
                  <Field label="Business Name">
                    <Input name="businessName" defaultValue={settings.businessName} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Phone">
                      <Input name="businessPhone" defaultValue={settings.businessPhone} placeholder="(915) 555-0100" />
                    </Field>
                    <Field label="Email">
                      <Input name="businessEmail" type="email" defaultValue={settings.businessEmail} placeholder="hello@comfycleanco.com" />
                    </Field>
                  </div>
                  <Field label="Address">
                    <Input name="businessAddress" defaultValue={settings.businessAddress} placeholder="Street address" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City">
                      <Input name="businessCity" defaultValue={settings.businessCity} placeholder="El Paso" />
                    </Field>
                    <Field label="ZIP">
                      <Input name="businessZip" defaultValue={settings.businessZip} placeholder="79938" />
                    </Field>
                  </div>
                </div>
              </Section>

              <Section title="Email Branding">
                <div className="space-y-4">
                  <Field label="From Name" hint="Displayed as the sender name in all outgoing emails.">
                    <Input name="emailFromName" defaultValue={settings.emailFromName} />
                  </Field>
                  <Field label="Reply-To Address" hint="Clients who reply to emails will reach this address.">
                    <Input name="emailReplyTo" type="email" defaultValue={settings.emailReplyTo} placeholder="hello@comfycleanco.com" />
                  </Field>
                  <Field label="Brand Color">
                    <div className="flex items-center gap-3">
                      <input name="brandColor" type="color" defaultValue={settings.brandColor}
                        className="h-9 w-14 rounded border border-gray-200 cursor-pointer p-0.5" />
                      <span className="text-xs text-gray-500">Used in invoice PDFs and email headers.</span>
                    </div>
                  </Field>
                </div>
              </Section>

              {business.error && <p className="text-sm text-red-600">{business.error}</p>}
              {branding.error && <p className="text-sm text-red-600">{branding.error}</p>}
              <div className="flex justify-end">
                <SaveButton isPending={business.isPending} saved={business.saved} />
              </div>
            </form>
          </>
        )}

        {/* ── Scheduling ──────────────────────────────────────────────────────── */}
        {tab === 'scheduling' && (
          <>
            <form onSubmit={scheduling.handleSubmit} className="space-y-5">
              <Section title="Capacity Limits">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Max Jobs Per Day">
                    <Input name="maxJobsPerDay" type="number" defaultValue={settings.maxJobsPerDay} />
                  </Field>
                  <Field label="Max Jobs Per Cleaner">
                    <Input name="maxJobsPerCleaner" type="number" defaultValue={settings.maxJobsPerCleaner} />
                  </Field>
                </div>
              </Section>

              <Section title="Work Hours">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Workday Start">
                    <select name="workdayStartHour" defaultValue={settings.workdayStartHour}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {HOUR_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Workday End">
                    <select name="workdayEndHour" defaultValue={settings.workdayEndHour}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {HOUR_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              <Section title="Service Area">
                <Field label="Allowed ZIP Codes" hint="Comma or space-separated. Used for booking validation.">
                  <Input name="serviceZipCodes" defaultValue={settings.serviceZipCodes.join(', ')}
                    placeholder="79938, 79936, 79927" />
                </Field>
              </Section>

              {scheduling.error && <p className="text-sm text-red-600">{scheduling.error}</p>}
              <div className="flex justify-end">
                <SaveButton isPending={scheduling.isPending} saved={scheduling.saved} />
              </div>
            </form>

            {/* Blackout dates — separate action, no form submit */}
            <Section title="Blackout Dates">
              <p className="text-xs text-gray-500 mb-3">No jobs can be created on these dates.</p>
              <div className="flex items-center gap-2 mb-4">
                <input type="date" value={newBlackout} onChange={e => setNewBlackout(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <button type="button" onClick={handleAddBlackout} disabled={!newBlackout || blackoutPending}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              {blackoutDates.length === 0 ? (
                <p className="text-sm text-gray-400">No blackout dates set.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {blackoutDates.map(d => (
                    <div key={d} className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 text-sm text-red-700">
                      {format(parseISO(d), 'MMM d, yyyy')}
                      <button type="button" onClick={() => handleRemoveBlackout(d)} disabled={blackoutPending}
                        className="text-red-400 hover:text-red-600 ml-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}

        {/* ── Invoicing & Payment ──────────────────────────────────────────────── */}
        {tab === 'invoicing' && (
          <form onSubmit={invoicing.handleSubmit} className="space-y-5">
            <Section title="Cancellation Policy">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cancellation Window" hint="Hours before appointment when fee applies.">
                  <div className="flex items-center gap-2">
                    <Input name="cancellationWindowHours" type="number" defaultValue={settings.cancellationWindowHours} className="w-24" />
                    <span className="text-sm text-gray-500">hours</span>
                  </div>
                </Field>
                <Field label="Default Cancellation Fee">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <input name="cancellationFeeDefault" type="number" step="0.01"
                      defaultValue={settings.cancellationFeeDefault ?? ''} placeholder="0.00"
                      className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy" />
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Invoice Settings">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Invoice Prefix" hint="e.g. INV generates INV-0001">
                    <Input name="invoiceNumberPrefix" defaultValue={settings.invoiceNumberPrefix} placeholder="INV" />
                  </Field>
                  <Field label="Default Payment Method">
                    <select name="defaultPaymentMethod" defaultValue={settings.defaultPaymentMethod}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="zelle">Zelle</option>
                      <option value="cash">Cash</option>
                      <option value="cash-app">Cash App</option>
                      <option value="check">Check</option>
                    </select>
                  </Field>
                </div>
                <Field label="Zelle Payment Link" hint="The Zelle link embedded in invoice emails.">
                  <Input name="zellePaymentLink" defaultValue={settings.zellePaymentLink} placeholder="https://enroll.zellepay.com/..." />
                </Field>
                <Field label="Invoice Footer Text" hint="Appears at the bottom of all PDF invoices.">
                  <textarea name="invoiceFooterText" defaultValue={settings.invoiceFooterText ?? ''}
                    rows={3} placeholder="Cancellations made less than 24 hours before your appointment may be subject to a fee."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy" />
                </Field>
              </div>
            </Section>

            {invoicing.error && <p className="text-sm text-red-600">{invoicing.error}</p>}
            <div className="flex justify-end">
              <SaveButton isPending={invoicing.isPending} saved={invoicing.saved} />
            </div>
          </form>
        )}

        {/* ── Payroll ──────────────────────────────────────────────────────────── */}
        {tab === 'payroll' && (() => {
          const previewPeriod = getPayPeriod(
            { payPeriodFrequency: payFreq, payPeriodStartDay: payStartDay },
            0,
          )
          const showStartDay = payFreq === 'weekly' || payFreq === 'biweekly'
          const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const FREQ_OPTIONS: { key: PayPeriodFrequency; label: string }[] = [
            { key: 'weekly', label: 'Weekly' },
            { key: 'biweekly', label: 'Biweekly' },
            { key: 'semi_monthly', label: 'Semi-Monthly' },
            { key: 'monthly', label: 'Monthly' },
          ]

          return (
            <div className="space-y-5">
              <Section title="Pay Period Settings">
                <div className="space-y-5">
                  <Field label="Pay Period Frequency">
                    <div className="flex flex-wrap gap-2">
                      {FREQ_OPTIONS.map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPayFreq(key)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            payFreq === key
                              ? 'bg-brand-navy text-white border-brand-navy'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {showStartDay && (
                    <Field label="Pay Period Start Day">
                      <div className="flex flex-wrap gap-2">
                        {DAY_NAMES.map((name, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPayStartDay(i)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              payStartDay === i
                                ? 'bg-brand-navy text-white border-brand-navy'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}

                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
                    Based on your settings, the current pay period is{' '}
                    <span className="font-semibold text-gray-900">{previewPeriod.label}</span>
                  </div>
                </div>
              </Section>

              {payrollError && <p className="text-sm text-red-600">{payrollError}</p>}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePayrollSave}
                  disabled={payrollPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50"
                >
                  {payrollPending ? 'Saving…' : payrollSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Save Changes'}
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── Reviews ──────────────────────────────────────────────────────────── */}
        {tab === 'reviews' && (
          <form onSubmit={reviews.handleSubmit} className="space-y-5">
            <Section title="Google My Business">
              <Field label="Google Place ID" hint="Found in your Google Business Profile. Used to generate the review link.">
                <Input name="googlePlaceId" defaultValue={settings.googlePlaceId} placeholder="ChIJ..." />
              </Field>
              {!settings.googlePlaceId && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Without a Place ID, review links will redirect to Google Maps instead of your review page.
                </p>
              )}
            </Section>

            <Section title="Review Request Automation">
              <div className="space-y-4">
                <Field
                  label="Send Hour"
                  hint="Hour of day to send review request emails (daily cron). Default: 9 AM."
                >
                  <div className="space-y-2">
                    <select name="reviewRequestHour" defaultValue={settings.reviewRequestHour}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {HOUR_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                    {/* C-34: Vercel cron schedule is a static string — cannot read from DB at runtime */}
                    <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        Changing this time requires a code deployment to take effect. The Vercel cron schedule is a static string and cannot read from the database at runtime.
                      </p>
                    </div>
                  </div>
                </Field>

                <Field label="Cooldown Period" hint="Minimum days between review requests for the same client.">
                  <div className="flex items-center gap-2">
                    <Input name="reviewCooldownDays" type="number" defaultValue={settings.reviewCooldownDays} className="w-24" />
                    <span className="text-sm text-gray-500">days</span>
                  </div>
                </Field>

                <div className="flex items-center gap-3">
                  <input type="checkbox" name="reviewRequestSkipWeekends" id="skipWeekends"
                    defaultChecked={settings.reviewRequestSkipWeekends}
                    className="rounded border-gray-300" />
                  <label htmlFor="skipWeekends" className="text-sm text-gray-700">
                    Skip sending review requests on weekends
                  </label>
                </div>
              </div>
            </Section>

            {reviews.error && <p className="text-sm text-red-600">{reviews.error}</p>}
            <div className="flex justify-end">
              <SaveButton isPending={reviews.isPending} saved={reviews.saved} />
            </div>
          </form>
        )}

        {/* ── Notifications ────────────────────────────────────────────────────── */}
        {tab === 'notifications' && (
          <form onSubmit={notifications.handleSubmit} className="space-y-5">
            <Section title="Admin Alert Destinations">
              <div className="space-y-4">
                <Field label="Notification Email" hint="Receives admin alerts — stale leads, overdue invoices, open clock entries, etc.">
                  <Input name="adminNotificationEmail" type="email" defaultValue={settings.adminNotificationEmail}
                    placeholder="alerts@comfycleanco.com" />
                </Field>
                <Field label="Notification Phone" hint="Used for SMS alerts when Twilio is connected.">
                  <Input name="adminNotificationPhone" type="tel" defaultValue={settings.adminNotificationPhone}
                    placeholder="+19155550100" />
                </Field>
              </div>
            </Section>

            <Section title="Integrations">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Google My Business</p>
                    <p className="text-xs text-gray-500">Sync reviews automatically via daily cron</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Twilio (SMS)</p>
                    <p className="text-xs text-gray-500">SMS client communications</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">GoHighLevel</p>
                    <p className="text-xs text-gray-500">CRM automation</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Not connected</span>
                </div>
              </div>
            </Section>

            {notifications.error && <p className="text-sm text-red-600">{notifications.error}</p>}
            <div className="flex justify-end">
              <SaveButton isPending={notifications.isPending} saved={notifications.saved} />
            </div>
          </form>
        )}

        {/* ── Automations ──────────────────────────────────────────────────────── */}
        {tab === 'automations' && (
          <div className="space-y-5">

            {/* Global Pause */}
            <div className={`rounded-xl border-2 p-4 flex items-start gap-4 ${autoSettings.globalPause ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Global Pause</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pauses all <strong>client-facing</strong> communications — appointment reminders, review requests, and cleaner on-the-way texts. Admin alerts and financial automations continue running.
                </p>
              </div>
              <button type="button"
                onClick={() => setAutoSettings(prev => ({ ...prev, globalPause: !prev.globalPause }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${autoSettings.globalPause ? 'bg-red-500' : 'bg-gray-200'}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${autoSettings.globalPause ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Client Communications */}
            <Section title="Client Communications">
              <div className="space-y-3">
                {[
                  { key: 'appointmentReminder', label: 'Appointment Reminders', hint: 'Send reminder SMS/email the evening before each appointment.' },
                  { key: 'cleanerOnTheWay', label: 'Cleaner On The Way', hint: 'Alert client when cleaner clocks in. (Requires cleaner portal.)' },
                  { key: 'reviewRequest', label: 'Review Requests', hint: 'Queue review request when a job is marked paid.' },
                ].map(({ key, label, hint }) => (
                  <div key={key} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <button type="button"
                      onClick={() => setAutoGroup('clientCommunications', key, (autoSettings.clientCommunications as Record<string, boolean> | undefined)?.[key] === false)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-0.5 ${(autoSettings.clientCommunications as Record<string, boolean> | undefined)?.[key] !== false ? 'bg-brand-navy' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${(autoSettings.clientCommunications as Record<string, boolean> | undefined)?.[key] !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Appointment Reminder Hour — C-34 warning */}
            <Section title="Appointment Reminder Schedule">
              <Field
                label="Send Hour"
                hint="Hour of day to send appointment reminder emails/SMS (daily cron). Default: 6 PM."
              >
                <div className="space-y-2">
                  <select value={autoReminderHour} onChange={e => setAutoReminderHour(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    {HOUR_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                  {/* C-34: Vercel cron schedule is static */}
                  <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Changing this time requires a code deployment to take effect. The Vercel cron schedule is a static string and cannot read from the database at runtime.
                    </p>
                  </div>
                </div>
              </Field>
            </Section>

            {/* Admin Alerts */}
            <Section title="Admin Alerts">
              <div className="space-y-3">
                {[
                  { key: 'newLead', label: 'New Lead Alert', hint: 'SMS when a new lead is submitted via the contact form.' },
                  { key: 'staleLead', label: 'Stale Lead Alert', hint: 'Nightly alert for leads with no contact within the threshold.' },
                  { key: 'overdueInvoice', label: 'Overdue Invoice Alert', hint: 'Nightly alert for overdue invoices.' },
                  { key: 'openClockEntry', label: 'Open Clock Entry Alert', hint: 'Alert when a cleaner never clocked out.' },
                  { key: 'negativeReview', label: 'Negative Review Alert', hint: 'Alert when a new ≤3-star Google review is detected.' },
                  { key: 'capacityWarning', label: 'Capacity Warning', hint: 'Alert when tomorrow is at ≥90% booking capacity.' },
                ].map(({ key, label, hint }) => (
                  <div key={key} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <button type="button"
                      onClick={() => setAutoGroup('adminAlerts', key, (autoSettings.adminAlerts as Record<string, boolean> | undefined)?.[key] === false)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-0.5 ${(autoSettings.adminAlerts as Record<string, boolean> | undefined)?.[key] !== false ? 'bg-brand-navy' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${(autoSettings.adminAlerts as Record<string, boolean> | undefined)?.[key] !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Financial Automations */}
            <Section title="Financial Automations">
              <div className="space-y-3">
                {[
                  { key: 'invoiceGeneration', label: 'Auto-Generate Invoice', hint: 'Create and send invoice automatically when a job is created.' },
                  { key: 'overdueTransition', label: 'Auto-Overdue Transition', hint: 'Mark invoice overdue when all cleaners clock out and due date has passed.' },
                ].map(({ key, label, hint }) => (
                  <div key={key} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <button type="button"
                      onClick={() => setAutoGroup('financialAutomations', key, (autoSettings.financialAutomations as Record<string, boolean> | undefined)?.[key] === false)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-0.5 ${(autoSettings.financialAutomations as Record<string, boolean> | undefined)?.[key] !== false ? 'bg-brand-navy' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${(autoSettings.financialAutomations as Record<string, boolean> | undefined)?.[key] !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {autoError && <p className="text-sm text-red-600">{autoError}</p>}
            <div className="flex justify-end">
              <button type="button" onClick={handleAutoSave} disabled={autoPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50">
                {autoPending ? 'Saving…' : autoSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
