import { verifyCleanerSession } from '@/lib/cleanerAuth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getPayPeriod, type PayPeriodFrequency } from '@/lib/payPeriod'
import HoursClient from '@/components/time/HoursClient'
import BottomNav from '@/components/time/BottomNav'
import InstallPrompt from '@/components/time/InstallPrompt'

interface Props {
  searchParams: Promise<{ period?: string }>
}

export default async function HoursPage({ searchParams }: Props) {
  // PC-20: verifyCleanerSession called exactly once
  const session = await verifyCleanerSession()
  if (!session) redirect('/pin')

  const params = await searchParams

  const settingsRaw = await db.businessSettings.findFirst({
    select: { payPeriodFrequency: true, payPeriodStartDay: true },
  })
  const payPeriodSettings = {
    payPeriodFrequency: (settingsRaw?.payPeriodFrequency ?? 'biweekly') as PayPeriodFrequency,
    payPeriodStartDay: settingsRaw?.payPeriodStartDay ?? 1,
  }

  // PC-17: track requested offset separately from clamped offset
  const requestedOffset = parseInt(params.period ?? '0')
  const showWallMessage = requestedOffset < -3
  const safeOffset = Math.max(-3, Math.min(0, requestedOffset))

  const period = getPayPeriod(payPeriodSettings, safeOffset)

  const assignments = await db.jobAssignment.findMany({
    where: {
      cleanerId: session.cleanerId,
      job: {
        scheduledAt: {
          gte: period.start,
          lte: period.end,
        },
      },
      clockedInAt: { not: null },
    },
    include: {
      job: {
        include: {
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { clockedInAt: 'desc' },
  })

  // Total from completed entries only (both in and out)
  const completedEntries = assignments.filter(a => a.clockedOutAt !== null)
  const totalMinutes = completedEntries.reduce((sum, a) => sum + (a.durationMins ?? 0), 0)

  return (
    <>
      <main className="flex flex-col flex-1 min-h-0 pb-16">
        <HoursClient
          assignments={assignments}
          period={period}
          currentOffset={safeOffset}
          totalMinutes={totalMinutes}
          jobCount={completedEntries.length}
          cleanerName={session.name}
          showWallMessage={showWallMessage}
          today={new Date().toISOString()}
        />
      </main>
      <BottomNav />
      <InstallPrompt />
    </>
  )
}
