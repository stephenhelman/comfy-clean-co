import { Suspense } from 'react'
import { db } from '@/lib/db'
import { ROLE_LABELS } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import AcceptInviteForm from '@/components/admin/AcceptInviteForm'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export const metadata = { title: 'Accept Invitation | Comfy Clean Co.' }

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <PageShell>
        <p className="text-sm text-gray-600 text-center">Invalid invitation link. Please ask your administrator to resend.</p>
      </PageShell>
    )
  }

  const user = await db.adminUser.findFirst({ where: { inviteToken: token } })

  if (!user) {
    return (
      <PageShell>
        <p className="text-sm text-red-600 text-center font-medium">This invite link is invalid or has already been used.</p>
        <p className="text-sm text-gray-500 text-center mt-1">Ask your administrator to send a new invitation.</p>
      </PageShell>
    )
  }

  if (!user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
    return (
      <PageShell>
        <p className="text-sm text-red-600 text-center font-medium">This invite link has expired.</p>
        <p className="text-sm text-gray-500 text-center mt-1">Ask your administrator to resend the invitation.</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-500">
          You've been invited as <span className="font-semibold text-brand-navy">{ROLE_LABELS[user.role as Role] ?? user.role}</span>
        </p>
        <p className="text-sm text-gray-500 mt-0.5">Set your password to activate your account.</p>
      </div>
      <Suspense>
        <AcceptInviteForm token={token} defaultName={user.name} />
      </Suspense>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-green rounded-xl mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: 'var(--font-poppins)' }}>
            Comfy Clean Co.
          </h1>
          <p className="text-sm text-gray-500 mt-1">Admin Portal Invitation</p>
        </div>
        {children}
      </div>
    </div>
  )
}
