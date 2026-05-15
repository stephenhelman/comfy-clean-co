import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { StatusCards, StatusCardsSkeleton } from '@/components/admin/dashboard/StatusCards'
import { TodaySchedule, TodayScheduleSkeleton } from '@/components/admin/dashboard/TodaySchedule'
import { FinancialSnapshot, FinancialSnapshotSkeleton } from '@/components/admin/dashboard/FinancialSnapshot'
import { AlertsPanel } from '@/components/admin/dashboard/AlertsPanel'
import { ActivityFeed, ActivityFeedSkeleton } from '@/components/admin/dashboard/ActivityFeed'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user.role as Role) ?? 'viewer'

  const showFinancial = hasPermission(role, 'dashboard.financial')
  const showSchedule  = hasPermission(role, 'dashboard.schedule')

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
          <Suspense fallback={<StatusCardsSkeleton />}>
            <StatusCards role={role} />
          </Suspense>

          {showSchedule && (
            <Suspense fallback={<TodayScheduleSkeleton />}>
              <TodaySchedule />
            </Suspense>
          )}

          {showFinancial && (
            <Suspense fallback={<FinancialSnapshotSkeleton />}>
              <FinancialSnapshot />
            </Suspense>
          )}

          <Suspense>
            <AlertsPanel role={role} />
          </Suspense>
        </div>

        <Suspense fallback={<ActivityFeedSkeleton />}>
          <ActivityFeed role={role} />
        </Suspense>
      </div>
    </div>
  )
}
