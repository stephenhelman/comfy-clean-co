'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

const JOB_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard', deep: 'Deep Clean', 'move-out': 'Move-Out',
}
const STATUS_LABELS: Record<string, string> = {
  stand_by: 'Stand-By', scheduled: 'Scheduled', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled', bump: 'Bumped', lock_out: 'Lock Out',
}
const STATUS_CHART_COLORS: Record<string, string> = {
  stand_by: '#8B5CF6', scheduled: '#3B82F6', in_progress: '#F59E0B',
  completed: '#10B981', cancelled: '#9CA3AF', bump: '#EAB308', lock_out: '#EF4444',
}
const CHART_COLORS = ['#2B5C78', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4']

const TABS = ['revenue', 'jobs', 'payroll', 'clients'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = {
  revenue: 'Revenue', jobs: 'Job Activity', payroll: 'Payroll', clients: 'Clients',
}
const TAB_PERMISSIONS: Record<Tab, string> = {
  revenue: 'reports.financial', jobs: 'reports.operations',
  payroll: 'reports.payroll', clients: 'reports.clients',
}

function StatCard({ label, value, sub, color = 'text-gray-900' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ExportButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} download
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 bg-white">
      <Download className="w-3.5 h-3.5 shrink-0" />
      {label}
    </a>
  )
}

interface RevenueData {
  totalRevenue: number
  totalOutstanding: number
  totalWrittenOff: number
  revenueByMonth: { month: string; revenue: number }[]
  revenueByType: { type: string; revenue: number; count: number }[]
  revenueByPayment: { method: string; revenue: number; count: number }[]
}

interface JobData {
  total: number
  jobsByStatus: { status: string; count: number }[]
  jobsByType: { type: string; count: number }[]
  completionRate: number
}

interface PayrollData {
  cleanerPayroll: { cleanerId: string; cleanerName: string; totalHours: number; totalLaborCost: number; jobCount: number }[]
  totalLaborCost: number
}

interface ClientData {
  totalActive: number
  newInPeriod: number
  topClients: { clientId: string; clientName: string; revenue: number; jobCount: number }[]
}

interface Props {
  role: Role
  fromDate: string
  toDate: string
  currentTab: string
  revenue: RevenueData
  jobs: JobData
  payroll: PayrollData
  clients: ClientData
}

export default function ReportsClient({ role, fromDate, toDate, currentTab, revenue, jobs, payroll, clients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localFrom, setLocalFrom] = useState(fromDate.slice(0, 10))
  const [localTo, setLocalTo] = useState(toDate.slice(0, 10))

  const tab = (TABS.includes(currentTab as Tab) ? currentTab : 'revenue') as Tab
  const canExport = hasPermission(role, 'reports.export')

  const exportBase = `/api/reports/export?from=${localFrom}&to=${localTo}`

  function navigate(overrides: Record<string, string>) {
    const p = new URLSearchParams({ from: localFrom, to: localTo, tab, ...overrides })
    startTransition(() => router.push(`/reports?${p.toString()}`))
  }

  function applyDates() {
    navigate({})
  }

  const visibleTabs = TABS.filter(t => hasPermission(role, TAB_PERMISSIONS[t] as Parameters<typeof hasPermission>[1]))

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 shrink-0 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>Reports</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={localFrom} onChange={e => setLocalFrom(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={localTo} onChange={e => setLocalTo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white" />
          <button onClick={applyDates} disabled={isPending}
            className="px-4 py-1.5 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50">
            Apply
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-gray-200 flex gap-0 shrink-0 overflow-x-auto">
        {visibleTabs.map(t => (
          <button key={t} onClick={() => navigate({ tab: t })}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              tab === t ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* ── Revenue Tab ─────────────────────────────────────────────────────── */}
        {tab === 'revenue' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Revenue Summary</h2>
              {canExport && (
                <ExportButton href={`${exportBase}&type=revenue`} label="Export Revenue CSV" />
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total Collected" value={`$${revenue.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="text-teal-700" />
              <StatCard label="Outstanding" value={`$${revenue.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="text-red-600" />
              <StatCard label="Written Off" value={`$${revenue.totalWrittenOff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="text-gray-500" />
            </div>

            {revenue.revenueByMonth.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Month</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenue.revenueByMonth} barSize={36}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#2B5C78" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {revenue.revenueByType.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Revenue by Job Type</h3>
                  <div className="space-y-2">
                    {revenue.revenueByType.map(r => (
                      <div key={r.type} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{JOB_TYPE_LABELS[r.type] ?? r.type}</span>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">${r.revenue.toFixed(2)}</span>
                          <span className="text-xs text-gray-400 ml-2">({r.count} jobs)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {revenue.revenueByPayment.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Revenue by Payment Method</h3>
                  <div className="space-y-2">
                    {revenue.revenueByPayment.map(r => (
                      <div key={r.method} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 capitalize">{r.method}</span>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">${r.revenue.toFixed(2)}</span>
                          <span className="text-xs text-gray-400 ml-2">({r.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Jobs Tab ─────────────────────────────────────────────────────────── */}
        {tab === 'jobs' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Activity</h2>
              {canExport && (
                <ExportButton href={`${exportBase}&type=jobs`} label="Export Jobs CSV" />
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total Jobs" value={String(jobs.total)} />
              <StatCard
                label="Completion Rate"
                value={`${jobs.completionRate.toFixed(1)}%`}
                color={jobs.completionRate >= 80 ? 'text-teal-700' : 'text-amber-600'}
              />
              <StatCard
                label="Completed"
                value={String(jobs.jobsByStatus.find(s => s.status === 'completed')?.count ?? 0)}
                sub={`of ${jobs.total} jobs`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {jobs.jobsByStatus.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Jobs by Status</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={jobs.jobsByStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                      >
                        {jobs.jobsByStatus.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status] ?? '#9CA3AF'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, name) => [v, STATUS_LABELS[String(name)] ?? String(name)]} />
                      <Legend formatter={(value) => STATUS_LABELS[value] ?? value} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {jobs.jobsByType.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Jobs by Type</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={jobs.jobsByType} layout="vertical" barSize={24}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }}
                        tickFormatter={v => JOB_TYPE_LABELS[v] ?? v} width={90} />
                      <Tooltip formatter={(v) => [v, 'Jobs']} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {jobs.jobsByType.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Payroll Tab ──────────────────────────────────────────────────────── */}
        {tab === 'payroll' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cleaner Payroll</h2>
              {canExport && (
                <ExportButton href={`${exportBase}&type=payroll`} label="Export Payroll CSV" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Total Labor Cost" value={`$${payroll.totalLaborCost.toFixed(2)}`} color="text-brand-navy" />
              <StatCard label="Active Cleaners" value={String(payroll.cleanerPayroll.length)} />
            </div>

            {payroll.cleanerPayroll.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <p>No completed clock-out records in this period.</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Hours by Cleaner</h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, payroll.cleanerPayroll.length * 48)}>
                    <BarChart data={payroll.cleanerPayroll} layout="vertical" barSize={22}>
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}h`} />
                      <YAxis type="category" dataKey="cleanerName" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v) => [`${v}h`, 'Hours']} />
                      <Bar dataKey="totalHours" radius={[0, 4, 4, 0]}>
                        {payroll.cleanerPayroll.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Cleaner</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Jobs</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Hours</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Labor Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payroll.cleanerPayroll.map(c => (
                        <tr key={c.cleanerId}>
                          <td className="px-4 py-3 font-medium text-gray-900">{c.cleanerName}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{c.jobCount}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{c.totalHours}h</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">${c.totalLaborCost.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-3 text-gray-900">Total</td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {payroll.cleanerPayroll.reduce((s, c) => s + c.jobCount, 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {payroll.cleanerPayroll.reduce((s, c) => s + c.totalHours, 0).toFixed(1)}h
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">${payroll.totalLaborCost.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Clients Tab ──────────────────────────────────────────────────────── */}
        {tab === 'clients' && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Client Summary</h2>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Active Clients" value={String(clients.totalActive)} />
              <StatCard label="New This Period" value={String(clients.newInPeriod)} color="text-teal-700" />
              <StatCard label="Top Clients (revenue)" value={String(clients.topClients.length)} sub="in period" />
            </div>

            {clients.topClients.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <p>No paid invoices in this period.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Top Clients by Revenue</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">#</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Client</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Jobs</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clients.topClients.map((c, i) => (
                      <tr key={c.clientId}>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <a href={`/clients/${c.clientId}`} className="font-medium text-gray-900 hover:text-brand-navy">
                            {c.clientName}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{c.jobCount}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">${c.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
