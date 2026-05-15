import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ROLE_LABELS } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { format } from 'date-fns'
import { resendInvite } from './actions'
import { UserPlus } from 'lucide-react'

export const metadata = { title: 'Users' }

interface Props {
  searchParams: Promise<{ status?: string; role?: string }>
}

function getStatus(user: { active: boolean; inviteToken: string | null; deactivatedAt: Date | null }) {
  if (user.active) return 'active'
  if (user.deactivatedAt) return 'inactive'
  return 'pending'
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner:      'bg-yellow-100 text-yellow-800 border-yellow-200',
    manager:    'bg-blue-100 text-blue-800 border-blue-200',
    bookkeeper: 'bg-green-100 text-green-800 border-green-200',
    dispatcher: 'bg-purple-100 text-purple-800 border-purple-200',
    viewer:     'bg-gray-100 text-gray-700 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[role] ?? colors.viewer}`}>
      {ROLE_LABELS[role as Role] ?? role}
    </span>
  )
}

function StatusBadge({ status }: { status: 'active' | 'pending' | 'inactive' }) {
  const styles = {
    active:   'bg-green-50 text-green-700 border-green-200',
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  }
  const labels = { active: 'Active', pending: 'Pending', inactive: 'Inactive' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default async function UsersPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const statusFilter = sp.status ?? 'all'
  const roleFilter = sp.role ?? 'all'

  const users = await db.adminUser.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
  })

  const filtered = users.filter((u) => {
    const status = getStatus(u)
    if (statusFilter !== 'all' && status !== statusFilter) return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    return true
  })

  const ROLES_LIST = ['owner', 'manager', 'bookkeeper', 'dispatcher', 'viewer'] as const

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
            Users
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} admin user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/users/invite"
          className="inline-flex items-center gap-2 bg-brand-navy text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex gap-1">
          {['all', 'active', 'pending', 'inactive'].map((s) => (
            <Link
              key={s}
              href={`/users?status=${s}&role=${roleFilter}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-brand-navy text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          <Link
            href={`/users?status=${statusFilter}&role=all`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              roleFilter === 'all'
                ? 'bg-brand-navy text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            All roles
          </Link>
          {ROLES_LIST.map((r) => (
            <Link
              key={r}
              href={`/users?status=${statusFilter}&role=${r}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-brand-navy text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {ROLE_LABELS[r]}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-400">No users match the selected filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invited By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Activated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user) => {
                const status = getStatus(user)
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                    <td className="px-4 py-3 text-gray-500">{user.invitedBy ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {user.acceptedAt ? format(new Date(user.acceptedAt), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {status === 'pending' && (
                          <form action={async () => { 'use server'; await resendInvite(user.id) }}>
                            <button
                              type="submit"
                              className="text-xs text-brand-teal font-medium hover:underline"
                            >
                              Resend Invite
                            </button>
                          </form>
                        )}
                        <Link
                          href={`/users/${user.id}`}
                          className="text-xs text-gray-500 font-medium hover:text-gray-900 transition-colors"
                        >
                          {user.id === session.user.id ? 'View' : 'Edit'}
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
