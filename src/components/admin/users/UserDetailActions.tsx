'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { updateRole, deactivateUser, reactivateUser } from '@/app/(admin)/users/actions'

const ROLES_LIST = ['owner', 'manager', 'bookkeeper', 'dispatcher', 'viewer'] as const

interface Props {
  userId: string
  currentRole: string
  isOwnProfile: boolean
  ownerExists: boolean
  isActive: boolean
  isDeactivated: boolean
  userName: string
}

export default function UserDetailActions({
  userId,
  currentRole,
  isOwnProfile,
  ownerExists,
  isActive,
  isDeactivated,
  userName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleSaved, setRoleSaved] = useState(false)

  function handleRoleSubmit(formData: FormData) {
    setError(null)
    setRoleSaved(false)
    startTransition(async () => {
      try {
        await updateRole(userId, formData)
        setRoleSaved(true)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update role')
      }
    })
  }

  function handleDeactivate() {
    setError(null)
    startTransition(async () => {
      try {
        await deactivateUser(userId)
        setShowDeactivateConfirm(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to deactivate user')
        setShowDeactivateConfirm(false)
      }
    })
  }

  function handleReactivate() {
    setError(null)
    startTransition(async () => {
      try {
        await reactivateUser(userId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to reactivate user')
      }
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {roleSaved && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          Role updated. {userName} will see their new permissions on their next login.
        </div>
      )}

      {/* Role change */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Role</h2>

        {isOwnProfile ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            You cannot change your own role.
          </div>
        ) : (
          <form action={handleRoleSubmit}>
            <div className="space-y-2 mb-4">
              {ROLES_LIST.map((role) => {
                const disabledOwner = role === 'owner' && ownerExists && currentRole !== 'owner'
                return (
                  <label
                    key={role}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      disabledOwner
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-brand-teal hover:bg-teal-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      disabled={disabledOwner}
                      defaultChecked={role === currentRole}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {ROLE_LABELS[role as Role]}
                        {disabledOwner && <span className="ml-2 text-xs font-normal text-gray-400">(Active Owner exists)</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[role as Role]}</p>
                    </div>
                  </label>
                )
              })}
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="bg-brand-navy text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save Role'}
            </button>
          </form>
        )}
      </section>

      {/* Deactivate / Reactivate */}
      {!isOwnProfile && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Account Status</h2>

          {isDeactivated ? (
            <>
              <p className="text-sm text-gray-500 mb-4">This account is deactivated. Reactivating will send a new invite email.</p>
              <button
                onClick={handleReactivate}
                disabled={isPending}
                className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Reactivating…' : 'Reactivate User'}
              </button>
            </>
          ) : isActive ? (
            <>
              <p className="text-sm text-gray-500 mb-4">Deactivating this account will immediately revoke access.</p>
              <button
                onClick={() => setShowDeactivateConfirm(true)}
                disabled={isPending}
                className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Deactivate User
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">This user has a pending invitation and has not yet activated their account.</p>
          )}
        </section>
      )}

      {/* Deactivate confirmation modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">Deactivate {userName}?</h3>
            <p className="text-sm text-gray-600 mb-5">
              They will immediately lose access to the admin portal. This action can be reversed by reactivating the account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeactivate}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Deactivating…' : 'Yes, Deactivate'}
              </button>
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
