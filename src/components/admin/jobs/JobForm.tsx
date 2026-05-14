'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createJob, updateJob } from '@/app/(admin)/jobs/actions'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  defaultAddress: string | null
  defaultCity: string | null
  defaultZip: string | null
  defaultFrequency: string | null
  defaultJobType: string | null
  standardRate: number | null
  preferredPaymentMethod: string | null
}

interface PreviousAddress {
  serviceAddress: string
  serviceCity: string
  serviceZip: string
}

interface JobData {
  id?: string
  clientId?: string
  serviceAddress?: string | null
  serviceCity?: string | null
  serviceZip?: string | null
  scheduledAt?: string
  estimatedHours?: number | null
  jobType?: string
  notes?: string | null
  estimatedValue?: number | null
  paymentMethod?: string | null
  recurringRule?: string | null
  status?: string
}

interface Props {
  clients: Client[]
  job?: JobData
  prefilledClientId?: string
  prefilledDate?: string
  prefilledTime?: string
  blackoutDates?: string[]
  maxJobsPerDay?: number
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

export default function JobForm({ clients, job, prefilledClientId, prefilledDate, prefilledTime, blackoutDates = [], maxJobsPerDay = 8 }: Props) {
  const router = useRouter()
  const isEdit = !!job?.id

  const [clientId, setClientId] = useState(job?.clientId ?? prefilledClientId ?? '')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [prevAddresses, setPrevAddresses] = useState<PreviousAddress[]>([])
  const [useCustomAddress, setUseCustomAddress] = useState(false)
  const [serviceAddress, setServiceAddress] = useState(job?.serviceAddress ?? '')
  const [serviceCity, setServiceCity] = useState(job?.serviceCity ?? '')
  const [serviceZip, setServiceZip] = useState(job?.serviceZip ?? '')
  const [jobType, setJobType] = useState(job?.jobType ?? 'standard')
  const [recurringRule, setRecurringRule] = useState(job?.recurringRule ?? 'none')
  const [paymentMethod, setPaymentMethod] = useState(job?.paymentMethod ?? '')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  // Build default datetime-local value
  const defaultDatetime = (() => {
    if (job?.scheduledAt) return job.scheduledAt.slice(0, 16)
    if (prefilledDate && prefilledTime) return `${prefilledDate}T${prefilledTime}`
    if (prefilledDate) return `${prefilledDate}T09:00`
    return ''
  })()

  useEffect(() => {
    if (!clientId) { setSelectedClient(null); return }
    const c = clients.find((c) => c.id === clientId) ?? null
    setSelectedClient(c)
    if (c && !isEdit) {
      setServiceAddress(c.defaultAddress ?? '')
      setServiceCity(c.defaultCity ?? '')
      setServiceZip(c.defaultZip ?? '')
      if (c.defaultJobType) setJobType(c.defaultJobType)
      if (c.preferredPaymentMethod) setPaymentMethod(c.preferredPaymentMethod)
    }
  }, [clientId, clients, isEdit])

  // Fetch previous addresses when client changes
  useEffect(() => {
    if (!clientId) { setPrevAddresses([]); return }
    fetch(`/api/clients/${clientId}/addresses`)
      .then((r) => r.json())
      .then((data) => setPrevAddresses(data ?? []))
      .catch(() => setPrevAddresses([]))
  }, [clientId])

  async function handleSubmit(formData: FormData) {
    setError('')
    setPending(true)
    try {
      if (isEdit) {
        await updateJob(job!.id!, formData)
      } else {
        await createJob(formData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPending(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy'
  const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1'
  const sectionCls = 'bg-white rounded-xl border border-gray-200 p-5 space-y-4'

  const canEditAddress = !isEdit || job?.status === 'stand_by' || job?.status === 'scheduled'
  const canEditValue = !isEdit || job?.status === 'stand_by'
  const canEditPayment = !isEdit || job?.status === 'stand_by'
  const canEditSchedule = !isEdit || job?.status === 'stand_by' || job?.status === 'scheduled'

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Hidden edit scope for recurring */}
      {isEdit && <input type="hidden" name="editScope" value="this" />}

      {/* Client */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900">Client</h2>
        <div>
          <label className={labelCls}>Client *</label>
          <select
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            disabled={isEdit}
            className={inputCls}
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {selectedClient && !selectedClient.defaultAddress && (
            <p className="text-amber-600 text-xs mt-1">⚠ This client has no default address — please enter a service address.</p>
          )}
        </div>
      </div>

      {/* Service Address */}
      {canEditAddress && (
        <div className={sectionCls}>
          <h2 className="text-sm font-semibold text-gray-900">Service Address</h2>
          {prevAddresses.length > 0 && !useCustomAddress && (
            <div>
              <label className={labelCls}>Previous Addresses</label>
              <div className="space-y-1">
                {prevAddresses.map((a, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setServiceAddress(a.serviceAddress)
                      setServiceCity(a.serviceCity)
                      setServiceZip(a.serviceZip)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      serviceAddress === a.serviceAddress
                        ? 'border-brand-navy bg-blue-50 text-brand-navy'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {a.serviceAddress}, {a.serviceCity} {a.serviceZip}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setUseCustomAddress(true); setServiceAddress(''); setServiceCity(''); setServiceZip('') }}
                  className="text-xs text-brand-navy hover:underline"
                >
                  Use different address
                </button>
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>Address *</label>
            <input value={serviceAddress} onChange={(e) => setServiceAddress(e.target.value)} name="serviceAddress" required className={inputCls} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>City *</label>
              <input value={serviceCity} onChange={(e) => setServiceCity(e.target.value)} name="serviceCity" required className={inputCls} placeholder="El Paso" />
            </div>
            <div>
              <label className={labelCls}>Zip *</label>
              <input value={serviceZip} onChange={(e) => setServiceZip(e.target.value)} name="serviceZip" required maxLength={5} className={inputCls} placeholder="79938" />
            </div>
          </div>
        </div>
      )}

      {/* Scheduling */}
      {canEditSchedule && (
        <div className={sectionCls}>
          <h2 className="text-sm font-semibold text-gray-900">Scheduling</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date & Time *</label>
              <input
                name="scheduledAt"
                type="datetime-local"
                defaultValue={defaultDatetime}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Estimated Hours</label>
              <input
                name="estimatedHours"
                type="number"
                step="0.5"
                min="0.5"
                defaultValue={job?.estimatedHours ?? ''}
                className={inputCls}
                placeholder="2.0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Job Details */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900">Job Details</h2>
        <div>
          <label className={labelCls}>Job Type *</label>
          <ToggleGroup
            name="jobType"
            value={jobType}
            onChange={setJobType}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'deep', label: 'Deep Clean' },
              { value: 'move-out', label: 'Move-Out' },
            ]}
          />
        </div>
        {!isEdit && (
          <div>
            <label className={labelCls}>Recurring</label>
            <ToggleGroup
              name="recurringRule"
              value={recurringRule}
              onChange={setRecurringRule}
              options={[
                { value: 'none', label: 'None' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Biweekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
            {recurringRule !== 'none' && (
              <p className="text-xs text-gray-500 mt-1">All instances will be generated up to 6 months out, each with its own invoice.</p>
            )}
          </div>
        )}
        <div>
          <label className={labelCls}>Notes</label>
          <textarea name="notes" defaultValue={job?.notes ?? ''} rows={3} className={inputCls} placeholder="Any notes for this job…" />
        </div>
      </div>

      {/* Financial */}
      {(canEditValue || canEditPayment) && (
        <div className={sectionCls}>
          <h2 className="text-sm font-semibold text-gray-900">Financial</h2>
          {canEditValue && (
            <div>
              <label className={labelCls}>Estimated Value * (used for invoice)</label>
              <input
                name="estimatedValue"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={job?.estimatedValue ?? selectedClient?.standardRate ?? ''}
                required={!isEdit}
                className={inputCls}
                placeholder="120.00"
              />
            </div>
          )}
          {canEditPayment && (
            <div>
              <label className={labelCls}>Payment Method</label>
              <ToggleGroup
                name="paymentMethod"
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  { value: 'zelle', label: 'Zelle' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'check', label: 'Check' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="px-6 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-navy-dark disabled:opacity-50">
          {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Job'}
        </button>
      </div>
    </form>
  )
}
