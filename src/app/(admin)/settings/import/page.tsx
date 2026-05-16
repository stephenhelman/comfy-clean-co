'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, CheckCircle, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import {
  importCleaners, importClients, importJobs, importAssignments,
  type CleanerPreviewRow, type ClientPreviewRow, type JobPreviewRow,
  type AssignmentPreviewRow, type ImportResult,
} from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type StepKey = 'cleaners' | 'clients' | 'jobs' | 'assignments'

interface StepState {
  file: File | null
  contactFile: File | null // only for jobs step (needs contact CSV too)
  status: 'idle' | 'previewing' | 'previewed' | 'importing' | 'done' | 'error'
  result: ImportResult<CleanerPreviewRow | ClientPreviewRow | JobPreviewRow | AssignmentPreviewRow> | null
  error: string | null
  committed: boolean
}

const STEPS: { key: StepKey; label: string; file: string; hint?: string }[] = [
  { key: 'cleaners', label: 'Step 1 — Cleaners', file: 'UserDataExport CSV' },
  { key: 'clients', label: 'Step 2 — Clients', file: 'ContactDataExport CSV' },
  { key: 'jobs', label: 'Step 3 — Appointments', file: 'AppointmentDataExport CSV', hint: 'Also requires the ContactDataExport CSV for revenue data' },
  { key: 'assignments', label: 'Step 4 — Assignments', file: 'AssignmentDataExport CSV' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ steps }: { steps: Record<StepKey, StepState> }) {
  const committed = (key: StepKey) => steps[key].committed
  const count = (key: StepKey) =>
    steps[key].result?.willCreate ?? 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Import Progress</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: 'cleaners' as StepKey, label: 'Cleaners' },
          { key: 'clients' as StepKey, label: 'Clients' },
          { key: 'jobs' as StepKey, label: 'Jobs' },
          { key: 'assignments' as StepKey, label: 'Assignments' },
        ].map(({ key, label }) => (
          <div key={key} className={`rounded-lg border px-4 py-3 ${committed(key) ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
            <p className="text-xs text-gray-500">{label} imported</p>
            <p className={`text-xl font-bold ${committed(key) ? 'text-green-700' : 'text-gray-400'}`}>
              {committed(key) ? count(key) : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Preview tables ───────────────────────────────────────────────────────────

function PreviewTable({ stepKey, result }: {
  stepKey: StepKey
  result: ImportResult<CleanerPreviewRow | ClientPreviewRow | JobPreviewRow | AssignmentPreviewRow>
}) {
  const { preview, willCreate, willSkip, warnings } = result

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-4 text-sm">
        <span className="text-green-700 font-medium">{willCreate} will be created</span>
        <span className="text-gray-500">{willSkip} will be skipped</span>
        {warnings.length > 0 && (
          <span className="text-amber-600 font-medium">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800 flex gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            {stepKey === 'cleaners' && (
              <tr>
                {['Name', 'Email', 'Status', 'Rate', 'PIN (plain)', 'Action'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            )}
            {stepKey === 'clients' && (
              <tr>
                {['Name', 'Phone', 'Address', 'Frequency', 'Action'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            )}
            {stepKey === 'jobs' && (
              <tr>
                {['Date', 'Client', 'Price', 'Status', 'Inferred Payment', 'Action'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            )}
            {stepKey === 'assignments' && (
              <tr>
                {['Cleaner', 'Client', 'Date', 'Duration', 'Clock In', 'Clock Out', 'Action'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stepKey === 'cleaners' && (preview as unknown as CleanerPreviewRow[]).slice(0, 200).map((r, i) => (
              <tr key={i} className={r.action === 'SKIP' ? 'bg-gray-50 text-gray-400' : ''}>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">${r.rate}/hr</td>
                <td className="px-3 py-2 font-mono">{r.pin || '—'}</td>
                <td className="px-3 py-2">
                  <ActionBadge action={r.action} reason={r.skipReason} />
                </td>
              </tr>
            ))}
            {stepKey === 'clients' && (preview as unknown as ClientPreviewRow[]).slice(0, 200).map((r, i) => (
              <tr key={i} className={r.action === 'SKIP' ? 'bg-gray-50 text-gray-400' : r.warning ? 'bg-amber-50' : ''}>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.phone || '—'}</td>
                <td className="px-3 py-2">{r.address || '—'}</td>
                <td className="px-3 py-2">{r.frequency ?? '—'}</td>
                <td className="px-3 py-2">
                  <ActionBadge action={r.action} reason={r.skipReason} />
                  {r.warning && <span className="ml-1 text-amber-600">⚠</span>}
                </td>
              </tr>
            ))}
            {stepKey === 'jobs' && (preview as unknown as JobPreviewRow[]).slice(0, 200).map((r, i) => (
              <tr key={i} className={r.action === 'SKIP' ? 'bg-gray-50 text-gray-400' : r.warning ? 'bg-amber-50' : ''}>
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2">{r.client}</td>
                <td className="px-3 py-2">${r.price}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.paymentInferred || '—'}</td>
                <td className="px-3 py-2">
                  <ActionBadge action={r.action} reason={r.skipReason} />
                </td>
              </tr>
            ))}
            {stepKey === 'assignments' && (preview as unknown as AssignmentPreviewRow[]).slice(0, 200).map((r, i) => (
              <tr key={i} className={r.action === 'SKIP' ? 'bg-gray-50 text-gray-400' : r.warning ? 'bg-amber-50' : ''}>
                <td className="px-3 py-2">{r.cleanerName}</td>
                <td className="px-3 py-2">{r.clientName}</td>
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2">{r.duration}</td>
                <td className="px-3 py-2">{r.clockIn}</td>
                <td className="px-3 py-2">{r.clockOut}</td>
                <td className="px-3 py-2">
                  <ActionBadge action={r.action} reason={r.skipReason} />
                  {r.warning && <span className="ml-1 text-amber-600">⚠</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {preview.length > 200 && (
          <p className="text-xs text-gray-500 px-3 py-2 border-t border-gray-100">
            Showing first 200 of {preview.length} rows
          </p>
        )}
      </div>
    </div>
  )
}

function ActionBadge({ action, reason }: { action: 'CREATE' | 'SKIP'; reason?: string }) {
  if (action === 'CREATE') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">CREATE</span>
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      SKIP{reason ? ` — ${reason}` : ''}
    </span>
  )
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  step, stepKey, state, isUnlocked, onStateChange,
}: {
  step: typeof STEPS[number]
  stepKey: StepKey
  state: StepState
  isUnlocked: boolean
  onStateChange: (update: Partial<StepState>) => void
}) {
  const [, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const contactFileRef = useRef<HTMLInputElement>(null)

  const isJobsStep = stepKey === 'jobs'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onStateChange({ file, status: 'idle', result: null, error: null })
  }

  function handleContactFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onStateChange({ contactFile: file, status: 'idle', result: null, error: null })
  }

  function handlePreview() {
    if (!state.file) return
    if (isJobsStep && !state.contactFile) return

    startTransition(async () => {
      onStateChange({ status: 'previewing', error: null })
      try {
        const csv = await readFile(state.file!)
        let result

        if (stepKey === 'cleaners') {
          result = await importCleaners(csv, true)
        } else if (stepKey === 'clients') {
          result = await importClients(csv, true)
        } else if (stepKey === 'jobs') {
          const contactCsv = await readFile(state.contactFile!)
          result = await importJobs(csv, contactCsv, true)
        } else {
          result = await importAssignments(csv, true)
        }

        onStateChange({ status: 'previewed', result })
      } catch (err) {
        onStateChange({ status: 'error', error: String(err) })
      }
    })
  }

  function handleImport() {
    if (!state.file || !state.result) return
    if (isJobsStep && !state.contactFile) return

    startTransition(async () => {
      onStateChange({ status: 'importing', error: null })
      try {
        const csv = await readFile(state.file!)
        let result

        if (stepKey === 'cleaners') {
          result = await importCleaners(csv, false)
        } else if (stepKey === 'clients') {
          result = await importClients(csv, false)
        } else if (stepKey === 'jobs') {
          const contactCsv = await readFile(state.contactFile!)
          result = await importJobs(csv, contactCsv, false)
        } else {
          result = await importAssignments(csv, false)
        }

        onStateChange({ status: 'done', result, committed: true })
      } catch (err) {
        onStateChange({ status: 'importing', error: String(err) })
      }
    })
  }

  const isLoading = state.status === 'previewing' || state.status === 'importing'
  const canPreview = !!state.file && (!isJobsStep || !!state.contactFile) && !isLoading && isUnlocked
  const canImport = state.status === 'previewed' && state.result != null && !isLoading

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-opacity ${!isUnlocked ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">{step.label}</h3>
          <p className="text-xs text-gray-500">{step.file}</p>
        </div>
        {state.committed && (
          <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
            <CheckCircle className="w-4 h-4" />
            {state.result?.willCreate ?? 0} imported
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {!isUnlocked && (
          <p className="text-sm text-gray-400 italic">Complete the previous step first.</p>
        )}

        {isUnlocked && (
          <>
            {step.hint && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {step.hint}
              </p>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {isJobsStep ? 'Appointment CSV' : 'CSV File'}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  {state.file ? state.file.name : 'Choose file…'}
                </button>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            {isJobsStep && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Contact CSV (for revenue data)</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => contactFileRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Upload className="w-4 h-4 text-gray-400" />
                    {state.contactFile ? state.contactFile.name : 'Choose contact file…'}
                  </button>
                  <input ref={contactFileRef} type="file" accept=".csv" className="hidden" onChange={handleContactFileChange} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handlePreview}
                disabled={!canPreview}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {state.status === 'previewing' && <Loader2 className="w-4 h-4 animate-spin" />}
                Preview (dry run)
              </button>

              {state.status === 'previewed' && (
                <button
                  onClick={handleImport}
                  disabled={!canImport}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Import
                </button>
              )}

              {state.status === 'importing' && (
                <button disabled className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-navy text-white rounded-lg opacity-60">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing…
                </button>
              )}
            </div>

            {state.status === 'done' && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4" />
                Imported {state.result?.willCreate ?? 0} records successfully.
                {state.result?.willSkip ? ` ${state.result.willSkip} skipped (already imported).` : ''}
              </div>
            )}

            {state.error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Error: {state.error}
              </div>
            )}

            {state.result && (
              <PreviewTable stepKey={stepKey} result={state.result} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function makeStep(): StepState {
  return { file: null, contactFile: null, status: 'idle', result: null, error: null, committed: false }
}

export default function ImportPage() {
  const [steps, setSteps] = useState<Record<StepKey, StepState>>({
    cleaners: makeStep(),
    clients: makeStep(),
    jobs: makeStep(),
    assignments: makeStep(),
  })

  function updateStep(key: StepKey, update: Partial<StepState>) {
    setSteps(prev => ({ ...prev, [key]: { ...prev[key], ...update } }))
  }

  const cleanersDone = steps.cleaners.committed
  const clientsDone = steps.clients.committed
  const jobsDone = steps.jobs.committed

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/settings" className="hover:text-gray-700">Settings</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-800 font-medium">ZenMaid Import</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">ZenMaid Data Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          One-time migration tool. Complete each step in order — cleaners must be imported before clients, clients before jobs, jobs before assignments.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <p className="text-sm font-medium text-amber-800">Before you start</p>
        <ul className="mt-1 text-xs text-amber-700 space-y-0.5 list-disc list-inside">
          <li>Use the Preview (dry run) button first — it shows exactly what will be created without writing anything.</li>
          <li>PINs are only shown in the dry run preview — copy them before committing.</li>
          <li>Re-uploading the same CSV is safe — duplicates are automatically skipped.</li>
          <li>No invoices are created for imported jobs.</li>
        </ul>
      </div>

      <SummaryBar steps={steps} />

      <div className="space-y-4">
        {STEPS.map((step, idx) => {
          const isUnlocked =
            idx === 0 ? true :
            idx === 1 ? cleanersDone :
            idx === 2 ? clientsDone :
            jobsDone

          return (
            <StepCard
              key={step.key}
              step={step}
              stepKey={step.key}
              state={steps[step.key]}
              isUnlocked={isUnlocked}
              onStateChange={update => updateStep(step.key, update)}
            />
          )
        })}
      </div>
    </div>
  )
}
