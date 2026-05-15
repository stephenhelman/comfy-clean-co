import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { inviteUser } from '../actions'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata = { title: 'Invite User' }

const ROLES_LIST = [
  'owner', 'manager', 'bookkeeper', 'dispatcher', 'viewer',
] as const

export default async function InviteUserPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const ownerExists = (await db.adminUser.count({ where: { role: 'owner', active: true } })) > 0

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Users
        </Link>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          Invite a User
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">They will receive an email to set their password and activate their account.</p>
      </div>

      <form action={inviteUser} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Jane Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="jane@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {ROLES_LIST.map((role, i) => {
              const disabled = role === 'owner' && ownerExists
              return (
                <label
                  key={role}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    disabled
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-brand-teal hover:bg-teal-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    disabled={disabled}
                    defaultChecked={i === 0 && !ownerExists || (i === 1 && ownerExists)}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {ROLE_LABELS[role]}
                      {disabled && <span className="ml-2 text-xs font-normal text-gray-400">(Active Owner exists)</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[role as Role]}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-brand-navy text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Send Invitation
          </button>
          <Link
            href="/users"
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
