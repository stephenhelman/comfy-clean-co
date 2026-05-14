'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import {
  markInvoicePaid,
  voidInvoice,
  writeOffInvoice,
  markInvoiceOverdue,
  sendReceiptEmail,
  bulkMarkOverdue,
} from '@/app/(admin)/invoices/actions'

export interface InvoiceRow {
  id: string
  invoiceNumber: string
  jobId: string
  clientId: string
  clientName: string
  jobDate: string
  jobType: string
  amount: number
  amountPaid: number | null
  paymentType: string
  status: string
  sentAt: string | null
  paidAt: string | null
  voidedAt: string | null
  overdueMarkedAt: string | null
  writtenOffAt: string | null
  writtenOffBy: string | null
  writtenOffReason: string | null
  manuallyConfirmedBy: string | null
  pdfUrl: string | null
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', pending: 'Pending Confirmation', paid: 'Paid',
  overdue: 'Overdue', voided: 'Voided', written_off: 'Written Off', refunded: 'Refunded',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500', sent: 'bg-amber-100 text-amber-700',
  pending: 'bg-orange-100 text-orange-700', paid: 'bg-teal-100 text-teal-700',
  overdue: 'bg-red-100 text-red-600', voided: 'bg-gray-100 text-gray-400',
  written_off: 'bg-gray-100 text-gray-400', refunded: 'bg-purple-100 text-purple-700',
}
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', zelle: 'Zelle', 'cash-app': 'Cash App', check: 'Check', other: 'Other',
}
const JOB_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard', deep: 'Deep Clean', 'move-out': 'Move-Out',
}

const QUICK_FILTERS = [
  { key: '', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'voided', label: 'Voided / Written Off' },
]

interface Props {
  invoices: InvoiceRow[]
  total: number
  page: number
  pageSize: number
  clients: { id: string; name: string }[]
  currentParams: Record<string, string | undefined>
  overdueCount: number
}

function MarkPaidModal({ invoice, onClose }: { invoice: InvoiceRow; onClose: () => void }) {
  const [amount, setAmount] = useState(String(invoice.amount))
  const [method, setMethod] = useState(invoice.paymentType)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handle() {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Valid amount required'); return }
    if (!method) { setError('Payment method required'); return }
    setError('')
    startTransition(async () => {
      try { await markInvoicePaid(invoice.id, amt, method); onClose() }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Mark as Paid</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount Paid</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button onClick={handle} disabled={isPending}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
            {isPending ? 'Saving…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReasonModal({
  title, confirmLabel, confirmClass, onConfirm, onClose,
}: {
  title: string
  confirmLabel: string
  confirmClass: string
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handle() {
    if (!reason.trim()) { setError('Reason is required'); return }
    setError('')
    startTransition(async () => {
      try { await onConfirm(reason); onClose() }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Enter reason…" rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button onClick={handle} disabled={isPending}
            className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${confirmClass}`}>
            {isPending ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function InvoiceActions({ invoice }: { invoice: InvoiceRow }) {
  const [showPaid, setShowPaid] = useState(false)
  const [showVoid, setShowVoid] = useState(false)
  const [showWriteOff, setShowWriteOff] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')

  const canMarkPaid = ['sent', 'pending', 'overdue'].includes(invoice.status)
  const canVoid = !['paid', 'voided', 'written_off'].includes(invoice.status)
  const canWriteOff = ['sent', 'pending', 'overdue'].includes(invoice.status)
  const canMarkOverdue = ['sent', 'pending'].includes(invoice.status)
  const canSendReceipt = invoice.status === 'paid'

  function run(fn: () => Promise<void>) {
    setMsg('')
    startTransition(async () => {
      try { await fn(); setMsg('Done') }
      catch (e) { setMsg(e instanceof Error ? e.message : 'Error') }
    })
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {canMarkPaid && (
        <button onClick={() => setShowPaid(true)}
          className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700">
          Mark Paid
        </button>
      )}
      {canMarkOverdue && (
        <button onClick={() => run(() => markInvoiceOverdue(invoice.id))} disabled={isPending}
          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50">
          Mark Overdue
        </button>
      )}
      {canSendReceipt && (
        <button onClick={() => run(() => sendReceiptEmail(invoice.id))} disabled={isPending}
          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50">
          Send Receipt
        </button>
      )}
      {canVoid && (
        <button onClick={() => setShowVoid(true)}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
          Void
        </button>
      )}
      {canWriteOff && (
        <button onClick={() => setShowWriteOff(true)}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
          Write Off
        </button>
      )}
      {invoice.pdfUrl && (
        <a href={invoice.pdfUrl} target="_blank" rel="noreferrer"
          className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
          PDF <ExternalLink className="w-3 h-3" />
        </a>
      )}
      {msg && <span className="text-xs text-gray-500 ml-1">{msg}</span>}

      {showPaid && <MarkPaidModal invoice={invoice} onClose={() => setShowPaid(false)} />}
      {showVoid && (
        <ReasonModal title="Void Invoice" confirmLabel="Void Invoice" confirmClass="bg-gray-700 hover:bg-gray-800"
          onConfirm={(r) => voidInvoice(invoice.id, r)} onClose={() => setShowVoid(false)} />
      )}
      {showWriteOff && (
        <ReasonModal title="Write Off Invoice" confirmLabel="Write Off" confirmClass="bg-gray-700 hover:bg-gray-800"
          onConfirm={(r) => writeOffInvoice(invoice.id, r)} onClose={() => setShowWriteOff(false)} />
      )}
    </div>
  )
}

export default function InvoicesTable({
  invoices, total, page, pageSize, clients, currentParams, overdueCount,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Local filter state
  const [fromVal, setFromVal] = useState(currentParams.from ?? '')
  const [toVal, setToVal] = useState(currentParams.to ?? '')
  const [clientIdVal, setClientIdVal] = useState(currentParams.clientId ?? '')
  const [paymentTypeVal, setPaymentTypeVal] = useState(currentParams.paymentType ?? '')
  const [bulkMsg, setBulkMsg] = useState('')

  const totalPages = Math.ceil(total / pageSize)
  const activeQuick = currentParams.quickFilter ?? ''

  // Summary totals from current page
  const paidTotal = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amountPaid ?? i.amount), 0)
  const outstandingTotal = invoices.filter(i => ['sent', 'pending', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0)

  function buildParams(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const base: Record<string, string | undefined> = {
      quickFilter: currentParams.quickFilter,
      from: currentParams.from,
      to: currentParams.to,
      clientId: currentParams.clientId,
      paymentType: currentParams.paymentType,
      page: currentParams.page,
      ...overrides,
    }
    for (const [k, v] of Object.entries(base)) {
      if (v) p.set(k, v)
    }
    return p.toString()
  }

  function navigate(overrides: Record<string, string | undefined>) {
    startTransition(() => router.push(`/invoices?${buildParams(overrides)}`))
  }

  function applyFilters() {
    navigate({
      from: fromVal || undefined,
      to: toVal || undefined,
      clientId: clientIdVal || undefined,
      paymentType: paymentTypeVal || undefined,
      quickFilter: undefined,
      page: undefined,
    })
  }

  function handleBulkOverdue() {
    setBulkMsg('')
    startTransition(async () => {
      try {
        const count = await bulkMarkOverdue()
        setBulkMsg(count > 0 ? `${count} invoice${count !== 1 ? 's' : ''} marked overdue` : 'No overdue invoices found')
      } catch {
        setBulkMsg('Error processing bulk action')
      }
    })
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} invoices</p>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <button onClick={handleBulkOverdue} disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              Mark {overdueCount} Overdue
            </button>
          )}
          {bulkMsg && <span className="text-xs text-gray-500">{bulkMsg}</span>}
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-6 shrink-0">
        <div>
          <p className="text-xs text-gray-500">Paid (this view)</p>
          <p className="text-sm font-semibold text-teal-700">${paidTotal.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Outstanding (this view)</p>
          <p className="text-sm font-semibold text-red-600">${outstandingTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Quick filters */}
      <div className="px-6 py-2.5 border-b border-gray-100 flex items-center gap-2 shrink-0 overflow-x-auto">
        {QUICK_FILTERS.map(qf => (
          <button key={qf.key}
            onClick={() => navigate({ quickFilter: qf.key || undefined, page: undefined, from: undefined, to: undefined, clientId: undefined })}
            className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${activeQuick === qf.key ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {qf.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap items-end gap-3 shrink-0">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={fromVal} onChange={e => setFromVal(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={toVal} onChange={e => setToVal(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Client</label>
          <select value={clientIdVal} onChange={e => setClientIdVal(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Payment Type</label>
          <select value={paymentTypeVal} onChange={e => setPaymentTypeVal(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
            <option value="">All Types</option>
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <button onClick={applyFilters} disabled={isPending}
            className="px-4 py-1.5 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50">
            Apply
          </button>
          <button onClick={() => { setFromVal(''); setToVal(''); setClientIdVal(''); setPaymentTypeVal(''); navigate({ from: undefined, to: undefined, clientId: undefined, paymentType: undefined, quickFilter: undefined, page: undefined }) }}
            className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <p className="text-lg font-medium">No invoices found</p>
            <p className="text-sm mt-1">Adjust filters or date range.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Client</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden md:table-cell">Job Date</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Type</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden md:table-cell">Payment</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Dates</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} className={inv.status === 'overdue' ? 'bg-red-50/30' : ''}>
                  <td className="px-4 py-3">
                    <a href={`/jobs/${inv.jobId}`} className="font-mono text-xs text-brand-navy hover:underline font-semibold">
                      {inv.invoiceNumber}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/clients/${inv.clientId}`} className="font-medium text-gray-900 hover:text-brand-navy">
                      {inv.clientName}
                    </a>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {format(parseISO(inv.jobDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs">
                    {JOB_TYPE_LABELS[inv.jobType] ?? inv.jobType}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-gray-900">${inv.amount.toFixed(2)}</div>
                    {inv.amountPaid != null && inv.amountPaid !== inv.amount && (
                      <div className="text-xs text-teal-600">Paid: ${inv.amountPaid.toFixed(2)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 capitalize">
                    {PAYMENT_LABELS[inv.paymentType] ?? inv.paymentType}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                    {inv.writtenOffBy && (
                      <div className="text-xs text-gray-400 mt-0.5">by {inv.writtenOffBy}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 space-y-0.5">
                    {inv.sentAt && <div>Sent {format(parseISO(inv.sentAt), 'MMM d')}</div>}
                    {inv.paidAt && <div className="text-teal-600">Paid {format(parseISO(inv.paidAt), 'MMM d')}</div>}
                    {inv.overdueMarkedAt && !inv.paidAt && (
                      <div className="text-red-600">Overdue {format(parseISO(inv.overdueMarkedAt), 'MMM d')}</div>
                    )}
                    {inv.writtenOffAt && (
                      <div>Written off {format(parseISO(inv.writtenOffAt), 'MMM d')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceActions invoice={inv} />
                  </td>
                </tr>
              ))}
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
            <button disabled={page <= 1 || isPending}
              onClick={() => navigate({ page: String(page - 1) })}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">{page} / {totalPages}</span>
            <button disabled={page >= totalPages || isPending}
              onClick={() => navigate({ page: String(page + 1) })}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
