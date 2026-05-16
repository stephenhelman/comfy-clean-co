'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { MapPin } from 'lucide-react'
import ElapsedTimer from '@/components/time/ElapsedTimer'
import { clockIn, clockInWithGps, clockOut, clockOutConfirmed, clockOutWithGps } from '@/app/(time)/home/actions'

type ModalState = 'not_started' | 'clocked_in' | 'completed'

interface Summary {
  clockedInAt: string
  clockedOutAt: string
  durationMins: number
}

interface JobModalProps {
  assignment: {
    id: string
    clockedInAt: Date | null
    clockedOutAt: Date | null
    gpsBlocked: boolean
    job: {
      scheduledAt: Date
      jobType: string
      status: string
      client: {
        name: string
        defaultAddress: string | null
        defaultCity: string | null
        defaultZip: string | null
      }
    }
  }
  anotherJobActive: boolean
  onClose: () => void
}

const JOB_TYPE_LABELS: Record<string, string> = {
  standard:   'Standard Clean',
  deep:       'Deep Clean',
  'move-out': 'Move-Out Clean',
}

function formatDur(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min${m !== 1 ? 's' : ''}`
  if (m === 0) return `${h} hr${h !== 1 ? 's' : ''}`
  return `${h} hr${h !== 1 ? 's' : ''} ${m} min${m !== 1 ? 's' : ''}`
}

async function captureGps(): Promise<{ lat: number | null; lng: number | null; blocked: boolean }> {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lng: null, blocked: true })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, blocked: false }),
      () => resolve({ lat: null, lng: null, blocked: true }),
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true },
    )
  })
}

export default function JobModal({ assignment, anotherJobActive, onClose }: JobModalProps) {
  const { job } = assignment

  const getInitialState = (): ModalState => {
    if (assignment.clockedOutAt || ['completed', 'paid'].includes(job.status)) return 'completed'
    if (assignment.clockedInAt) return 'clocked_in'
    return 'not_started'
  }

  const [modalState, setModalState] = useState<ModalState>(getInitialState)
  const [clockedInAt, setClockedInAt] = useState<Date | null>(assignment.clockedInAt)
  const [gpsWasCaptured, setGpsWasCaptured] = useState(!assignment.gpsBlocked && !!assignment.clockedInAt)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)  // PC-07
  const [showEarlyWarning, setShowEarlyWarning] = useState(false)
  const [earlyWarningMsg, setEarlyWarningMsg] = useState('')

  // Swipe-to-dismiss
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (dragStartY.current === null) return
    const delta = e.changedTouches[0].clientY - dragStartY.current
    if (delta > 80 && !isPending) onClose()  // PC-07: no dismiss during flight
    dragStartY.current = null
  }

  async function handleClockIn() {
    if (isPending) return
    setIsPending(true)          // PC-07
    setError('')

    // Optimistic UI
    const optimisticTime = new Date()
    setModalState('clocked_in')
    setClockedInAt(optimisticTime)

    const result = await clockIn(assignment.id)

    if ('error' in result && result.error) {
      // Revert
      setModalState('not_started')
      setClockedInAt(null)
      setError(result.error)
      setIsPending(false)
      return
    }

    setIsPending(false)

    // GPS capture non-blocking after success
    captureGps().then(({ lat, lng, blocked }) => {
      setGpsWasCaptured(!blocked)
      clockInWithGps(assignment.id, lat, lng, blocked)
    })
  }

  async function handleClockOut() {
    if (isPending) return
    setIsPending(true)  // PC-07
    setError('')

    const result = await clockOut(assignment.id)

    if ('warning' in result && result.warning) {
      setEarlyWarningMsg(result.message ?? 'Clock out early?')
      setShowEarlyWarning(true)
      setIsPending(false)
      return
    }

    if ('error' in result && result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }

    if ('success' in result && result.success) {
      finishClockOut(result)
    }
  }

  async function handleConfirmEarlyClockOut() {
    if (isPending) return
    setIsPending(true)
    setShowEarlyWarning(false)

    const result = await clockOutConfirmed(assignment.id)

    if ('error' in result && result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }

    if ('success' in result && result.success) {
      finishClockOut(result)
    }
  }

  function finishClockOut(result: { summary?: Summary }) {
    setModalState('completed')
    if (result.summary) setSummary(result.summary)
    setIsPending(false)

    // GPS capture non-blocking
    captureGps().then(({ lat, lng, blocked }) => {
      clockOutWithGps(assignment.id, lat, lng, blocked)
    })
  }

  const address = [job.client.defaultAddress, job.client.defaultCity].filter(Boolean).join(', ')
  const fullAddress = [job.client.defaultAddress, job.client.defaultCity, job.client.defaultZip]
    .filter(Boolean).join(', ')
  const jobTypeLabel = JOB_TYPE_LABELS[job.jobType] ?? job.jobType

  return (
    <>
      {/* Backdrop — PC-07: no dismiss while action is in flight */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => { if (!isPending) onClose() }}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-2xl z-50 shadow-2xl max-h-[80vh] overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pb-8 pt-2 space-y-4">
          {/* Job details */}
          <div>
            <h2 className="text-lg font-bold text-gray-900">{job.client.name}</h2>
            {/* PC-10: plain text address — tap-to-maps deferred to addendum */}
            <p className="text-sm text-gray-500 mt-0.5">{fullAddress}</p>
            <p className="text-sm text-gray-500 mt-2">
              {format(new Date(job.scheduledAt), 'EEEE, MMMM d')} at {format(new Date(job.scheduledAt), 'h:mm a')}
            </p>
            <p className="text-sm text-gray-500">{jobTypeLabel}</p>
          </div>

          <div className="border-t border-gray-100" />

          {/* State 1 — Not started */}
          {modalState === 'not_started' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Not started</p>

              {showEarlyWarning && (
                <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
                  <p className="text-sm text-amber-800">{earlyWarningMsg}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowEarlyWarning(false)}
                      className="flex-1 border border-gray-300 rounded-xl py-2 text-sm text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmEarlyClockOut}
                      disabled={isPending}
                      className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      Yes, Clock Out
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleClockIn}
                disabled={isPending || anotherJobActive}
                className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-colors ${
                  anotherJobActive || isPending
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-500 active:bg-green-600'
                }`}
              >
                {isPending ? 'Clocking In…' : 'CLOCK IN'}
              </button>

              {anotherJobActive && (
                <p className="text-xs text-center text-gray-500">
                  You're clocked into another job. Clock out first.
                </p>
              )}
            </div>
          )}

          {/* State 2 — Clocked in */}
          {modalState === 'clocked_in' && clockedInAt && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600">
                  Clocked in at {format(new Date(clockedInAt), 'h:mm a')}
                </p>
                {gpsWasCaptured && <MapPin size={14} className="text-teal-500" />}
              </div>

              <ElapsedTimer clockedInAt={new Date(clockedInAt)} />

              {showEarlyWarning && (
                <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
                  <p className="text-sm text-amber-800">{earlyWarningMsg}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowEarlyWarning(false)}
                      className="flex-1 border border-gray-300 rounded-xl py-2 text-sm text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmEarlyClockOut}
                      disabled={isPending}
                      className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      Yes, Clock Out
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleClockOut}
                disabled={isPending}
                className="w-full py-4 rounded-2xl font-bold text-white text-lg bg-red-500 active:bg-red-600 transition-colors disabled:opacity-60"
              >
                {isPending ? 'Clocking Out…' : 'CLOCK OUT'}
              </button>
            </div>
          )}

          {/* State 3 — Completed */}
          {modalState === 'completed' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-green-500 text-xl">✓</span>
                <span className="font-semibold text-gray-900">Job Complete</span>
              </div>

              {summary && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Clocked in:</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(summary.clockedInAt), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Clocked out:</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(summary.clockedOutAt), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium text-gray-900">{formatDur(summary.durationMins)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-bold text-white text-lg bg-teal-600 active:bg-teal-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
