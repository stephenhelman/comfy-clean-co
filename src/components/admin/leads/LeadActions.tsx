'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logCall, markQuoteSent, markLost, reopenLead, convertLead } from '@/app/(admin)/leads/actions'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  type: string
  frequency: string
  status: string
  clientId: string | null
}

export default function LeadActions({ lead }: { lead: Lead }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'logCall' | 'convert' | 'markLost' | null>(null)

  // Log Call modal state
  const [callOutcome, setCallOutcome] = useState('answered')
  const [callNotes, setCallNotes] = useState('')

  // Mark Lost modal state
  const [lostReason, setLostReason] = useState('')
  const [lostOther, setLostOther] = useState('')

  // Convert modal state
  const [convertError, setConvertError] = useState('')

  function closeModal() {
    setModal(null)
    setCallNotes('')
    setLostOther('')
    setConvertError('')
  }

  function handleLogCall() {
    startTransition(async () => {
      await logCall(lead.id, callOutcome, callNotes)
      closeModal()
    })
  }

  function handleMarkQuoteSent() {
    startTransition(async () => {
      await markQuoteSent(lead.id)
    })
  }

  function handleMarkLost() {
    const reason = lostReason === 'other' ? lostOther : lostReason
    if (!reason.trim()) return
    startTransition(async () => {
      await markLost(lead.id, reason)
      closeModal()
    })
  }

  function handleReopen() {
    startTransition(async () => {
      await reopenLead(lead.id)
    })
  }

  async function handleConvert(formData: FormData) {
    setConvertError('')
    try {
      await convertLead(lead.id, formData)
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const btnBase = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50'
  const btnPrimary = `${btnBase} bg-brand-navy text-white hover:bg-brand-navy-dark`
  const btnDanger = `${btnBase} bg-red-600 text-white hover:bg-red-700`
  const btnSecondary = `${btnBase} border border-gray-300 text-gray-700 hover:bg-gray-50`

  return (
    <>
      {/* Action buttons */}
      <div className="space-y-2">
        {lead.status === 'new' && (
          <button onClick={() => setModal('logCall')} disabled={isPending} className={`${btnPrimary} w-full`}>
            Log Call
          </button>
        )}
        {lead.status === 'contacted' && (
          <>
            <button onClick={() => setModal('logCall')} disabled={isPending} className={`${btnSecondary} w-full`}>
              Log Call
            </button>
            <button onClick={handleMarkQuoteSent} disabled={isPending} className={`${btnPrimary} w-full`}>
              Mark Quote Sent
            </button>
          </>
        )}
        {(lead.status === 'new' || lead.status === 'contacted' || lead.status === 'quote_sent') && (
          <button onClick={() => setModal('convert')} disabled={isPending} className={`${btnBase} w-full bg-brand-green text-white hover:bg-brand-green-dark`}>
            Convert to Client
          </button>
        )}
        {(lead.status === 'contacted' || lead.status === 'quote_sent') && (
          <button onClick={() => setModal('markLost')} disabled={isPending} className={`${btnDanger} w-full`}>
            Mark Lost
          </button>
        )}
        {lead.status === 'converted' && lead.clientId && (
          <a href={`/clients/${lead.clientId}`} className={`${btnPrimary} w-full text-center block`}>
            View Client Record →
          </a>
        )}
        {lead.status === 'lost' && (
          <button onClick={handleReopen} disabled={isPending} className={`${btnPrimary} w-full`}>
            Reopen Lead
          </button>
        )}
      </div>

      {/* Log Call Modal */}
      {modal === 'logCall' && (
        <Modal title="Log Call" onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="answered">Answered</option>
                <option value="no_answer">No Answer</option>
                <option value="left_voicemail">Left Voicemail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                rows={3}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Call notes…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className={btnSecondary}>Cancel</button>
              <button onClick={handleLogCall} disabled={isPending} className={btnPrimary}>
                {isPending ? 'Saving…' : 'Log Call'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mark Lost Modal */}
      {modal === 'markLost' && (
        <Modal title="Mark Lead Lost" onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loss Reason *</label>
              <select
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select a reason…</option>
                <option value="price">Price</option>
                <option value="went_with_competitor">Went with competitor</option>
                <option value="no_response">No response</option>
                <option value="wrong_service_area">Wrong service area</option>
                <option value="other">Other</option>
              </select>
            </div>
            {lostReason === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specify reason</label>
                <input
                  type="text"
                  value={lostOther}
                  onChange={(e) => setLostOther(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className={btnSecondary}>Cancel</button>
              <button
                onClick={handleMarkLost}
                disabled={isPending || !lostReason || (lostReason === 'other' && !lostOther.trim())}
                className={btnDanger}
              >
                {isPending ? 'Saving…' : 'Mark Lost'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Convert Modal */}
      {modal === 'convert' && (
        <Modal title={`Convert ${lead.name} to Client`} onClose={closeModal}>
          <form action={handleConvert} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {lead.name}</p>
              <p><strong>Email:</strong> {lead.email}</p>
              <p><strong>Phone:</strong> {lead.phone}</p>
              <p><strong>Type:</strong> {lead.type} / {lead.frequency}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Address *</label>
              <input name="serviceAddress" type="text" required placeholder="123 Main St" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input name="serviceCity" type="text" required placeholder="El Paso" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip *</label>
                <input name="serviceZip" type="text" required placeholder="79938" maxLength={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Notes (optional)</label>
              <textarea name="clientNotes" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            {convertError && <p className="text-red-600 text-sm">{convertError}</p>}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeModal} className={btnSecondary}>Cancel</button>
              <button type="submit" disabled={isPending} className={`${btnBase} bg-brand-green text-white hover:bg-brand-green-dark`}>
                {isPending ? 'Creating…' : 'Create Client'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
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
