import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { ROLE_LABELS } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { format } from 'date-fns'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import UserDetailActions from '@/components/admin/users/UserDetailActions'

export const metadata = { title: 'User' }

interface Props {
  params: Promise<{ id: string }>
}

function StatusBadge({ active, deactivatedAt, inviteToken }: { active: boolean; deactivatedAt: Date | null; inviteToken: string | null }) {
  if (active) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Active</span>
  if (deactivatedAt) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">Inactive</span>
  if (inviteToken) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
  return null
}

export default async function UserDetailPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params
  const user = await db.adminUser.findUnique({ where: { id } })
  if (!user) notFound()

  const isOwnProfile = session.user.id === user.id
  const ownerExists = (await db.adminUser.count({ where: { role: 'owner', active: true } })) > 0

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Users
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
            {user.name}
          </h1>
          <StatusBadge active={user.active} deactivatedAt={user.deactivatedAt} inviteToken={user.inviteToken} />
          {isOwnProfile && (
            <span className="text-xs text-gray-400 font-medium">(you)</span>
          )}
        </div>
      </div>

      {/* Identity card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account Info</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Email</dt>
            <dd className="text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Current Role</dt>
            <dd className="text-gray-900">{ROLE_LABELS[user.role as Role] ?? user.role}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Invited By</dt>
            <dd className="text-gray-900">{user.invitedBy ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Invited</dt>
            <dd className="text-gray-900">{user.invitedAt ? format(new Date(user.invitedAt), 'MMM d, yyyy') : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Activated</dt>
            <dd className="text-gray-900">{user.acceptedAt ? format(new Date(user.acceptedAt), 'MMM d, yyyy') : '—'}</dd>
          </div>
          {user.deactivatedAt && (
            <div>
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Deactivated</dt>
              <dd className="text-gray-900">
                {format(new Date(user.deactivatedAt), 'MMM d, yyyy')}
                {user.deactivatedBy && <span className="text-gray-500"> by {user.deactivatedBy}</span>}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <UserDetailActions
        userId={user.id}
        currentRole={user.role}
        isOwnProfile={isOwnProfile}
        ownerExists={ownerExists}
        isActive={user.active}
        isDeactivated={!!user.deactivatedAt && !user.active}
        userName={user.name}
      />
    </div>
  )
}
