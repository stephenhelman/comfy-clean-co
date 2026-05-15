'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, updateClient } from '@/app/(admin)/clients/actions'

interface Cleaner {
  id: string
  name: string
}

interface ClientData {
  id?: string
  name?: string
  email?: string | null
  phone?: string | null
  type?: string
  companyName?: string | null
  secondaryContactName?: string | null
  secondaryContactEmail?: string | null
  secondaryContactPhone?: string | null
  secondaryContactTitle?: string | null
  defaultAddress?: string | null
  defaultCity?: string | null
  defaultZip?: string | null
  accessNotes?: string | null
  petNotes?: string | null
  specialInstructions?: string | null
  defaultFrequency?: string | null
  defaultJobType?: string | null
  preferredDay?: string | null
  preferredTime?: string | null
  preferredCleanerId?: string | null
  standardRate?: number | null
  preferredPaymentMethod?: string | null
  acquisitionSource?: string | null
  referredBy?: string | null
  internalNotes?: string | null
}

interface Props {
  client?: ClientData
  cleaners: Cleaner[]
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'flexible']
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
  sunday: 'Sunday', flexible: 'Flexible',
}

function ButtonGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            value === opt.value
              ? 'bg-brand-navy text-white border-brand-navy'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
      <input type="hidden" name={name} value={value} />
    </div>
  )
}

function ToggleGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            value === opt.value
              ? 'bg-brand-navy text-white border-brand-navy'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
      <input type="hidden" name={name} value={value} />
    </div>
  )
}

export default function ClientForm({ client, cleaners }: Props) {
  const router = useRouter()
  const isEdit = !!client?.id

  const [type, setType] = useState(client?.type ?? 'residential')
  const [frequency, setFrequency] = useState(client?.defaultFrequency ?? '')
  const [jobType, setJobType] = useState(client?.defaultJobType ?? '')
  const [preferredTime, setPreferredTime] = useState(client?.preferredTime ?? '')
  const [payMethod, setPayMethod] = useState(client?.preferredPaymentMethod ?? '')
  const [acqSource, setAcqSource] = useState(client?.acquisitionSource ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [smsChoice, setSmsChoice] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')

    // Validate SMS choice when phone is present and creating new client
    if (!isEdit && phone && !smsChoice) {
      setError('Please select an SMS communication preference.')
      return
    }

    setPending(true)
    try {
      if (isEdit) {
        await updateClient(client!.id!, formData)
      } else {
        await createClient(formData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPending(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy'
  const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1'
  const sectionCls = 'bg-white rounded-xl border border-gray-200 p-5 space-y-4'
  const sectionHeadCls = 'text-sm font-semibold text-gray-900 mb-1'

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Identity */}
      <div className={sectionCls}>
        <h2 className={sectionHeadCls}>Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Type *</label>
            <ButtonGroup
              name="type"
              value={type}
              onChange={setType}
              options={[
                { value: 'residential', label: 'Residential' },
                { value: 'commercial', label: 'Commercial' },
              ]}
            />
          </div>
          <div>
            <label className={labelCls}>Name *</label>
            <input name="name" defaultValue={client?.name ?? ''} required className={inputCls} placeholder="Jane Smith" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input name="email" type="email" defaultValue={client?.email ?? ''} className={inputCls} placeholder="jane@example.com" />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              name="phone"
              value={phone}
              onChange={e => { setPhone(e.target.value); if (!isEdit) setSmsChoice('') }}
              className={inputCls}
              placeholder="(915) 555-0100"
            />
          </div>
          {type === 'commercial' && (
            <div>
              <label className={labelCls}>Company Name</label>
              <input name="companyName" defaultValue={client?.companyName ?? ''} className={inputCls} placeholder="Acme Corp" />
            </div>
          )}
        </div>
      </div>

      {/* Secondary Contact — commercial only */}
      {type === 'commercial' && (
        <div className={sectionCls}>
          <h2 className={sectionHeadCls}>Secondary Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contact Name</label>
              <input name="secondaryContactName" defaultValue={client?.secondaryContactName ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Title</label>
              <input name="secondaryContactTitle" defaultValue={client?.secondaryContactTitle ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input name="secondaryContactEmail" type="email" defaultValue={client?.secondaryContactEmail ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input name="secondaryContactPhone" defaultValue={client?.secondaryContactPhone ?? ''} className={inputCls} />
            </div>
          </div>
        </div>
      )}

      {/* SMS Opt-In Control — new clients only, shown when phone is present */}
      {!isEdit && phone && (
        <div className={sectionCls}>
          <h2 className={sectionHeadCls}>
            SMS Communications <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-gray-500 -mt-2">Required when a phone number is provided.</p>
          <input type="hidden" name="smsChoice" value={smsChoice} />
          <div className="space-y-3">
            {[
              {
                value: 'send_now',
                label: 'Send opt-in text now',
                description: "We'll text them asking to confirm. They reply YES to start receiving updates.",
              },
              {
                value: 'verbal',
                label: 'Already confirmed verbally',
                description: "They agreed on the call or in person. We'll skip the opt-in text and add them directly.",
              },
              {
                value: 'email_only',
                label: 'Email only',
                description: "Don't send any SMS to this contact. They can be opted in later from their profile.",
              },
            ].map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  smsChoice === opt.value
                    ? 'border-brand-navy bg-brand-navy/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="smsChoiceRadio"
                  value={opt.value}
                  checked={smsChoice === opt.value}
                  onChange={() => setSmsChoice(opt.value)}
                  className="mt-0.5 accent-brand-navy"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Default Service Address */}
      <div className={sectionCls}>
        <h2 className={sectionHeadCls}>Default Service Address</h2>
        <div>
          <label className={labelCls}>Address *</label>
          <input name="defaultAddress" defaultValue={client?.defaultAddress ?? ''} required className={inputCls} placeholder="123 Main St" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>City *</label>
            <input name="defaultCity" defaultValue={client?.defaultCity ?? ''} required className={inputCls} placeholder="El Paso" />
          </div>
          <div>
            <label className={labelCls}>Zip *</label>
            <input name="defaultZip" defaultValue={client?.defaultZip ?? ''} required maxLength={5} className={inputCls} placeholder="79938" />
          </div>
        </div>
      </div>

      {/* Access & Instructions */}
      <div className={sectionCls}>
        <h2 className={sectionHeadCls}>Access & Instructions</h2>
        <div>
          <label className={labelCls}>Access Notes</label>
          <textarea name="accessNotes" defaultValue={client?.accessNotes ?? ''} rows={3} className={inputCls} placeholder="Gate code, key location, entry instructions…" />
        </div>
        <div>
          <label className={labelCls}>Pet Notes</label>
          <textarea name="petNotes" defaultValue={client?.petNotes ?? ''} rows={2} className={inputCls} placeholder="Dogs, cats, animals on property…" />
        </div>
        <div>
          <label className={labelCls}>Special Instructions</label>
          <textarea name="specialInstructions" defaultValue={client?.specialInstructions ?? ''} rows={3} className={inputCls} placeholder="Anything else cleaners need to know on arrival…" />
        </div>
      </div>

      {/* Service Preferences */}
      <div className={sectionCls}>
        <h2 className={sectionHeadCls}>Service Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Default Frequency</label>
            <ToggleGroup
              name="defaultFrequency"
              value={frequency}
              onChange={setFrequency}
              options={[
                { value: 'one-time', label: 'One-Time' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Biweekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </div>
          <div>
            <label className={labelCls}>Default Job Type</label>
            <ToggleGroup
              name="defaultJobType"
              value={jobType}
              onChange={setJobType}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'deep', label: 'Deep Clean' },
                { value: 'move-out', label: 'Move-Out' },
              ]}
            />
          </div>
          <div>
            <label className={labelCls}>Preferred Day</label>
            <select name="preferredDay" defaultValue={client?.preferredDay ?? ''} className={inputCls}>
              <option value="">No preference</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Preferred Time</label>
            <ToggleGroup
              name="preferredTime"
              value={preferredTime}
              onChange={setPreferredTime}
              options={[
                { value: 'morning', label: 'Morning' },
                { value: 'afternoon', label: 'Afternoon' },
                { value: 'evening', label: 'Evening' },
                { value: 'flexible', label: 'Flexible' },
              ]}
            />
          </div>
          <div>
            <label className={labelCls}>Preferred Cleaner</label>
            <select name="preferredCleanerId" defaultValue={client?.preferredCleanerId ?? ''} className={inputCls}>
              <option value="">No preference</option>
              {cleaners.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Billing Preferences */}
      <div className={sectionCls}>
        <h2 className={sectionHeadCls}>Billing Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Standard Rate ($/visit)</label>
            <input
              name="standardRate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={client?.standardRate ?? ''}
              className={inputCls}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelCls}>Preferred Payment Method</label>
            <ToggleGroup
              name="preferredPaymentMethod"
              value={payMethod}
              onChange={setPayMethod}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'check', label: 'Check' },
                { value: 'venmo', label: 'Venmo' },
                { value: 'zelle', label: 'Zelle' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Relationship */}
      <div className={sectionCls}>
        <h2 className={sectionHeadCls}>Relationship</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Acquisition Source</label>
            <ToggleGroup
              name="acquisitionSource"
              value={acqSource}
              onChange={setAcqSource}
              options={[
                { value: 'lead_conversion', label: 'Lead Conversion' },
                { value: 'referral', label: 'Referral' },
                { value: 'direct', label: 'Direct' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
          {acqSource === 'referral' && (
            <div>
              <label className={labelCls}>Referred By</label>
              <input name="referredBy" defaultValue={client?.referredBy ?? ''} className={inputCls} placeholder="Name of person who referred them" />
            </div>
          )}
          <div>
            <label className={labelCls}>Internal Notes</label>
            <textarea name="internalNotes" defaultValue={client?.internalNotes ?? ''} rows={4} className={inputCls} placeholder="Admin-only notes, never shown to client…" />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-navy-dark transition-colors disabled:opacity-50"
        >
          {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Client'}
        </button>
      </div>
    </form>
  )
}
