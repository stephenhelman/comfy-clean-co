'use client'

import { useState, useCallback, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Map, List, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import JobSlideOut from '@/components/admin/calendar/JobSlideOut'
import type { CalendarJob } from '@/components/admin/calendar/CalendarView'
import { JOB_STATUS_LABELS, JOB_STATUS_TAILWIND } from '@/lib/statusColors'

const JobsMap = dynamic(() => import('./JobsMap'), { ssr: false })

const JOB_STATUS_COLORS = JOB_STATUS_TAILWIND
const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', pending: 'Pending Confirmation', paid: 'Paid',
  overdue: 'Overdue', voided: 'Voided', refunded: 'Refunded', partially_refunded: 'Partial Refund',
}
const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500', sent: 'bg-amber-100 text-amber-700',
  pending: 'bg-orange-100 text-orange-700', paid: 'bg-teal-100 text-teal-700',
  overdue: 'bg-red-100 text-red-600', voided: 'bg-gray-100 text-gray-400',
  refunded: 'bg-purple-100 text-purple-700', partially_refunded: 'bg-purple-100 text-purple-700',
}
const JOB_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard Clean', deep: 'Deep Clean', 'move-out': 'Move-Out Clean',
}
const JOB_TYPE_COLORS: Record<string, string> = {
  standard: 'bg-sky-100 text-sky-700', deep: 'bg-indigo-100 text-indigo-700', 'move-out': 'bg-rose-100 text-rose-700',
}
const CLEANER_COLORS = [
  '#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4',
  '#F97316','#84CC16','#EC4899','#14B8A6','#6366F1','#A78BFA',
]

const STATUS_OPTIONS = ['stand_by','scheduled','in_progress','completed','cancelled','bump','lock_out']
const INVOICE_STATUS_OPTIONS = ['draft','sent','pending','paid','overdue','voided','refunded','partially_refunded']
const JOB_TYPE_OPTIONS = ['standard','deep','move-out']

const QUICK_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'outstanding', label: 'Outstanding' },
]

interface Props {
  jobs: CalendarJob[]
  total: number
  page: number
  pageSize: number
  cleaners: { id: string; name: string; colorIndex: number; availableDays: string[] }[]
  clients: { id: string; name: string }[]
  tab: 'list' | 'map'
  focusJobId: string | null
  currentParams: Record<string, string | undefined>
}

export default function JobsListClient({
  jobs, total, page, pageSize, cleaners, clients, tab, focusJobId, currentParams,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedJob, setSelectedJob] = useState<CalendarJob | null>(
    () => focusJobId ? (jobs.find(j => j.id === focusJobId) ?? null) : null
  )
  const [showFilters, setShowFilters] = useState(false)

  // Local filter state (mirrors URL)
  const [fromVal, setFromVal] = useState(currentParams.from ?? '')
  const [toVal, setToVal] = useState(currentParams.to ?? '')
  const [statusSel, setStatusSel] = useState<string[]>(
    currentParams.status ? currentParams.status.split(',') : []
  )
  const [invoiceStatusSel, setInvoiceStatusSel] = useState<string[]>(
    currentParams.invoiceStatus ? currentParams.invoiceStatus.split(',') : []
  )
  const [jobTypeSel, setJobTypeSel] = useState<string[]>(
    currentParams.jobType ? currentParams.jobType.split(',') : []
  )
  const [cleanerIdVal, setCleanerIdVal] = useState(currentParams.cleanerId ?? '')
  const [clientIdVal, setClientIdVal] = useState(currentParams.clientId ?? '')
  const [zipVal, setZipVal] = useState(currentParams.zip ?? '')
  const [unassignedVal, setUnassignedVal] = useState(currentParams.unassigned === '1')

  const activeQuickFilter = currentParams.quickFilter ?? ''
  const totalPages = Math.ceil(total / pageSize)

  function buildParams(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const base: Record<string, string | undefined> = {
      tab: currentParams.tab,
      from: currentParams.from,
      to: currentParams.to,
      status: currentParams.status,
      invoiceStatus: currentParams.invoiceStatus,
      jobType: currentParams.jobType,
      cleanerId: currentParams.cleanerId,
      clientId: currentParams.clientId,
      zip: currentParams.zip,
      unassigned: currentParams.unassigned,
      sort: currentParams.sort,
      quickFilter: currentParams.quickFilter,
      ...overrides,
    }
    for (const [k, v] of Object.entries(base)) {
      if (v) p.set(k, v)
    }
    return p.toString()
  }

  function navigate(overrides: Record<string, string | undefined>) {
    startTransition(() => router.push(`/jobs?${buildParams(overrides)}`))
  }

  function applyFilters() {
    const overrides: Record<string, string | undefined> = {
      from: fromVal || undefined,
      to: toVal || undefined,
      status: statusSel.length ? statusSel.join(',') : undefined,
      invoiceStatus: invoiceStatusSel.length ? invoiceStatusSel.join(',') : undefined,
      jobType: jobTypeSel.length ? jobTypeSel.join(',') : undefined,
      cleanerId: cleanerIdVal || undefined,
      clientId: clientIdVal || undefined,
      zip: zipVal || undefined,
      unassigned: unassignedVal ? '1' : undefined,
      quickFilter: undefined,
      page: undefined,
    }
    navigate(overrides)
    setShowFilters(false)
  }

  function clearFilters() {
    setFromVal('')
    setToVal('')
    setStatusSel([])
    setInvoiceStatusSel([])
    setJobTypeSel([])
    setCleanerIdVal('')
    setClientIdVal('')
    setZipVal('')
    setUnassignedVal(false)
    startTransition(() => router.push('/jobs'))
    setShowFilters(false)
  }

  function toggleMulti(arr: string[], set: (v: string[]) => void, val: string) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const hasActiveFilters = !!(
    currentParams.from || currentParams.to || currentParams.status ||
    currentParams.invoiceStatus || currentParams.jobType || currentParams.cleanerId ||
    currentParams.clientId || currentParams.zip || currentParams.unassigned ||
    currentParams.quickFilter
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Jobs</h1>
          <span className="text-sm text-gray-500">({total.toLocaleString()})</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switch */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => navigate({ tab: 'list', page: undefined })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${tab === 'list' ? 'bg-brand-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4 shrink-0" /> List
            </button>
            <button
              onClick={() => navigate({ tab: 'map', page: undefined })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${tab === 'map' ? 'bg-brand-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Map className="w-4 h-4 shrink-0" /> Map
            </button>
          </div>
          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${hasActiveFilters ? 'border-brand-navy bg-brand-navy/10 text-brand-navy' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-navy" />}
          </button>
        </div>
      </div>

      {/* Quick filters */}
      <div className="px-6 py-2.5 border-b border-gray-100 flex items-center gap-2 shrink-0 overflow-x-auto">
        {QUICK_FILTERS.map(qf => (
          <button
            key={qf.key}
            onClick={() => navigate({ quickFilter: activeQuickFilter === qf.key ? undefined : qf.key, page: undefined, from: undefined, to: undefined, status: undefined, invoiceStatus: undefined, unassigned: undefined })}
            className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${activeQuickFilter === qf.key ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {qf.label}
          </button>
        ))}
        {hasActiveFilters && (
          <button onClick={clearFilters} className="px-3 py-1 text-xs rounded-full font-medium bg-red-50 text-red-600 hover:bg-red-100 whitespace-nowrap ml-auto shrink-0">
            Clear All
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date range */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={fromVal} onChange={e => setFromVal(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={toVal} onChange={e => setToVal(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
            </div>
            {/* Cleaner */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cleaner</label>
              <select value={cleanerIdVal} onChange={e => setCleanerIdVal(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
                <option value="">All Cleaners</option>
                {cleaners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {/* Client */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client</label>
              <select value={clientIdVal} onChange={e => setClientIdVal(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
                <option value="">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {/* Zip */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">ZIP Code</label>
              <input type="text" value={zipVal} onChange={e => setZipVal(e.target.value)} placeholder="e.g. 79938"
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
            </div>
            {/* Unassigned */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={unassignedVal} onChange={e => setUnassignedVal(e.target.checked)}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Unassigned only</span>
              </label>
            </div>
          </div>

          {/* Status multi-select */}
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1.5">Job Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => toggleMulti(statusSel, setStatusSel, s)}
                  className={`px-2.5 py-0.5 text-xs rounded-full font-medium transition-colors ${statusSel.includes(s) ? 'bg-brand-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                  {JOB_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Invoice status multi-select */}
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1.5">Invoice Status</label>
            <div className="flex flex-wrap gap-1.5">
              {INVOICE_STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => toggleMulti(invoiceStatusSel, setInvoiceStatusSel, s)}
                  className={`px-2.5 py-0.5 text-xs rounded-full font-medium transition-colors ${invoiceStatusSel.includes(s) ? 'bg-brand-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                  {INVOICE_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Job type multi-select */}
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1.5">Job Type</label>
            <div className="flex flex-wrap gap-1.5">
              {JOB_TYPE_OPTIONS.map(t => (
                <button key={t} onClick={() => toggleMulti(jobTypeSel, setJobTypeSel, t)}
                  className={`px-2.5 py-0.5 text-xs rounded-full font-medium transition-colors ${jobTypeSel.includes(t) ? 'bg-brand-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                  {JOB_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={() => setShowFilters(false)} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button onClick={applyFilters} disabled={isPending}
              className="px-4 py-1.5 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {tab === 'list' ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Table */}
            <div className="flex-1 overflow-auto">
              {jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                  <p className="text-lg font-medium">No jobs found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">
                        <button onClick={() => navigate({ sort: 'scheduledAt', page: undefined })} className="hover:text-gray-900">Date / Time</button>
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">
                        <button onClick={() => navigate({ sort: 'clientName', page: undefined })} className="hover:text-gray-900">Client</button>
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden md:table-cell">Address</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Type</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Status</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Invoice</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Cleaners</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">
                        <button onClick={() => navigate({ sort: 'estimatedValue', page: undefined })} className="hover:text-gray-900">Est. Value</button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map(job => {
                      const dt = parseISO(job.scheduledAt)
                      const isSelected = selectedJob?.id === job.id
                      const isUnassigned = job.assignments.length === 0 && !['cancelled','bump','lock_out'].includes(job.status)
                      return (
                        <tr
                          key={job.id}
                          onClick={() => setSelectedJob(isSelected ? null : job)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-brand-navy/5' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{format(dt, 'MMM d, yyyy')}</div>
                            <div className="text-xs text-gray-500">{format(dt, 'h:mm a')}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{job.clientName}</div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                            <div>{job.serviceAddress}</div>
                            <div className="text-xs text-gray-400">{job.serviceCity}, TX {job.serviceZip}</div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_TYPE_COLORS[job.jobType] ?? 'bg-gray-100 text-gray-600'}`}>
                              {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${JOB_STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {JOB_STATUS_LABELS[job.status] ?? job.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {job.invoice ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${INVOICE_STATUS_COLORS[job.invoice.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                {INVOICE_STATUS_LABELS[job.invoice.status] ?? job.invoice.status}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {isUnassigned && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Unassigned</span>
                              )}
                              {job.assignments.map(a => (
                                <span
                                  key={a.id}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                  style={{ backgroundColor: CLEANER_COLORS[a.cleanerColorIndex % CLEANER_COLORS.length] }}
                                  title={a.cleanerName}
                                >
                                  {a.cleanerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {job.estimatedValue != null ? (
                              <span className="font-medium text-gray-900">${job.estimatedValue.toFixed(0)}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
                <p className="text-sm text-gray-500">
                  Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1 || isPending}
                    onClick={() => navigate({ page: String(page - 1) })}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages || isPending}
                    onClick={() => navigate({ page: String(page + 1) })}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <JobsMap jobs={jobs} cleaners={cleaners} onJobSelect={setSelectedJob} selectedJobId={selectedJob?.id ?? null} />
        )}

        {/* Slide-out panel */}
        {selectedJob && (
          <>
            {/* Mobile overlay */}
            <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSelectedJob(null)} />
            <div className="fixed inset-y-0 right-0 w-full max-w-lg z-50 lg:static lg:inset-auto lg:z-auto lg:w-[42%] lg:border-l lg:border-gray-200 overflow-y-auto bg-white shrink-0">
              <JobSlideOut
                job={selectedJob}
                cleaners={cleaners}
                maxJobsPerCleaner={3}
                onClose={() => setSelectedJob(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
