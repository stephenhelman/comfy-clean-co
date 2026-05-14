'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { Loader2 } from 'lucide-react'
import type { CalendarJob } from '@/components/admin/calendar/CalendarView'

type ColorMode = 'assignment' | 'status' | 'recurrence' | 'invoice'

const EL_PASO_CENTER: [number, number] = [31.7619, -106.4850]
const ZOOM = 11

const CLEANER_COLORS = [
  '#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4',
  '#F97316','#84CC16','#EC4899','#14B8A6','#6366F1','#A78BFA',
]
const STATUS_COLORS: Record<string, string> = {
  stand_by: '#8B5CF6', scheduled: '#3B82F6', in_progress: '#F59E0B',
  completed: '#10B981', cancelled: '#9CA3AF', bump: '#EAB308', lock_out: '#EF4444',
}
const INVOICE_COLORS: Record<string, string> = {
  draft: '#9CA3AF', sent: '#F59E0B', pending: '#F97316', paid: '#14B8A6',
  overdue: '#EF4444', voided: '#9CA3AF', refunded: '#8B5CF6', partially_refunded: '#8B5CF6',
}
const JOB_STATUS_LABELS: Record<string, string> = {
  stand_by: 'Stand-By', scheduled: 'Scheduled', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled', bump: 'Bumped', lock_out: 'Lock Out',
}

interface Props {
  jobs: CalendarJob[]
  cleaners: { id: string; name: string; colorIndex: number; availableDays: string[] }[]
  onJobSelect: (job: CalendarJob) => void
  selectedJobId: string | null
}

function getJobColor(job: CalendarJob, mode: ColorMode): string {
  if (mode === 'status') return STATUS_COLORS[job.status] ?? '#9CA3AF'
  if (mode === 'invoice') return job.invoice ? (INVOICE_COLORS[job.invoice.status] ?? '#9CA3AF') : '#9CA3AF'
  if (mode === 'recurrence') return job.recurringRule ? '#8B5CF6' : '#3B82F6'
  // assignment
  if (job.assignments.length === 0) return '#EF4444'
  return CLEANER_COLORS[job.assignments[0].cleanerColorIndex % CLEANER_COLORS.length]
}

const COLOR_MODES: { key: ColorMode; label: string }[] = [
  { key: 'assignment', label: 'By Assignment' },
  { key: 'status', label: 'By Status' },
  { key: 'recurrence', label: 'By Recurrence' },
  { key: 'invoice', label: 'By Invoice' },
]

export default function JobsMap({ jobs, cleaners, onJobSelect, selectedJobId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').CircleMarker[]>([])
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('calColorMode') as ColorMode) ?? 'assignment'
    }
    return 'assignment'
  })
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number }>>({})
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState('')

  // Geocode addresses
  useEffect(() => {
    const needsGeocode = jobs.filter(j => !coords[j.id])
    if (needsGeocode.length === 0) return

    setGeocoding(true)
    setGeocodeError('')

    const addresses = needsGeocode.map(j => ({
      jobId: j.id,
      serviceAddress: j.serviceAddress,
      serviceCity: j.serviceCity,
      serviceZip: j.serviceZip,
    }))

    fetch('/api/jobs/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses }),
    })
      .then(r => r.json())
      .then((data: Record<string, { lat: number; lng: number }>) => {
        setCoords(prev => ({ ...prev, ...data }))
      })
      .catch(() => setGeocodeError('Failed to geocode some addresses.'))
      .finally(() => setGeocoding(false))
  // Only run when job IDs change — not on every coords update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.map(j => j.id).join(',')])

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    import('leaflet').then(L => {
      const map = L.map(mapRef.current!, { center: EL_PASO_CENTER, zoom: ZOOM })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      leafletMap.current = map
    })

    return () => {
      leafletMap.current?.remove()
      leafletMap.current = null
    }
  }, [])

  // Draw/update markers whenever coords or colorMode changes
  useEffect(() => {
    if (!leafletMap.current) return

    import('leaflet').then(L => {
      // Remove old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      for (const job of jobs) {
        const c = coords[job.id]
        if (!c) continue

        const color = getJobColor(job, colorMode)
        const isSelected = job.id === selectedJobId

        const marker = L.circleMarker([c.lat, c.lng], {
          radius: isSelected ? 10 : 7,
          fillColor: color,
          color: isSelected ? '#1E293B' : '#fff',
          weight: isSelected ? 2.5 : 1.5,
          fillOpacity: 0.9,
        })

        const dt = parseISO(job.scheduledAt)
        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:180px">
            <strong style="font-size:13px">${job.clientName}</strong><br/>
            <span style="font-size:11px;color:#6B7280">${format(dt, 'MMM d, h:mm a')}</span><br/>
            <span style="font-size:11px">${job.serviceAddress}</span><br/>
            <span style="font-size:11px;color:#6B7280">${JOB_STATUS_LABELS[job.status] ?? job.status}</span>
            ${job.assignments.map(a => `<br/><span style="font-size:11px">👤 ${a.cleanerName}</span>`).join('')}
          </div>
        `, { maxWidth: 240 })

        marker.on('click', () => {
          onJobSelect(job)
        })

        marker.addTo(leafletMap.current!)
        markersRef.current.push(marker)
      }
    })
  }, [coords, colorMode, selectedJobId, jobs, onJobSelect])

  // Assignment routing panel data
  const assignmentGroups = colorMode === 'assignment'
    ? cleaners.map(cleaner => ({
        cleaner,
        jobs: jobs.filter(j => j.assignments.some(a => a.cleanerId === cleaner.id) && coords[j.id]),
      })).filter(g => g.jobs.length > 0)
    : []

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Color mode + status */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex">
            {COLOR_MODES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setColorMode(key)
                  if (typeof window !== 'undefined') localStorage.setItem('calColorMode', key)
                }}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${colorMode === key ? 'bg-brand-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {geocoding && (
            <div className="bg-white rounded-lg shadow border border-gray-200 px-3 py-2 flex items-center gap-2 text-xs text-gray-600">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              Geocoding addresses…
            </div>
          )}
          {geocodeError && (
            <div className="bg-red-50 rounded-lg shadow border border-red-200 px-3 py-2 text-xs text-red-600">
              {geocodeError}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-3 z-[1000] bg-white rounded-xl shadow-md border border-gray-200 px-3 py-2 text-xs">
          {colorMode === 'assignment' && (
            <div className="space-y-1">
              {cleaners.filter(c => jobs.some(j => j.assignments.some(a => a.cleanerId === c.id))).map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CLEANER_COLORS[c.colorIndex % CLEANER_COLORS.length] }} />
                  {c.name}
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0 bg-red-500" />
                Unassigned
              </div>
            </div>
          )}
          {colorMode === 'status' && (
            <div className="space-y-1">
              {Object.entries(STATUS_COLORS).map(([s, color]) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {JOB_STATUS_LABELS[s] ?? s}
                </div>
              ))}
            </div>
          )}
          {colorMode === 'recurrence' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full shrink-0 bg-purple-500" />Recurring</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full shrink-0 bg-blue-500" />One-Time</div>
            </div>
          )}
          {colorMode === 'invoice' && (
            <div className="space-y-1">
              {Object.entries(INVOICE_COLORS).map(([s, color]) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {s.replace('_', ' ')}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assignment routing panel */}
      {colorMode === 'assignment' && assignmentGroups.length > 0 && (
        <div className="w-64 border-l border-gray-200 overflow-y-auto bg-white shrink-0">
          <div className="px-3 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Route by Cleaner</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {assignmentGroups.map(({ cleaner, jobs: cleanerJobs }) => (
              <div key={cleaner.id} className="px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CLEANER_COLORS[cleaner.colorIndex % CLEANER_COLORS.length] }} />
                  <span className="text-xs font-semibold text-gray-800">{cleaner.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{cleanerJobs.length} job{cleanerJobs.length !== 1 ? 's' : ''}</span>
                </div>
                <ol className="space-y-1 ml-5">
                  {cleanerJobs
                    .slice()
                    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                    .map((job, idx) => (
                      <li
                        key={job.id}
                        className="text-xs cursor-pointer hover:text-brand-navy"
                        onClick={() => onJobSelect(job)}
                      >
                        <span className="text-gray-400 mr-1">{idx + 1}.</span>
                        <span className="text-gray-700">{job.clientName}</span>
                        <span className="text-gray-400 ml-1">· {format(parseISO(job.scheduledAt), 'h:mm a')}</span>
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
