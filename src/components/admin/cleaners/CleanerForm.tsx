'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCleaner, updateCleaner } from '@/app/(admin)/cleaners/actions'

interface CleanerData {
  id?: string
  name?: string
  email?: string | null
  phone?: string | null
  dateHired?: Date | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  hourlyRate?: number
  payType?: string
  availableDays?: string[]
  internalNotes?: string | null
}

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

export default function CleanerForm({ cleaner }: { cleaner?: CleanerData }) {
  const router = useRouter()
  const isEdit = !!cleaner?.id

  const [payType, setPayType] = useState(cleaner?.payType ?? 'hourly')
  const [availableDays, setAvailableDays] = useState<string[]>(cleaner?.availableDays ?? [])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toggleDay(day: string) {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  async function handleSubmit(formData: FormData) {
    availableDays.forEach((d) => formData.append('availableDays', d))
    setError('')
    setPending(true)
    try {
      if (isEdit) {
        await updateCleaner(cleaner!.id!, formData)
      } else {
        await createCleaner(formData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPending(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy'
  const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1'
  const sectionCls = 'bg-white rounded-xl border border-gray-200 p-5 space-y-4'

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Identity */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900">Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input name="name" defaultValue={cleaner?.name ?? ''} required className={inputCls} placeholder="Jane Doe" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input name="email" type="email" defaultValue={cleaner?.email ?? ''} className={inputCls} placeholder="jane@example.com" />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input name="phone" defaultValue={cleaner?.phone ?? ''} className={inputCls} placeholder="(915) 555-0100" />
          </div>
          <div>
            <label className={labelCls}>Date Hired</label>
            <input
              name="dateHired"
              type="date"
              defaultValue={cleaner?.dateHired ? cleaner.dateHired.toISOString().split('T')[0] : ''}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900">Emergency Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Contact Name</label>
            <input name="emergencyContactName" defaultValue={cleaner?.emergencyContactName ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact Phone</label>
            <input name="emergencyContactPhone" defaultValue={cleaner?.emergencyContactPhone ?? ''} className={inputCls} />
          </div>
        </div>
      </div>

      {/* PIN — create only */}
      {!isEdit && (
        <div className={sectionCls}>
          <h2 className="text-sm font-semibold text-gray-900">Access PIN</h2>
          <p className="text-xs text-gray-500">PIN is used to clock in/out via the time clock app. Must be exactly 4 digits.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>PIN *</label>
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                minLength={4}
                pattern="\d{4}"
                required
                className={inputCls}
                placeholder="••••"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className={labelCls}>Confirm PIN *</label>
              <input
                name="confirmPin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                minLength={4}
                pattern="\d{4}"
                required
                className={inputCls}
                placeholder="••••"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
      )}

      {/* Compensation */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900">Compensation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Hourly Rate * ($/hr)</label>
            <input
              name="hourlyRate"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={cleaner?.hourlyRate ?? ''}
              required
              className={inputCls}
              placeholder="15.00"
            />
          </div>
          <div>
            <label className={labelCls}>Pay Type</label>
            <div className="flex gap-2">
              {[
                { value: 'hourly', label: 'Hourly' },
                { value: 'per_job', label: 'Per Job' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPayType(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    payType === opt.value
                      ? 'bg-brand-navy text-white border-brand-navy'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <input type="hidden" name="payType" value={payType} />
            </div>
            {payType === 'per_job' && (
              <p className="text-xs text-amber-600 mt-2">Per-job pay calculation is a stub — rate logic will be wired in a future phase.</p>
            )}
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900">Availability</h2>
        <p className="text-xs text-gray-500">Days this cleaner typically works. Leave unselected if flexible.</p>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                availableDays.includes(day)
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900">Internal Notes</h2>
        <textarea
          name="internalNotes"
          defaultValue={cleaner?.internalNotes ?? ''}
          rows={4}
          className={inputCls}
          placeholder="Admin-only notes…"
        />
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
          {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Cleaner'}
        </button>
      </div>
    </form>
  )
}
