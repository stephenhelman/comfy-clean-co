'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay,
  parseISO, getHours, getMinutes,
} from 'date-fns'
import { ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react'
import JobSlideOut from './JobSlideOut'

export type CalendarJob = {
  id: string
  clientId: string
  clientName: string
  serviceAddress: string
  serviceCity: string
  serviceZip: string
  scheduledAt: string
  estimatedHours: number | null
  jobType: string
  notes: string | null
  estimatedValue: number | null
  actualRevenue: number | null
  paymentMethod: string | null
  status: string
  cancelReason: string | null
  cancellationType: string | null
  recurringRule: string | null
  recurringGroupId: string | null
  invoice: {
    id: string
    invoiceNumber: string
    amount: number
    amountPaid: number | null
    paymentType: string
    status: string
    sentAt: string | null
    paidAt: string | null
    paymentLinkClickedAt: string | null
    manuallyConfirmedAt: string | null
    manuallyConfirmedBy: string | null
    pdfUrl: string | null
  } | null
  assignments: {
    id: string
    cleanerId: string
    cleanerName: string
    cleanerColorIndex: number
    clockedInAt: string | null
    clockedOutAt: string | null
    durationMins: number | null
    laborCost: number | null
    gpsLat: number | null
    gpsLng: number | null
    gpsBlocked: boolean
    hourlyRateSnapshot: number | null
  }[]
}

type ColorMode = 'assignment' | 'status' | 'recurrence' | 'invoice'

const CLEANER_COLORS = [
  '#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4',
  '#F97316','#84CC16','#EC4899','#14B8A6','#6366F1','#A78BFA',
]

const STATUS_COLORS: Record<string, string> = {
  stand_by: '#DDD6FE',
  scheduled: '#BFDBFE',
  in_progress: '#FDE68A',
  completed: '#BBF7D0',
  cancelled: '#E2E8F0',
  bump: '#FEF08A',
  lock_out: '#FECACA',
}

const INVOICE_COLORS: Record<string, string> = {
  draft: '#E2E8F0',
  sent: '#FDE68A',
  pending: '#FED7AA',
  paid: '#99F6E4',
  overdue: '#FECACA',
  voided: '#E2E8F0',
  refunded: '#DDD6FE',
  partially_refunded: '#DDD6FE',
}

function getJobColor(job: CalendarJob, mode: ColorMode): string {
  if (mode === 'status') return STATUS_COLORS[job.status] ?? '#E2E8F0'
  if (mode === 'invoice') return job.invoice ? (INVOICE_COLORS[job.invoice.status] ?? '#E2E8F0') : '#E2E8F0'
  if (mode === 'recurrence') return job.recurringRule ? '#BFDBFE' : '#F1F5F9'
  // assignment mode
  if (job.assignments.length === 0) return '#F1F5F9'
  return CLEANER_COLORS[job.assignments[0].cleanerColorIndex % CLEANER_COLORS.length]
}

function getJobBorder(job: CalendarJob, mode: ColorMode): string {
  const isUnassigned = job.assignments.length === 0
  if (mode === 'assignment' && isUnassigned) return '2px dashed #94A3B8'
  return '1px solid transparent'
}

function JobPill({
  job,
  colorMode,
  onClick,
  compact = true,
}: {
  job: CalendarJob
  colorMode: ColorMode
  onClick: (job: CalendarJob) => void
  compact?: boolean
}) {
  const bg = getJobColor(job, colorMode)
  const border = getJobBorder(job, colorMode)
  const isInProgress = job.status === 'in_progress'

  return (
    <button
      onClick={() => onClick(job)}
      style={{ backgroundColor: bg, border }}
      className="w-full text-left rounded px-1.5 py-0.5 text-xs leading-tight truncate hover:opacity-90 transition-opacity cursor-pointer"
    >
      <span className="flex items-center gap-1">
        {isInProgress && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
        )}
        {job.recurringRule && colorMode === 'recurrence' && <RefreshCw className="w-2.5 h-2.5 shrink-0" />}
        <span className="truncate font-medium text-gray-800">
          {format(parseISO(job.scheduledAt), 'h:mma')} {job.clientName}
        </span>
      </span>
      {!compact && (
        <span className="block text-gray-500 truncate">{job.serviceAddress}</span>
      )}
      {/* Cleaner initials in assignment mode */}
      {colorMode === 'assignment' && job.assignments.length > 0 && (
        <span className="flex gap-0.5 mt-0.5">
          {job.assignments.slice(0, 3).map((a) => (
            <span
              key={a.id}
              style={{ backgroundColor: CLEANER_COLORS[a.cleanerColorIndex % CLEANER_COLORS.length] }}
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white text-[8px] font-bold shrink-0"
            >
              {a.cleanerName.charAt(0)}
            </span>
          ))}
        </span>
      )}
    </button>
  )
}

// ─── Month View ────────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  jobs,
  colorMode,
  onJobClick,
  onDayClick,
  onViewChange,
}: {
  currentDate: Date
  jobs: CalendarJob[]
  colorMode: ColorMode
  onJobClick: (job: CalendarJob) => void
  onDayClick: (date: Date) => void
  onViewChange: (view: 'day', date: Date) => void
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days: Date[] = []
  let d = calStart
  while (d <= calEnd) { days.push(d); d = addDays(d, 1) }

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((h) => (
          <div key={h} className="py-2 text-center text-xs font-semibold text-gray-500">{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-200 border-b border-gray-200">
        {days.map((day) => {
          const dayJobs = jobs.filter((j) => isSameDay(parseISO(j.scheduledAt), day))
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentDate)
          const showJobs = dayJobs.slice(0, 3)
          const overflow = dayJobs.length - 3

          return (
            <div
              key={day.toISOString()}
              className={`min-h-24 p-1 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}`}
            >
              <button
                onClick={() => onDayClick(day)}
                className={`w-6 h-6 text-xs font-medium rounded-full flex items-center justify-center mb-1 hover:bg-gray-100 ${
                  isToday ? 'bg-brand-navy text-white' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {format(day, 'd')}
              </button>
              <div className="space-y-0.5">
                {showJobs.map((job) => (
                  <JobPill key={job.id} job={job} colorMode={colorMode} onClick={onJobClick} />
                ))}
                {overflow > 0 && (
                  <button
                    onClick={() => onViewChange('day', day)}
                    className="text-xs text-brand-navy hover:underline pl-1"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ─────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am–8pm
const HOUR_HEIGHT = 64 // px per hour

function WeekView({
  currentDate,
  jobs,
  colorMode,
  onJobClick,
  onSlotClick,
}: {
  currentDate: Date
  jobs: CalendarJob[]
  colorMode: ColorMode
  onJobClick: (job: CalendarJob) => void
  onSlotClick: (date: Date) => void
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] sticky top-0 bg-white z-10 border-b border-gray-200">
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className={`py-2 text-center border-l border-gray-200 ${isSameDay(day, today) ? 'bg-blue-50' : ''}`}>
            <p className="text-xs text-gray-500">{format(day, 'EEE')}</p>
            <p className={`text-sm font-semibold ${isSameDay(day, today) ? 'text-brand-navy' : 'text-gray-900'}`}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>
      {/* Time grid */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ minHeight: HOUR_HEIGHT * HOURS.length }}>
        {/* Time labels */}
        <div className="relative">
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-gray-100 pr-2 flex items-start justify-end">
              <span className="text-xs text-gray-400 -mt-2.5">{h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}</span>
            </div>
          ))}
        </div>
        {/* Day columns */}
        {days.map((day) => {
          const dayJobs = jobs.filter((j) => isSameDay(parseISO(j.scheduledAt), day))
          return (
            <div key={day.toISOString()} className="relative border-l border-gray-200">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_HEIGHT }}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    const d = new Date(day)
                    d.setHours(h, 0, 0, 0)
                    onSlotClick(d)
                  }}
                />
              ))}
              {dayJobs.map((job) => {
                const dt = parseISO(job.scheduledAt)
                const h = getHours(dt)
                const m = getMinutes(dt)
                const topOffset = (h - 7) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
                const height = Math.max((job.estimatedHours ?? 1) * HOUR_HEIGHT, 32)
                const bg = getJobColor(job, colorMode)
                const border = getJobBorder(job, colorMode)

                return (
                  <button
                    key={job.id}
                    onClick={(e) => { e.stopPropagation(); onJobClick(job) }}
                    style={{ top: topOffset, height, backgroundColor: bg, border }}
                    className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-xs text-left overflow-hidden hover:opacity-90 cursor-pointer z-10"
                  >
                    <p className="font-semibold text-gray-800 truncate leading-tight">{job.clientName}</p>
                    <p className="text-gray-500 truncate">{format(dt, 'h:mm a')}</p>
                    {job.assignments.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {job.assignments.slice(0, 2).map((a) => (
                          <span
                            key={a.id}
                            style={{ backgroundColor: CLEANER_COLORS[a.cleanerColorIndex % CLEANER_COLORS.length] }}
                            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white text-[8px] font-bold shrink-0"
                          >
                            {a.cleanerName.charAt(0)}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day View ──────────────────────────────────────────────────────────────────

function DayView({
  currentDate,
  jobs,
  colorMode,
  onJobClick,
  onSlotClick,
}: {
  currentDate: Date
  jobs: CalendarJob[]
  colorMode: ColorMode
  onJobClick: (job: CalendarJob) => void
  onSlotClick: (date: Date) => void
}) {
  const dayJobs = jobs.filter((j) => isSameDay(parseISO(j.scheduledAt), currentDate))

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-[56px_1fr]" style={{ minHeight: HOUR_HEIGHT * HOURS.length }}>
        <div className="relative">
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-gray-100 pr-2 flex items-start justify-end">
              <span className="text-xs text-gray-400 -mt-2.5">{h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}</span>
            </div>
          ))}
        </div>
        <div className="relative border-l border-gray-200">
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT }}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                const d = new Date(currentDate)
                d.setHours(h, 0, 0, 0)
                onSlotClick(d)
              }}
            />
          ))}
          {dayJobs.map((job) => {
            const dt = parseISO(job.scheduledAt)
            const h = getHours(dt)
            const m = getMinutes(dt)
            const topOffset = (h - 7) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
            const height = Math.max((job.estimatedHours ?? 1) * HOUR_HEIGHT, 48)
            const bg = getJobColor(job, colorMode)
            const border = getJobBorder(job, colorMode)

            return (
              <button
                key={job.id}
                onClick={(e) => { e.stopPropagation(); onJobClick(job) }}
                style={{ top: topOffset, height, backgroundColor: bg, border }}
                className="absolute left-1 right-1 rounded px-2 py-1 text-sm text-left overflow-hidden hover:opacity-90 cursor-pointer z-10"
              >
                <p className="font-semibold text-gray-800">{job.clientName}</p>
                <p className="text-gray-600 text-xs">{format(dt, 'h:mm a')} · {job.serviceAddress}</p>
                {job.assignments.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {job.assignments.map((a) => a.cleanerName).join(', ')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main CalendarView ─────────────────────────────────────────────────────────

interface Props {
  jobs: CalendarJob[]
  cleaners: { id: string; name: string; colorIndex: number; availableDays: string[] }[]
  currentDate: string
  view: 'month' | 'week' | 'day'
  focusJobId: string | null
  maxJobsPerDay: number
  maxJobsPerCleaner: number
  blackoutDates: string[]
}

export default function CalendarView({
  jobs,
  cleaners,
  currentDate: currentDateStr,
  view: initialView,
  focusJobId,
  maxJobsPerDay,
  maxJobsPerCleaner,
  blackoutDates,
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  const [view, setView] = useState<'month' | 'week' | 'day'>(initialView)
  const [currentDate, setCurrentDate] = useState(parseISO(currentDateStr))
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('calColorMode') as ColorMode) ?? 'assignment'
    }
    return 'assignment'
  })
  const [selectedJob, setSelectedJob] = useState<CalendarJob | null>(() => {
    if (focusJobId) return jobs.find((j) => j.id === focusJobId) ?? null
    return null
  })

  useEffect(() => {
    localStorage.setItem('calColorMode', colorMode)
  }, [colorMode])

  function navigate(dir: 1 | -1) {
    let next: Date
    if (view === 'month') next = dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1)
    else if (view === 'week') next = dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1)
    else next = dir === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1)
    setCurrentDate(next)
    router.push(`/calendar?view=${view}&date=${format(next, 'yyyy-MM-dd')}`)
  }

  function handleViewChange(v: 'month' | 'week' | 'day', date?: Date) {
    const d = date ?? currentDate
    setView(v)
    setCurrentDate(d)
    router.push(`/calendar?view=${v}&date=${format(d, 'yyyy-MM-dd')}`)
  }

  function handleJobClick(job: CalendarJob) {
    setSelectedJob(job)
    router.push(`/calendar?view=${view}&date=${format(currentDate, 'yyyy-MM-dd')}&jobId=${job.id}`, { scroll: false })
  }

  function handleSlotClick(date: Date) {
    router.push(`/jobs/new?date=${format(date, 'yyyy-MM-dd')}&time=${format(date, 'HH:mm')}`)
  }

  function handleDayClick(date: Date) {
    handleViewChange('day', date)
  }

  function closeSlideOut() {
    setSelectedJob(null)
    router.push(`/calendar?view=${view}&date=${format(currentDate, 'yyyy-MM-dd')}`, { scroll: false })
  }

  const headerTitle =
    view === 'month' ? format(currentDate, 'MMMM yyyy')
    : view === 'week'
      ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d, yyyy')}`
      : format(currentDate, 'EEEE, MMMM d, yyyy')

  const colorModes: { key: ColorMode; label: string }[] = [
    { key: 'assignment', label: 'By Cleaner' },
    { key: 'status', label: 'By Status' },
    { key: 'recurrence', label: 'By Recurrence' },
    { key: 'invoice', label: 'By Invoice' },
  ]

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        {/* Nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setCurrentDate(new Date()); router.push(`/calendar?view=${view}&date=${format(new Date(), 'yyyy-MM-dd')}`) }}
            className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
          >
            Today
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900 ml-2">{headerTitle}</span>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              className={`px-3 py-1.5 ${view === v ? 'bg-brand-navy text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Color mode */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
          {colorModes.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setColorMode(key)}
              className={`px-2.5 py-1.5 ${colorMode === key ? 'bg-brand-navy text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Cleaner legend — assignment mode only */}
        {colorMode === 'assignment' && (
          <div className="flex flex-wrap gap-2">
            {cleaners.map((c) => (
              <span key={c.id} className="flex items-center gap-1 text-xs text-gray-600">
                <span
                  style={{ backgroundColor: CLEANER_COLORS[c.colorIndex % CLEANER_COLORS.length] }}
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                />
                {c.name}
              </span>
            ))}
          </div>
        )}

        <div className="ml-auto">
          <Link
            href={`/jobs/new?date=${format(currentDate, 'yyyy-MM-dd')}`}
            className="px-4 py-1.5 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-navy-dark transition-colors"
          >
            + New Job
          </Link>
        </div>
      </div>

      {/* Calendar body + slide-out */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className={`flex flex-col flex-1 min-h-0 transition-all duration-200 ${selectedJob ? 'lg:w-[58%]' : 'w-full'}`}>
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              jobs={jobs}
              colorMode={colorMode}
              onJobClick={handleJobClick}
              onDayClick={handleDayClick}
              onViewChange={handleViewChange}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              jobs={jobs}
              colorMode={colorMode}
              onJobClick={handleJobClick}
              onSlotClick={handleSlotClick}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              jobs={jobs}
              colorMode={colorMode}
              onJobClick={handleJobClick}
              onSlotClick={handleSlotClick}
            />
          )}
        </div>

        {/* Slide-out panel */}
        {selectedJob && (
          <div className="fixed inset-0 z-40 lg:static lg:inset-auto lg:w-[42%] lg:border-l lg:border-gray-200 flex flex-col bg-white shadow-2xl lg:shadow-none overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <p className="text-sm font-semibold text-gray-700">Job Detail</p>
              <button onClick={closeSlideOut} className="p-1.5 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <JobSlideOut
                job={selectedJob}
                cleaners={cleaners}
                maxJobsPerCleaner={maxJobsPerCleaner}
                onClose={closeSlideOut}
                onJobUpdate={(updated) => setSelectedJob(updated)}
              />
            </div>
          </div>
        )}
        {/* Mobile overlay backdrop */}
        {selectedJob && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={closeSlideOut} />
        )}
      </div>
    </div>
  )
}
