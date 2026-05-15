import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Permission, Role } from '@/lib/permissions'

export async function requirePermission(permission: Permission): Promise<void> {
  const session = await auth()
  if (!session?.user?.role) throw new Error('Unauthorized — not authenticated')
  if (!hasPermission(session.user.role as Role, permission)) {
    throw new Error(`Unauthorized — role '${session.user.role}' cannot perform '${permission}'`)
  }
}
