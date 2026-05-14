'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { MapPin, Pencil, RefreshCw } from 'lucide-react'
import {
  confirmZellePayment,
  confirmCashAppointment,
  assignCleaner,
  removeCleaner,
  cancelJob,
  bumpJob,
  markLockOut,
  resendInvoice,
} from '@/app/(admin)/jobs/actions'
import type { CalendarJob } from './CalendarView'

const CLEANER_COLORS = [
  '#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4',
  '#F97316','#84CC16','#EC4899','#14B8A6','#6366F1','#A78BFA',
]

const JOB_STATUS_LABELS: Record<string, string> = {
  stand_by: 'Stand-By', scheduled: 'Scheduled', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled', bump: 'Bumped', lock_out: 'Lock Out',
}
const JOB_STATUS_COLORS: Record<string, string> = {
  stand_by: 'bg-purple-100 text-purple-700', scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500', bump: 'bg-yellow-100 text-yellow-700',
  lock_out: 'bg-red-100 text-red-600',
}
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

function Pill({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${colorClass}`}>{label}</span>
}

interface Props {
  job: CalendarJob
  cleaners: { id: string; name: string; colorIndex: number; availableDays: string[] }[]
  maxJobsPerCleaner: number
  onClose: () => void
  onJobUpdate?: (job: CalendarJob) => void
}

export default function JobSlideOut({ job, cleaners, maxJobsPerCleaner, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Payment modals
  const [showZelleConfirm, setShowZelleConfirm] = useState(false)
  const [zelleAmount, setZelleAmount] = useState(String(job.invoice?.amount ?? ''))

  // Cancel modal
  const [showCancel, setShowCancel] = useState(false)
  const [cancelType, setCancelType] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFee, setCancelFee] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [cancelScope, setCancelScope] = useState<'this' | 'future'>('this')

  // Bump modal
  const [showBump, setShowBump] = useState(false)
  const [bumpDate, setBumpDate] = useState('')

  // Lock out modal
  const [showLockOut, setShowLockOut] = useState(false)
  const [lockOutNotes, setLockOutNotes] = useState('')

  // Assign cleaner
  const [showAssign, setShowAssign] = useState(false)
  const [selectedCleanerId, setSelectedCleanerId] = useState('')

  const assignedCleanerIds = new Set(job.assignments.map((a) => a.cleanerId))
  const availableCleaners = cleaners.filter((c) => !assignedCleanerIds.has(c.id))

  const totalLaborCost = job.assignments.reduce((s, a) => s + (a.laborCost ?? 0), 0)
  const revenue = job.actualRevenue ?? job.estimatedValue ?? 0
  const margin = revenue - totalLaborCost
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0

  function run(fn: () => Promise<void>) {
    setError('')
    startTransition(async () => {
      try { await fn() }
      catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
    })
  }

  const dt = parseISO(job.scheduledAt)
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.serviceAddress}, ${job.serviceCity}, TX ${job.serviceZip}`)}`

  const isPaid = job.invoice?.status === 'paid'
  const isUnpaid = !isPaid

  return (
    <div className="p-4 space-y-5 text-sm">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <Link href={`/clients/${job.clientId}`} className="text-lg font-bold text-gray-900 hover:text-brand-navy leading-tight">
            {job.clientName}
          </Link>
          <Link
            href={`/jobs/${job.id}/edit`}
            className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 shrink-0"
          >
            <Pencil className="w-3 h-3" /> Edit
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill label={JOB_STATUS_LABELS[job.status] ?? job.status} colorClass={JOB_STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-500'} />
          {job.invoice && (
            <Pill
              label={INVOICE_STATUS_LABELS[job.invoice.status] ?? job.invoice.status}
              colorClass={INVOICE_STATUS_COLORS[job.invoice.status] ?? 'bg-gray-100 text-gray-500'}
            />
          )}
          {job.recurringRule && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <RefreshCw className="w-3 h-3" /> {job.recurringRule}
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {/* Appointment Details */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Appointment</h3>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-brand-navy hover:underline">
              {job.serviceAddress}, {job.serviceCity}
            </a>
          </div>
        </div>
        <p><span className="text-gray-500">Date:</span> <span className="font-medium">{format(dt, 'EEEE, MMMM d, yyyy')}</span></p>
        <p><span className="text-gray-500">Time:</span> <span className="font-medium">{format(dt, 'h:mm a')}</span></p>
        {job.estimatedHours && <p><span className="text-gray-500">Est. Hours:</span> {job.estimatedHours}h</p>}
        <p><span className="text-gray-500">Type:</span> {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</p>
        {job.notes && <p className="text-gray-600 italic">"{job.notes}"</p>}
      </div>

      {/* Invoice Summary */}
      {job.invoice && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</h3>
          <p><span className="text-gray-500">Number:</span> <span className="font-medium">{job.invoice.invoiceNumber}</span></p>
          <p><span className="text-gray-500">Amount:</span> <span className="font-medium">${job.invoice.amount.toFixed(2)}</span></p>
          <p><span className="text-gray-500">Method:</span> <span className="capitalize">{job.invoice.paymentType}</span></p>
          {job.invoice.sentAt && <p className="text-xs text-gray-400">Sent: {format(parseISO(job.invoice.sentAt), 'MMM d, h:mm a')}</p>}
          {job.invoice.paymentLinkClickedAt && (
            <p className="text-xs text-orange-600">Link clicked: {format(parseISO(job.invoice.paymentLinkClickedAt), 'MMM d, h:mm a')}</p>
          )}
          {job.invoice.paidAt && <p className="text-xs text-green-600">Paid: {format(parseISO(job.invoice.paidAt), 'MMM d, h:mm a')}</p>}

          {/* Invoice Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {job.invoice.status === 'sent' && job.invoice.paymentType !== 'zelle' && (
              <button
                onClick={() => run(() => confirmCashAppointment(job.id))}
                disabled={isPending}
                className="px-3 py-1.5 bg-brand-navy text-white rounded-lg text-xs font-medium hover:bg-brand-navy-dark disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Confirm Appointment'}
              </button>
            )}
            {(job.invoice.status === 'sent' || job.invoice.status === 'pending') && job.invoice.paymentType === 'zelle' && (
              <button
                onClick={() => setShowZelleConfirm(true)}
                className="px-3 py-1.5 bg-brand-navy text-white rounded-lg text-xs font-medium hover:bg-brand-navy-dark"
              >
                {job.invoice.status === 'pending' ? 'Confirm Payment' : 'Confirm Zelle Payment'}
              </button>
            )}
            {job.invoice.status === 'sent' && (
              <button
                onClick={() => run(() => resendInvoice(job.id))}
                disabled={isPending}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50"
              >
                Resend Invoice
              </button>
            )}
            {job.invoice.pdfUrl && (
              <a href={job.invoice.pdfUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50">
                View PDF
              </a>
            )}
          </div>
        </div>
      )}

      {/* Cleaner Assignments — only after scheduled */}
      {(job.status === 'scheduled' || job.status === 'in_progress' || job.status === 'completed' || job.status === 'lock_out') && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cleaners</h3>
          {job.assignments.length === 0 && (
            <p className="text-gray-400 text-xs">No cleaners assigned yet.</p>
          )}
          {job.assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: CLEANER_COLORS[a.cleanerColorIndex % CLEANER_COLORS.length] }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                >
                  {a.cleanerName.charAt(0)}
                </span>
                <div>
                  <Link href={`/cleaners/${a.cleanerId}`} className="text-sm font-medium text-gray-900 hover:text-brand-navy">
                    {a.cleanerName}
                  </Link>
                  {a.clockedInAt && !a.clockedOutAt && (
                    <p className="text-xs text-amber-600">Clocked in {format(parseISO(a.clockedInAt), 'h:mm a')}</p>
                  )}
                  {a.clockedOutAt && (
                    <p className="text-xs text-green-600">
                      {a.durationMins ? `${Math.floor(a.durationMins / 60)}h ${a.durationMins % 60}m` : ''}
                      {a.laborCost != null ? ` · $${a.laborCost.toFixed(2)}` : ''}
                    </p>
                  )}
                  {!a.clockedInAt && <p className="text-xs text-gray-400">Not started</p>}
                  {a.gpsBlocked && <p className="text-xs text-red-500">Location unavailable</p>}
                  {a.gpsLat && a.gpsLng && !a.gpsBlocked && (
                    <a
                      href={`https://www.google.com/maps?q=${a.gpsLat},${a.gpsLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-navy hover:underline"
                    >
                      View clock-in location
                    </a>
                  )}
                </div>
              </div>
              {!a.clockedInAt && job.status === 'scheduled' && (
                <button
                  onClick={() => run(() => removeCleaner(a.id, job.id))}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {job.status === 'scheduled' && !showAssign && (
            <button
              onClick={() => setShowAssign(true)}
              className="text-xs text-brand-navy hover:underline"
            >
              + Assign Cleaner
            </button>
          )}

          {showAssign && (
            <div className="flex gap-2 items-center">
              <select
                value={selectedCleanerId}
                onChange={(e) => setSelectedCleanerId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="">Select cleaner…</option>
                {availableCleaners.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!selectedCleanerId) return
                  run(async () => {
                    await assignCleaner(job.id, selectedCleanerId)
                    setShowAssign(false)
                    setSelectedCleanerId('')
                  })
                }}
                disabled={isPending || !selectedCleanerId}
                className="px-2.5 py-1.5 bg-brand-navy text-white rounded-lg text-xs disabled:opacity-50"
              >
                Assign
              </button>
              <button onClick={() => setShowAssign(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Cost Breakdown — after all clocked out */}
      {job.assignments.some((a) => a.clockedOutAt) && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          {/* ROLE CHECK STUB — jobs.view_financial — Owner, Bookkeeper only — Phase 12
              Hide this entire section for Manager, Dispatcher, Viewer roles
              TODO Phase 12: enforce via usePermission('jobs.view_financial') hook */}
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost Breakdown</h3>
          {job.assignments.map((a) => (
            <div key={a.id} className="flex justify-between text-xs">
              <span className="text-gray-600">
                {a.cleanerName}
                {a.durationMins ? ` — ${Math.floor(a.durationMins / 60)}h ${a.durationMins % 60}m @ $${(a.hourlyRateSnapshot ?? 0).toFixed(2)}/hr` : ''}
              </span>
              <span className="font-medium">
                {a.laborCost != null ? `$${a.laborCost.toFixed(2)}` : 'No time data recorded'}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total labor</span>
              <span>${totalLaborCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Job revenue</span>
              <span>${revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Gross margin</span>
              <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                ${margin.toFixed(2)} ({marginPct.toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Status Actions */}
      {['stand_by', 'scheduled'].includes(job.status) && (
        <div className="space-y-2 border-t border-gray-200 pt-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</h3>
          {job.status === 'in_progress' && (
            <p className="text-xs text-amber-600">Clock out all cleaners before cancelling.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowCancel(true)}
              className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs hover:bg-red-50"
            >
              Cancel Job
            </button>
            <button
              onClick={() => setShowBump(true)}
              className="px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg text-xs hover:bg-amber-50"
            >
              Bump
            </button>
            {job.status === 'scheduled' && (
              <button
                onClick={() => setShowLockOut(true)}
                className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs hover:bg-red-50"
              >
                Mark Lock Out
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Zelle payment confirm */}
      {showZelleConfirm && (
        <Modal title="Confirm Zelle Payment" onClose={() => setShowZelleConfirm(false)}>
          <p className="text-sm text-gray-600 mb-3">
            Confirm payment of <strong>${job.invoice?.amount.toFixed(2)}</strong> from <strong>{job.clientName}</strong> via Zelle?
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Actual Amount Received</label>
            <input
              type="number"
              step="0.01"
              value={zelleAmount}
              onChange={(e) => setZelleAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowZelleConfirm(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
            <button
              onClick={() => run(async () => { await confirmZellePayment(job.id, parseFloat(zelleAmount)); setShowZelleConfirm(false) })}
              disabled={isPending}
              className="px-4 py-1.5 bg-brand-navy text-white rounded-lg text-sm disabled:opacity-50"
            >
              {isPending ? 'Confirming…' : 'Confirm Payment'}
            </button>
          </div>
        </Modal>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <Modal title="Cancel Job" onClose={() => setShowCancel(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cancellation Type *</label>
              <select value={cancelType} onChange={(e) => setCancelType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select…</option>
                {isUnpaid ? (
                  <>
                    <option value="no_fee">No Fee — void invoice</option>
                    <option value="with_fee">Cancellation Fee — retain amount</option>
                  </>
                ) : (
                  <>
                    <option value="full_refund">Full Refund</option>
                    <option value="partial_refund">Partial Refund</option>
                    <option value="no_refund">No Refund — retain full payment</option>
                  </>
                )}
              </select>
            </div>
            {cancelType === 'with_fee' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fee to Retain ($)</label>
                <input type="number" step="0.01" value={cancelFee} onChange={(e) => setCancelFee(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
            {cancelType === 'partial_refund' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Refund Amount ($)</label>
                <input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cancel Reason *</label>
              <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            {job.recurringGroupId && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Scope</label>
                <div className="flex gap-2">
                  {(['this', 'future'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setCancelScope(s)}
                      className={`px-3 py-1 rounded-lg text-xs border ${cancelScope === s ? 'bg-brand-navy text-white border-brand-navy' : 'border-gray-300 text-gray-700'}`}>
                      {s === 'this' ? 'This job only' : 'This + future jobs'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowCancel(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button
                onClick={() => run(async () => {
                  if (!cancelType || !cancelReason) throw new Error('Select a type and enter a reason')
                  await cancelJob(job.id, cancelReason, cancelType, cancelFee ? parseFloat(cancelFee) : null, refundAmount ? parseFloat(refundAmount) : null, cancelScope)
                  setShowCancel(false)
                })}
                disabled={isPending}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {isPending ? 'Cancelling…' : 'Cancel Job'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bump modal */}
      {showBump && (
        <Modal title="Bump Job" onClose={() => setShowBump(false)}>
          <p className="text-sm text-gray-600 mb-3">
            The current job will be marked as bumped and its invoice voided. A new job will be created with a new date.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">New Date & Time *</label>
            <input type="datetime-local" value={bumpDate} onChange={(e) => setBumpDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowBump(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
            <button
              onClick={() => run(async () => { if (!bumpDate) throw new Error('Select a date'); await bumpJob(job.id, bumpDate) })}
              disabled={isPending}
              className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {isPending ? 'Bumping…' : 'Bump Job'}
            </button>
          </div>
        </Modal>
      )}

      {/* Lock Out modal */}
      {showLockOut && (
        <Modal title="Mark Lock Out" onClose={() => setShowLockOut(false)}>
          <p className="text-sm text-gray-600 mb-3">
            The cleaner arrived but could not access the property. Payment is retained.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={lockOutNotes} onChange={(e) => setLockOutNotes(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowLockOut(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
            <button
              onClick={() => run(async () => { await markLockOut(job.id, lockOutNotes) })}
              disabled={isPending}
              className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Mark Lock Out'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
