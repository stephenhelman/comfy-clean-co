'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { Star, AlertTriangle, CheckCircle, Send, X, Plus } from 'lucide-react'
import {
  sendReviewRequest,
  skipReviewRequest,
  acknowledgeNegativeReview,
  addGoogleReview,
} from '@/app/(admin)/reviews/actions'

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued', sent: 'Sent', clicked: 'Link Clicked',
  matched: 'Matched', skipped: 'Skipped',
}
const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-600',
  sent: 'bg-amber-100 text-amber-700',
  clicked: 'bg-blue-100 text-blue-700',
  matched: 'bg-teal-100 text-teal-700',
  skipped: 'bg-gray-100 text-gray-400',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

export interface ReviewRequestRow {
  id: string
  clientId: string | null
  clientName: string | null
  clientEmail: string | null
  jobId: string | null
  jobDate: string | null
  status: string
  sentAt: string | null
  clickedAt: string | null
  createdAt: string
}

export interface GoogleReviewRow {
  id: string
  googleReviewId: string
  authorName: string
  rating: number
  text: string | null
  publishedAt: string
  flagged: boolean
  flagAcknowledgedAt: string | null
  flagAcknowledgedBy: string | null
  reviewRequestId: string | null
}

interface Props {
  requests: ReviewRequestRow[]
  reviews: GoogleReviewRow[]
  avgRating: number | null
  totalReviews: number
  queuedCount: number
  flaggedUnacknowledgedCount: number
}

function AddReviewModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    googleReviewId: '', authorName: '', rating: '5', text: '', publishedAt: '',
  })

  function handle() {
    if (!form.googleReviewId.trim()) { setError('Google Review ID is required'); return }
    if (!form.authorName.trim()) { setError('Author name is required'); return }
    if (!form.publishedAt) { setError('Published date is required'); return }
    setError('')
    startTransition(async () => {
      try {
        await addGoogleReview({
          googleReviewId: form.googleReviewId,
          authorName: form.authorName,
          rating: parseInt(form.rating),
          text: form.text,
          publishedAt: form.publishedAt,
        })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add review')
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Add Google Review</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Google Review ID</label>
            <input value={form.googleReviewId} onChange={e => setForm(f => ({ ...f, googleReviewId: e.target.value }))}
              placeholder="Unique identifier from Google"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reviewer Name</label>
            <input value={form.authorName} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rating</label>
            <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Star{n !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Published Date</label>
            <input type="date" value={form.publishedAt} onChange={e => setForm(f => ({ ...f, publishedAt: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Review Text (optional)</label>
            <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button onClick={handle} disabled={isPending}
            className="px-4 py-2 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50">
            {isPending ? 'Saving…' : 'Add Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RequestRow({ req }: { req: ReviewRequestRow }) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')

  function run(fn: () => Promise<void>) {
    setMsg('')
    startTransition(async () => {
      try { await fn(); setMsg('Done') }
      catch (e) { setMsg(e instanceof Error ? e.message : 'Error') }
    })
  }

  const canSend = ['queued', 'sent'].includes(req.status) && !!req.clientEmail
  const canSkip = req.status === 'queued'

  return (
    <tr>
      <td className="px-4 py-3">
        {req.clientId ? (
          <a href={`/clients/${req.clientId}`} className="font-medium text-gray-900 hover:text-brand-navy">
            {req.clientName ?? '—'}
          </a>
        ) : (
          <span className="text-gray-500">{req.clientName ?? '—'}</span>
        )}
        {!req.clientEmail && <div className="text-xs text-red-500 mt-0.5">No email</div>}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-sm">
        {req.jobDate ? format(parseISO(req.jobDate), 'MMM d, yyyy') : '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {STATUS_LABELS[req.status] ?? req.status}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
        {req.sentAt ? format(parseISO(req.sentAt), 'MMM d, h:mm a') : '—'}
        {req.clickedAt && <div className="text-blue-600 mt-0.5">Clicked {format(parseISO(req.clickedAt), 'MMM d')}</div>}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {format(parseISO(req.createdAt), 'MMM d')}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {canSend && (
            <button onClick={() => run(() => sendReviewRequest(req.id))} disabled={isPending}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-brand-navy text-white rounded hover:bg-brand-navy/90 disabled:opacity-50">
              <Send className="w-3 h-3" />
              {req.status === 'sent' ? 'Resend' : 'Send'}
            </button>
          )}
          {canSkip && (
            <button onClick={() => run(() => skipReviewRequest(req.id))} disabled={isPending}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              Skip
            </button>
          )}
          {msg && <span className="text-xs text-gray-400">{msg}</span>}
        </div>
      </td>
    </tr>
  )
}

function GoogleReviewRow({ review }: { review: GoogleReviewRow }) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const isNegative = review.flagged
  const needsAck = isNegative && !review.flagAcknowledgedAt

  function ack() {
    setMsg('')
    startTransition(async () => {
      try { await acknowledgeNegativeReview(review.id); setMsg('Acknowledged') }
      catch (e) { setMsg(e instanceof Error ? e.message : 'Error') }
    })
  }

  return (
    <tr className={needsAck ? 'bg-red-50/40' : ''}>
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{review.authorName}</div>
        <div className="text-xs text-gray-400 mt-0.5">{format(parseISO(review.publishedAt), 'MMM d, yyyy')}</div>
      </td>
      <td className="px-4 py-3">
        <StarRating rating={review.rating} />
        <span className="text-xs text-gray-500 ml-1">{review.rating}/5</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
        {review.text ? (
          <p className="line-clamp-2">{review.text}</p>
        ) : (
          <span className="text-gray-400 italic text-xs">No text</span>
        )}
      </td>
      <td className="px-4 py-3">
        {needsAck && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <button onClick={ack} disabled={isPending}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50">
              <CheckCircle className="w-3 h-3" /> Acknowledge
            </button>
          </div>
        )}
        {isNegative && review.flagAcknowledgedAt && (
          <div className="text-xs text-gray-400">
            <CheckCircle className="w-3 h-3 inline mr-1 text-gray-400" />
            Ack by {review.flagAcknowledgedBy}
          </div>
        )}
        {review.reviewRequestId && (
          <div className="text-xs text-teal-600 mt-1">Matched</div>
        )}
        {msg && <span className="text-xs text-gray-500 ml-1">{msg}</span>}
      </td>
    </tr>
  )
}

type Tab = 'queue' | 'reviews'

export default function ReviewsClient({
  requests, reviews, avgRating, totalReviews, queuedCount, flaggedUnacknowledgedCount,
}: Props) {
  const [tab, setTab] = useState<Tab>('queue')
  const [showAddReview, setShowAddReview] = useState(false)

  const activeRequests = requests.filter(r => !['skipped', 'matched'].includes(r.status))
  const archivedRequests = requests.filter(r => ['skipped', 'matched'].includes(r.status))

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Reviews</h1>
        <button onClick={() => setShowAddReview(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
          <Plus className="w-4 h-4 shrink-0" /> Add Review
        </button>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-6 shrink-0 flex-wrap">
        <div>
          <p className="text-xs text-gray-500">Avg Rating</p>
          <div className="flex items-center gap-1.5">
            {avgRating != null ? (
              <>
                <StarRating rating={Math.round(avgRating)} />
                <span className="text-sm font-bold text-gray-900">{avgRating.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Reviews</p>
          <p className="text-sm font-semibold text-gray-900">{totalReviews}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Queued to Send</p>
          <p className="text-sm font-semibold text-gray-900">{queuedCount}</p>
        </div>
        {flaggedUnacknowledgedCount > 0 && (
          <div className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-sm text-red-700 font-medium">
              {flaggedUnacknowledgedCount} negative {flaggedUnacknowledgedCount === 1 ? 'review' : 'reviews'} need attention
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-gray-200 flex shrink-0">
        <button onClick={() => setTab('queue')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'queue' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Review Queue
          {queuedCount > 0 && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{queuedCount}</span>}
        </button>
        <button onClick={() => setTab('reviews')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'reviews' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Google Reviews
          {flaggedUnacknowledgedCount > 0 && (
            <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{flaggedUnacknowledgedCount}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'queue' && (
          <>
            {activeRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <CheckCircle className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-lg font-medium">Queue is clear</p>
                <p className="text-sm mt-1">Review requests are sent automatically after jobs complete.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Client</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden md:table-cell">Job Date</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Sent At</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Queued</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeRequests.map(r => <RequestRow key={r.id} req={r} />)}
                </tbody>
              </table>
            )}
            {archivedRequests.length > 0 && (
              <details className="border-t border-gray-200">
                <summary className="px-6 py-3 text-sm text-gray-500 cursor-pointer hover:bg-gray-50">
                  {archivedRequests.length} skipped / matched requests
                </summary>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {archivedRequests.map(r => <RequestRow key={r.id} req={r} />)}
                  </tbody>
                </table>
              </details>
            )}
          </>
        )}

        {tab === 'reviews' && (
          <>
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Star className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-lg font-medium">No reviews yet</p>
                <p className="text-sm mt-1">Add reviews manually or connect Google My Business in Settings.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Reviewer</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Rating</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Review</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviews.map(r => <GoogleReviewRow key={r.id} review={r} />)}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {showAddReview && <AddReviewModal onClose={() => setShowAddReview(false)} />}
    </div>
  )
}
