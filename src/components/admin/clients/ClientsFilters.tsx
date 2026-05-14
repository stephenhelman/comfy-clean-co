'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

export default function ClientsFilters() {
  const router = useRouter()
  const sp = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/clients?${params.toString()}`)
  }

  const status = sp.get('status') ?? 'active'
  const type = sp.get('type') ?? ''
  const frequency = sp.get('frequency') ?? ''
  const day = sp.get('day') ?? ''
  const zip = sp.get('zip') ?? ''

  const selectCls = 'border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy'

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select value={status} onChange={(e) => update('status', e.target.value)} className={selectCls}>
        <option value="active">Active</option>
        <option value="dormant">Dormant</option>
        <option value="inactive">Inactive</option>
        <option value="">All</option>
      </select>

      <select value={type} onChange={(e) => update('type', e.target.value)} className={selectCls}>
        <option value="">All Types</option>
        <option value="residential">Residential</option>
        <option value="commercial">Commercial</option>
      </select>

      <select value={frequency} onChange={(e) => update('frequency', e.target.value)} className={selectCls}>
        <option value="">All Frequencies</option>
        <option value="one-time">One-Time</option>
        <option value="weekly">Weekly</option>
        <option value="biweekly">Biweekly</option>
        <option value="monthly">Monthly</option>
      </select>

      <select value={day} onChange={(e) => update('day', e.target.value)} className={selectCls}>
        <option value="">Any Day</option>
        {DAYS.map((d) => (
          <option key={d} value={d}>{DAY_LABELS[d]}</option>
        ))}
      </select>

      <input
        type="text"
        value={zip}
        onChange={(e) => update('zip', e.target.value)}
        placeholder="Zip code…"
        className={`${selectCls} w-28`}
        maxLength={5}
      />
    </div>
  )
}
