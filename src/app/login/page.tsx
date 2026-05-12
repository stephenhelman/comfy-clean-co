import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/admin/LoginForm'

interface Props {
  searchParams: Promise<{ reason?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth()
  if (session?.user?.active) redirect('/dashboard')

  const { reason } = await searchParams

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
          <p className="text-sm text-gray-500 mt-1">Admin Portal</p>
        </div>

        {reason === 'deactivated' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Your account has been deactivated. Contact your administrator.
          </div>
        )}

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
