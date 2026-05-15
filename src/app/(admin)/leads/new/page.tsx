'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createManualLead } from '@/app/(admin)/leads/actions'

const SMS_OPTIONS = [
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
]

export default function NewLeadPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [smsChoice, setSmsChoice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (phone && !smsChoice) {
      setError('Please select an SMS communication preference.')
      return
    }

    setSaving(true)
    const formData = new FormData(e.currentTarget)
    try {
      await createManualLead(formData)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message)
        setSaving(false)
      }
    }
  }

  return (
    <div className="p-6 max-w-screen-md mx-auto">
      <div className="mb-6">
        <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Link>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          New Lead
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Manually add a lead to the CRM</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Contact Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
              <input
                name="name"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
              <input
                name="phone"
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setSmsChoice('') }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Source</label>
              <select
                name="source"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="manual">Manual Entry</option>
                <option value="referral">Referral</option>
                <option value="phone">Phone Call</option>
                <option value="google">Google</option>
                <option value="facebook">Facebook</option>
                <option value="nextdoor">Nextdoor</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Service Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Service Type *</label>
              <select
                name="type"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Frequency *</label>
              <select
                name="frequency"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="one-time">One-Time</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Day</label>
              <select
                name="preferredDay"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="">—</option>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => (
                  <option key={d} value={d.toLowerCase()}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Time</label>
              <select
                name="preferredTime"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="">—</option>
                <option value="morning">Morning (8am–12pm)</option>
                <option value="afternoon">Afternoon (12pm–5pm)</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes from Lead</label>
            <textarea
              name="notes"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Admin Notes (internal)</label>
            <textarea
              name="adminNotes"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 resize-none"
            />
          </div>
        </div>

        {/* SMS Opt-In Control — shown only when phone is present */}
        {phone && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              SMS Communications <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">Required when a phone number is provided.</p>
            <input type="hidden" name="smsChoice" value={smsChoice} />
            <div className="space-y-3">
              {SMS_OPTIONS.map(opt => (
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

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link
            href="/leads"
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium bg-brand-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  )
}
