import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import LeadActions from '@/components/admin/leads/LeadActions'
import AdminNotesEditor from '@/components/admin/leads/AdminNotesEditor'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', quote_sent: 'Quote Sent', converted: 'Converted', lost: 'Lost',
}
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-amber-100 text-amber-700',
  quote_sent: 'bg-purple-100 text-purple-700', converted: 'bg-green-100 text-green-700',
  lost: 'bg-gray-100 text-gray-500',
}
const PIPELINE = ['new', 'contacted', 'quote_sent', 'converted']

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-32 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 flex-1">{value}</dd>
    </div>
  )
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params
  const lead = await db.leadInquiry.findUnique({ where: { id } })
  if (!lead) notFound()

  // Check for existing client match (from adminNotes flag or direct query)
  const existingClientMatch = lead.adminNotes?.match(/\/clients\/([a-z0-9]+)/)
  const existingClientId = existingClientMatch?.[1]
  const existingClient = existingClientId
    ? await db.client.findUnique({ where: { id: existingClientId }, select: { id: true, name: true } })
    : null

  const currentStepIndex = PIPELINE.indexOf(lead.status)

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
              {lead.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Received {format(new Date(lead.createdAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABELS[lead.status] ?? lead.status}
          </span>
        </div>
      </div>

      {/* Existing client match banner */}
      {existingClient && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-3">
          <span className="font-semibold">⚠️ This contact matches existing client:</span>
          <Link href={`/clients/${existingClient.id}`} className="underline font-medium">{existingClient.name}</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Lead info + Admin notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Submitted information */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Submitted Information</h2>
            <dl>
              <Row label="Name" value={lead.name} />
              <Row label="Email" value={lead.email} />
              <Row label="Phone" value={lead.phone} />
              <Row label="Type" value={lead.type === 'residential' ? 'Residential' : 'Commercial'} />
              <Row label="Frequency" value={lead.frequency === 'one-time' ? 'One-Time' : 'Recurring'} />
              <Row label="Preferred Day" value={lead.preferredDay ?? undefined} />
              <Row label="Preferred Time" value={lead.preferredTime ?? undefined} />
              <Row label="Source" value={lead.source?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? undefined} />
              <Row label="Notes" value={lead.notes ?? undefined} />
            </dl>
          </div>

          {/* Admin notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <AdminNotesEditor
              leadId={lead.id}
              initialNotes={lead.adminNotes}
              updatedAt={lead.updatedAt}
            />
          </div>
        </div>

        {/* Right — Pipeline + Actions */}
        <div className="space-y-4">
          {/* Pipeline progress */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Pipeline</h2>

            {lead.status === 'lost' ? (
              <div className="text-sm text-gray-500 space-y-2">
                <p className="text-red-600 font-medium">Lost</p>
                {lead.lostReason && <p className="text-xs text-gray-500">Reason: {lead.lostReason.replace(/_/g, ' ')}</p>}
                {lead.lostAt && <p className="text-xs text-gray-400">{format(new Date(lead.lostAt), 'MMM d, yyyy')}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {PIPELINE.map((step, i) => {
                  const isCompleted = i < currentStepIndex
                  const isCurrent = i === currentStepIndex
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        isCompleted ? 'bg-brand-green text-white' :
                        isCurrent ? 'bg-brand-navy text-white' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? '✓' : i + 1}
                      </div>
                      <span className={`text-sm ${isCurrent ? 'font-semibold text-gray-900' : isCompleted ? 'text-gray-500 line-through' : 'text-gray-400'}`}>
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Timestamps */}
            {(lead.contactedAt || lead.convertedAt || lead.lostAt) && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
                {lead.contactedAt && <p>Contacted: {format(new Date(lead.contactedAt), 'MMM d, h:mm a')}</p>}
                {lead.contactedBy && <p>By: {lead.contactedBy}</p>}
                {lead.convertedAt && <p>Converted: {format(new Date(lead.convertedAt), 'MMM d, h:mm a')}</p>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Actions</h2>
            <LeadActions lead={{
              id: lead.id,
              name: lead.name,
              email: lead.email ?? '',
              phone: lead.phone,
              type: lead.type,
              frequency: lead.frequency,
              status: lead.status,
              clientId: lead.clientId,
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
