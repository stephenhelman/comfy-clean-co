'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'

interface LeadSmsActions {
  kind: 'lead'
  sendOptIn: (id: string) => Promise<void>
  markVerbal: (id: string) => Promise<void>
  markOptedOut: (id: string) => Promise<void>
  overrideOptOut: (id: string) => Promise<void>
}

interface ClientSmsActions {
  kind: 'client'
  sendOptIn: (id: string) => Promise<void>
  markVerbal: (id: string) => Promise<void>
  markOptedOut: (id: string) => Promise<void>
  overrideOptOut: (id: string) => Promise<void>
}

interface Props {
  id: string
  name: string
  phone: string | null
  smsOptedIn: boolean
  smsOptedOut: boolean
  smsOptInSent?: boolean
  smsOptedInAt: string | null
  smsOptedOutAt: string | null
  smsOptInSentAt?: string | null
  actions: LeadSmsActions | ClientSmsActions
}

type State = 'opted_in' | 'pending' | 'not_opted_in' | 'opted_out' | 'no_phone'

function getState(props: Props): State {
  if (!props.phone) return 'no_phone'
  if (props.smsOptedOut) return 'opted_out'
  if (props.smsOptedIn) return 'opted_in'
  if (props.smsOptInSent) return 'pending'
  return 'not_opted_in'
}

export default function SmsOptInPanel(props: Props) {
  const { id, name, phone, smsOptedInAt, smsOptedOutAt, smsOptInSentAt, actions } = props
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const state = getState(props)

  const run = (fn: () => Promise<void>, successMsg: string) => {
    setError(null)
    setConfirm(null)
    startTransition(async () => {
      try {
        await fn()
        setSuccess(successMsg)
        setTimeout(() => setSuccess(null), 3000)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Action failed')
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">SMS Communications</h2>

      {state === 'no_phone' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-gray-300">—</span>
          No phone number on file. Add a phone number to enable SMS.
        </div>
      )}

      {state === 'opted_in' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-700">Opted In</p>
              {smsOptedInAt && (
                <p className="text-xs text-gray-400">Confirmed: {format(new Date(smsOptedInAt), 'MMM d, yyyy')}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setConfirm('opt_out')}
            disabled={isPending}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Mark as Opted Out
          </button>
        </div>
      )}

      {state === 'pending' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700">Opt-In Pending</p>
              {smsOptInSentAt && (
                <p className="text-xs text-gray-400">
                  Opt-in text sent: {format(new Date(smsOptInSentAt), 'MMM d, yyyy')}
                </p>
              )}
              <p className="text-xs text-gray-400">Awaiting reply...</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => run(() => actions.sendOptIn(id), 'Opt-in text resent')}
              disabled={isPending}
              className="text-xs text-brand-navy hover:underline disabled:opacity-50"
            >
              Resend Opt-In Text
            </button>
            <button
              onClick={() => setConfirm('verbal')}
              disabled={isPending}
              className="text-xs text-brand-navy hover:underline disabled:opacity-50"
            >
              Mark as Verbally Opted In
            </button>
          </div>
        </div>
      )}

      {state === 'not_opted_in' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 shrink-0" />
            <p className="text-sm text-gray-500">Not Opted In</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => run(() => actions.sendOptIn(id), 'Opt-in text sent')}
              disabled={isPending}
              className="text-xs text-brand-navy hover:underline disabled:opacity-50"
            >
              Send Opt-In Text
            </button>
            <button
              onClick={() => setConfirm('verbal')}
              disabled={isPending}
              className="text-xs text-brand-navy hover:underline disabled:opacity-50"
            >
              Mark as Verbally Opted In
            </button>
          </div>
        </div>
      )}

      {state === 'opted_out' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Opted Out</p>
              {smsOptedOutAt && (
                <p className="text-xs text-gray-400">Opted out: {format(new Date(smsOptedOutAt), 'MMM d, yyyy')}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setConfirm('override')}
            disabled={isPending}
            className="text-xs text-gray-500 hover:underline disabled:opacity-50"
          >
            Mark as Opted In (admin override)
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-2 text-xs text-green-600">{success}</p>}

      {/* Confirmation dialog */}
      {confirm && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm space-y-2">
          {confirm === 'verbal' && (
            <p>Mark <strong>{name}</strong> as verbally opted in and send welcome text?</p>
          )}
          {confirm === 'opt_out' && (
            <p>Mark <strong>{name}</strong> as opted out? No further SMS will be sent.</p>
          )}
          {confirm === 'override' && (
            <p>Override opt-out for <strong>{name}</strong>? Only do this if they have explicitly asked to receive texts again.</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (confirm === 'verbal') run(() => actions.markVerbal(id), 'Marked as verbally opted in')
                else if (confirm === 'opt_out') run(() => actions.markOptedOut(id), 'Marked as opted out')
                else if (confirm === 'override') run(() => actions.overrideOptOut(id), 'Opt-out overridden')
              }}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-brand-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirm(null)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
