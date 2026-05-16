import { verifyCleanerSession } from '@/lib/cleanerAuth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { subDays, addDays, startOfDay, endOfDay } from 'date-fns'
import CalendarClient from '@/components/time/CalendarClient'
import BottomNav from '@/components/time/BottomNav'
import InstallPrompt from '@/components/time/InstallPrompt'

export default async function SchedulePage() {
  // PC-20: verifyCleanerSession called exactly once
  const session = await verifyCleanerSession()
  if (!session) redirect('/pin')

  const today = new Date()
  const rangeStart = startOfDay(subDays(today, 30))
  const rangeEnd = endOfDay(addDays(today, 30))

  const assignments = await db.jobAssignment.findMany({
    where: {
      cleanerId: session.cleanerId,
      job: {
        scheduledAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        status: {
          not: 'stand_by',
        },
      },
    },
    include: {
      job: {
        include: {
          client: {
            select: {
              name: true,
              defaultAddress: true,
              defaultCity: true,
              defaultZip: true,
            },
          },
        },
      },
    },
    orderBy: {
      job: { scheduledAt: 'asc' },
    },
  })

  return (
    <>
      <main className="flex flex-col flex-1 min-h-0 pb-16">
        <CalendarClient
          assignments={assignments}
          today={today.toISOString()}
          rangeStart={rangeStart.toISOString()}
          rangeEnd={rangeEnd.toISOString()}
        />
      </main>
      <BottomNav />
      <InstallPrompt />
    </>
  )
}
