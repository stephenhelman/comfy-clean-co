'use client'

import { useState } from 'react'
import { Home, Building2, Check } from 'lucide-react'

const inputClass =
  'w-full bg-white border border-gray-300 text-brand-navy-dark placeholder:text-gray-500 rounded-lg px-4 py-3 font-inter text-sm focus:border-brand-green focus:ring-2 focus:ring-brand-green/30 focus:outline-none transition-colors'

const labelClass = 'block font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-2'
const errorClass = 'text-red-500 font-inter text-xs mt-1'

type Fields = {
  name: string; email: string; phone: string
  type: string; frequency: string
  preferredDay: string; preferredTime: string; source: string; notes: string
  website: string
}

const empty: Fields = {
  name: '', email: '', phone: '', type: '', frequency: '',
  preferredDay: '', preferredTime: '', source: '', notes: '', website: '',
}

type FieldErrors = Partial<Record<keyof Fields, string>>

function ToggleButton({ value, current, onClick, children }: {
  value: string; current: string; onClick: (v: string) => void; children: React.ReactNode
}) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-pressed={active}
      className={`press flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 font-inter text-sm font-medium transition-colors ${
        active
          ? 'border-brand-green bg-brand-green text-white shadow-sm'
          : 'border-gray-200 bg-white text-brand-navy hover:border-brand-green/50 hover:bg-brand-green-pale'
      }`}
    >
      {children}
    </button>
  )
}

export default function ContactForm() {
  const [fields, setFields] = useState<Fields>(empty)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [apiError, setApiError] = useState('')

  function set(key: keyof Fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function setToggle(key: 'type' | 'frequency') {
    return (value: string) => set(key, value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Client-side validation
    const errors: FieldErrors = {}
    if (!fields.name || fields.name.trim().length < 2) errors.name = 'Name is required'
    if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = 'Valid email required'
    const digits = fields.phone.replace(/\D/g, '')
    if (!digits || digits.length < 10) errors.phone = 'Valid 10-digit phone number required'
    if (!fields.type) errors.type = 'Please select a cleaning type'
    if (!fields.frequency) errors.frequency = 'Please select a frequency'
    if (fields.notes && fields.notes.length > 500) errors.notes = 'Notes must be under 500 characters'

    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    setStatus('loading')
    setApiError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (res.ok) {
        setStatus('success')
      } else if (res.status === 400 && json.fields) {
        const sf = json.fields as Record<string, string[]>
        setFieldErrors({ name: sf.name?.[0], email: sf.email?.[0], phone: sf.phone?.[0], type: sf.type?.[0], frequency: sf.frequency?.[0] })
        setStatus('idle')
      } else if (res.status === 429) {
        setApiError('Too many submissions. Please try again later.')
        setStatus('error')
      } else {
        setApiError(json.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setApiError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="animate-pop-in rounded-2xl border border-brand-green bg-brand-green-pale p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green">
          <Check size={30} className="text-white" strokeWidth={3} />
        </div>
        <p className="mb-2 font-poppins text-xl font-bold text-brand-navy">
          Thanks {fields.name.split(' ')[0]}, we&apos;ll be in touch soon!
        </p>
        <p className="font-inter text-sm text-brand-navy-dark">
          We typically respond within a few hours. You can also reach us at <strong>915-979-5151</strong>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        style={{ display: 'none' }}
        value={fields.website}
        onChange={(e) => set('website', e.target.value)}
      />

      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="contact-name" className={labelClass}>Full Name *</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            placeholder="Your name"
            value={fields.name}
            onChange={(e) => set('name', e.target.value)}
            className={`${inputClass} ${fieldErrors.name ? 'border-red-500' : ''}`}
          />
          {fieldErrors.name && <p className={errorClass}>{fieldErrors.name}</p>}
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>Email *</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={fields.email}
            onChange={(e) => set('email', e.target.value)}
            className={`${inputClass} ${fieldErrors.email ? 'border-red-500' : ''}`}
          />
          {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}
        </div>
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="contact-phone" className={labelClass}>Phone Number *</label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          placeholder="(915) 000-0000"
          value={fields.phone}
          onChange={(e) => set('phone', e.target.value)}
          className={`${inputClass} ${fieldErrors.phone ? 'border-red-500' : ''}`}
        />
        {fieldErrors.phone && <p className={errorClass}>{fieldErrors.phone}</p>}
      </div>

      {/* Type — button pair */}
      <div>
        <label className={labelClass}>Type of Cleaning *</label>
        <div className="flex gap-3">
          <ToggleButton value="residential" current={fields.type} onClick={setToggle('type')}>
            <Home size={16} /> Residential
          </ToggleButton>
          <ToggleButton value="commercial" current={fields.type} onClick={setToggle('type')}>
            <Building2 size={16} /> Commercial
          </ToggleButton>
        </div>
        {fieldErrors.type && <p className={errorClass}>{fieldErrors.type}</p>}
      </div>

      {/* Frequency — button pair */}
      <div>
        <label className={labelClass}>How Often? *</label>
        <div className="flex gap-3">
          <ToggleButton value="one-time" current={fields.frequency} onClick={setToggle('frequency')}>
            One-Time
          </ToggleButton>
          <ToggleButton value="recurring" current={fields.frequency} onClick={setToggle('frequency')}>
            Recurring
          </ToggleButton>
        </div>
        {fieldErrors.frequency && <p className={errorClass}>{fieldErrors.frequency}</p>}
      </div>

      {/* Preferred Day + Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="preferred-day" className={labelClass}>Preferred Day</label>
          <select
            id="preferred-day"
            value={fields.preferredDay}
            onChange={(e) => set('preferredDay', e.target.value)}
            className={inputClass}
          >
            <option value="">No preference</option>
            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Flexible'].map((d) => (
              <option key={d} value={d.toLowerCase()}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="preferred-time" className={labelClass}>Preferred Time</label>
          <select
            id="preferred-time"
            value={fields.preferredTime}
            onChange={(e) => set('preferredTime', e.target.value)}
            className={inputClass}
          >
            <option value="">No preference</option>
            <option value="morning">Morning (8am–12pm)</option>
            <option value="afternoon">Afternoon (12pm–5pm)</option>
            <option value="evening">Evening (5pm–8pm)</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>

      {/* Source */}
      <div>
        <label htmlFor="contact-source" className={labelClass}>How did you hear about us?</label>
        <select
          id="contact-source"
          value={fields.source}
          onChange={(e) => set('source', e.target.value)}
          className={inputClass}
        >
          <option value="">Select one (optional)</option>
          <option value="google">Google</option>
          <option value="referral">Referral</option>
          <option value="social_media">Social Media</option>
          <option value="drove_by">Drove By</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="contact-notes" className={labelClass}>
          Anything else we should know?
          <span className="font-normal normal-case text-gray-400 ml-1">({500 - fields.notes.length} chars remaining)</span>
        </label>
        <textarea
          id="contact-notes"
          name="notes"
          rows={4}
          placeholder="Pet situation, access instructions, specific areas of concern..."
          value={fields.notes}
          onChange={(e) => set('notes', e.target.value)}
          maxLength={500}
          className={`${inputClass} ${fieldErrors.notes ? 'border-red-500' : ''}`}
        />
        {fieldErrors.notes && <p className={errorClass}>{fieldErrors.notes}</p>}
      </div>

      {status === 'error' && (
        <p className="text-red-500 font-inter text-sm">{apiError}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="press w-full rounded-lg bg-brand-green py-4 font-poppins text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-green-dark disabled:opacity-50"
      >
        {status === 'loading' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
