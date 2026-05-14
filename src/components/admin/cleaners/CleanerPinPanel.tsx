'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { resetPin, unlockPin } from '@/app/(admin)/cleaners/actions'

interface Props {
  cleanerId: string
  pinLockedUntil: Date | null
  updatedAt: Date
}

export default function CleanerPinPanel({ cleanerId, pinLockedUntil, updatedAt }: Props) {
  const [showReset, setShowReset] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const isLocked = pinLockedUntil != null && new Date(pinLockedUntil) > new Date()

  function handleReset() {
    setError('')
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    startTransition(async () => {
      try {
        await resetPin(cleanerId, pin, confirmPin)
        setShowReset(false)
        setPin('')
        setConfirmPin('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  function handleUnlock() {
    startTransition(async () => {
      await unlockPin(cleanerId)
    })
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">
        <p className="text-xs text-gray-400">Last record update: {format(new Date(updatedAt), 'MMM d, yyyy h:mm a')}</p>
        {isLocked ? (
          <p className="mt-1 font-medium text-red-600">
            Locked until {format(new Date(pinLockedUntil!), 'MMM d, h:mm a')}
          </p>
        ) : (
          <p className="mt-1 text-green-600 font-medium">Unlocked</p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowReset(!showReset)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Reset PIN
        </button>
        {isLocked && (
          <button
            type="button"
            onClick={handleUnlock}
            disabled={isPending}
            className="px-3 py-1.5 border border-amber-400 text-amber-700 rounded-lg text-sm hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Unlocking…' : 'Unlock PIN'}
          </button>
        )}
      </div>

      {showReset && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New PIN</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                placeholder="••••"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                placeholder="••••"
                autoComplete="new-password"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowReset(false); setPin(''); setConfirmPin(''); setError('') }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="px-3 py-1.5 bg-brand-navy text-white rounded-lg text-sm hover:bg-brand-navy-dark disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save New PIN'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
