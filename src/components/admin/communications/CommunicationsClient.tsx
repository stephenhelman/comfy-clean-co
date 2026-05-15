'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { Mail, MessageSquare, ArrowDownLeft, ArrowUpRight, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { retryCommunication } from '@/app/(admin)/communications/actions'
import { COMM_EVENT_LABELS } from '@/lib/communications/templates'

interface Comm {
  id: string
  channel: string
  eventType: string
  subject: string | null
  body: string
  direction: string
  status: string
  recipientName: string
  recipientEmail: string | null
  recipientPhone: string | null
  clientId: string | null
  leadId: string | null
  clientName: string | null
  leadName: string | null
  externalId: string | null
  sentAt: string | null
  deliveredAt: string | null
  errorMessage: string | null
  createdAt: string
}

interface Summary {
  emailSent: number
  emailDelivered: number
  emailFailed: number
  smsSent: number
  smsDelivered: number
  smsOptedOut: number
}

interface Props {
  comms: Comm[]
  total: number
  page: number
  pageSize: number
  summary: Summary
  clients: { id: string; name: string }[]
  filters: {
    channel: string
    status: string
    direction: string
    eventType: string
    clientId: string
    from: string
    to: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-600',
  sent:       'bg-blue-100 text-blue-700',
  delivered:  'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
  bounced:    'bg-orange-100 text-orange-700',
  opted_out:  'bg-purple-100 text-purple-700',
}

const EVENT_TYPES = [
  'sms_opt_in', 'sms_welcome', 'invoice_sent', 'invoice_resent',
  'appointment_confirmed', 'payment_receipt', 'review_request',
  'admin_new_lead', 'admin_negative_review', 'admin_overdue_invoice',
  'sms_reply_optin', 'sms_reply_optout', 'sms_reply_other',
]

export default function CommunicationsClient({ comms, total, page, pageSize, summary, clients, filters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState<Comm | null>(null)
  const [isPending, startTransition] = useTransition()
  const [retrying, setRetrying] = useState<string | null>(null)
  const [retryError, setRetryError] = useState<string | null>(null)

  const totalPages = Math.ceil(total / pageSize)

  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  const setQuickFilter = (filter: string) => {
    const params = new URLSearchParams()
    if (filter === 'failed') params.set('status', 'failed')
    else if (filter === 'today') params.set('from', new Date().toISOString().slice(0, 10))
    else if (filter === 'inbound') params.set('direction', 'inbound')
    else if (filter === 'opted_out') params.set('status', 'opted_out')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleRetry = async (commId: string) => {
    setRetrying(commId)
    setRetryError(null)
    try {
      await retryCommunication(commId)
      setSelected(null)
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetrying(null)
    }
  }

  const emailPct = summary.emailSent > 0 ? Math.round((summary.emailDelivered / summary.emailSent) * 100) : 0
  const smsPct = summary.smsSent > 0 ? Math.round((summary.smsDelivered / summary.smsSent) * 100) : 0

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          Communications
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">All outbound messages and inbound replies — last 30 days</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Emails Sent', value: summary.emailSent },
          { label: 'Emails Delivered', value: `${summary.emailDelivered} (${emailPct}%)` },
          { label: 'Emails Failed', value: summary.emailFailed, red: summary.emailFailed > 0 },
          { label: 'SMS Sent', value: summary.smsSent },
          { label: 'SMS Delivered', value: `${summary.smsDelivered} (${smsPct}%)` },
          { label: 'SMS Opted Out', value: summary.smsOptedOut },
        ].map(({ label, value, red }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${red ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: 'All', fn: () => router.push(pathname) },
          { label: 'Failed', fn: () => setQuickFilter('failed') },
          { label: 'Today', fn: () => setQuickFilter('today') },
          { label: 'Inbound Replies', fn: () => setQuickFilter('inbound') },
          { label: 'Opted Out', fn: () => setQuickFilter('opted_out') },
        ].map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select
            value={filters.channel}
            onChange={e => setParam('channel', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
          >
            <option value="">All Channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>

          <select
            value={filters.status}
            onChange={e => setParam('status', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
            <option value="opted_out">Opted Out</option>
          </select>

          <select
            value={filters.direction}
            onChange={e => setParam('direction', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
          >
            <option value="">All Directions</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>

          <select
            value={filters.eventType}
            onChange={e => setParam('eventType', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>{COMM_EVENT_LABELS[t] ?? t}</option>
            ))}
          </select>

          <select
            value={filters.clientId}
            onChange={e => setParam('clientId', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={filters.from}
              onChange={e => setParam('from', e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/20 w-full"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Channel</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Event</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Recipient</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Preview</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {comms.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    No communications found for the selected filters.
                  </td>
                </tr>
              )}
              {comms.map(comm => (
                <tr key={comm.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(comm.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {comm.direction === 'inbound' ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-purple-500" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      {comm.channel === 'email' ? (
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                      )}
                      <span className="text-xs text-gray-600 capitalize">{comm.channel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-700">
                      {COMM_EVENT_LABELS[comm.eventType] ?? comm.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      {comm.clientId ? (
                        <a href={`/clients/${comm.clientId}`} className="text-sm font-medium text-brand-navy hover:underline">
                          {comm.recipientName}
                        </a>
                      ) : comm.leadId ? (
                        <a href={`/leads/${comm.leadId}`} className="text-sm font-medium text-brand-navy hover:underline">
                          {comm.recipientName}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-700">{comm.recipientName}</span>
                      )}
                      <p className="text-xs text-gray-400">
                        {comm.recipientEmail ?? comm.recipientPhone ?? ''}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-xs text-gray-600 truncate">
                      {comm.subject ?? comm.body.slice(0, 60)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[comm.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {comm.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(comm)}
                      className="text-xs text-brand-navy hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {selected.channel === 'email' ? (
                  <Mail className="w-4 h-4 text-blue-500" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-green-500" />
                )}
                <h2 className="text-base font-semibold text-gray-900">
                  {COMM_EVENT_LABELS[selected.eventType] ?? selected.eventType}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {selected.status}
                </span>
              </div>
              <button onClick={() => { setSelected(null); setRetryError(null) }}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-700" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Recipient</p>
                  <p className="font-medium">{selected.recipientName}</p>
                  <p className="text-xs text-gray-500">{selected.recipientEmail ?? selected.recipientPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Sent</p>
                  <p className="text-sm">{selected.sentAt ? format(new Date(selected.sentAt), 'MMM d, yyyy h:mm a') : '—'}</p>
                </div>
                {selected.deliveredAt && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Delivered</p>
                    <p className="text-sm">{format(new Date(selected.deliveredAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                )}
                  {selected.errorMessage && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Error</p>
                    <p className="text-sm text-red-600">{selected.errorMessage}</p>
                  </div>
                )}
                {selected.externalId && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">
                      {selected.channel === 'email' ? 'Resend ID' : 'Twilio SID'}
                    </p>
                    <p className="text-xs font-mono text-gray-600 break-all">{selected.externalId}</p>
                  </div>
                )}
              </div>

              {/* Subject */}
              {selected.subject && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Subject</p>
                  <p className="text-sm font-medium">{selected.subject}</p>
                </div>
              )}

              {/* Body */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Message Content</p>
                {selected.channel === 'email' ? (
                  <div
                    className="border border-gray-200 rounded-lg p-4 text-sm max-h-80 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selected.body }}
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap text-gray-700">
                    {selected.body}
                  </div>
                )}
              </div>

              {/* Retry error */}
              {retryError && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {retryError}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setSelected(null); setRetryError(null) }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200"
              >
                Close
              </button>
              {['failed', 'bounced'].includes(selected.status) && (
                <button
                  onClick={() => handleRetry(selected.id)}
                  disabled={retrying === selected.id}
                  className="px-4 py-2 text-sm font-medium bg-brand-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${retrying === selected.id ? 'animate-spin' : ''}`} />
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
