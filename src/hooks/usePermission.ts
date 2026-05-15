'use client'

import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'
import type { Permission, Role } from '@/lib/permissions'

export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession()
  if (!session?.user?.role) return false
  return hasPermission(session.user.role as Role, permission)
}
