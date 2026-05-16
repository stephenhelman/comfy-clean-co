'use server'

import { verifyCleanerPin } from '@/lib/cleanerAuth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function submitPin(
  cleanerId: string,
  pin: string,
  rememberMe: boolean
) {
  const headersList = await headers()
  const deviceHint = headersList.get('user-agent') ?? undefined

  const result = await verifyCleanerPin(cleanerId, pin, rememberMe, deviceHint)

  if (result.success) {
    redirect('/home')
  }

  return {
    error: result.error,
    locked: result.locked ?? false,
  }
}
