import { Suspense } from 'react'
import { StatusCards, StatusCardsSkeleton } from '@/components/admin/dashboard/StatusCards'
import { TodaySchedule, TodayScheduleSkeleton } from '@/components/admin/dashboard/TodaySchedule'
import { FinancialSnapshot, FinancialSnapshotSkeleton } from '@/components/admin/dashboard/FinancialSnapshot'
import { AlertsPanel } from '@/components/admin/dashboard/AlertsPanel'
import { ActivityFeed, ActivityFeedSkeleton } from '@/components/admin/dashboard/ActivityFeed'

export const metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Status cards */}
          <Suspense fallback={<StatusCardsSkeleton />}>
            <StatusCards />
          </Suspense>

          {/* Today's schedule */}
          <Suspense fallback={<TodayScheduleSkeleton />}>
            <TodaySchedule />
          </Suspense>

          {/* Financial snapshot */}
          <Suspense fallback={<FinancialSnapshotSkeleton />}>
            <FinancialSnapshot />
          </Suspense>

          {/* Alerts — hidden entirely when no alerts */}
          <Suspense>
            <AlertsPanel />
          </Suspense>
        </div>

        {/* Activity feed sidebar */}
        <Suspense fallback={<ActivityFeedSkeleton />}>
          <ActivityFeed />
        </Suspense>
      </div>
    </div>
  )
}
