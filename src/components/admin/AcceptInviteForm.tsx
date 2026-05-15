'use client'

import { useState, useTransition } from 'react'
import { acceptInvite } from '@/app/(admin)/users/actions'

interface Props {
  token: string
  defaultName: string
}

export default function AcceptInviteForm({ token, defaultName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await acceptInvite(token, formData)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
          Your Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultName}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
        />
        <ul className="mt-2 space-y-1">
          {[
            { key: 'length' as const,    label: 'At least 8 characters' },
            { key: 'uppercase' as const, label: 'At least one uppercase letter' },
            { key: 'number' as const,    label: 'At least one number' },
          ].map(({ key, label }) => (
            <li key={key} className={`flex items-center gap-1.5 text-xs ${checks[key] ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`inline-block w-3.5 h-3.5 rounded-full border ${checks[key] ? 'bg-green-500 border-green-500' : 'border-gray-300'} flex items-center justify-center shrink-0`}>
                {checks[key] && (
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 4l1.5 1.5 3-3" />
                  </svg>
                )}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-navy text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isPending ? 'Activating…' : 'Activate Account'}
      </button>
    </form>
  )
}
