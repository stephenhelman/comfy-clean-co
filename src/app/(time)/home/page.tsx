import { verifyCleanerSession } from '@/lib/cleanerAuth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { startOfDay, endOfDay } from 'date-fns'
import HomeClient from '@/components/time/HomeClient'
import BottomNav from '@/components/time/BottomNav'
import InstallPrompt from '@/components/time/InstallPrompt'

export default async function HomePage() {
  // PC-20: verifyCleanerSession called exactly once — result passed as props
  const session = await verifyCleanerSession()
  if (!session) redirect('/pin')

  const today = new Date()

  const assignments = await db.jobAssignment.findMany({
    where: {
      cleanerId: session.cleanerId,
      job: {
        scheduledAt: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
        status: {
          // PC-09: 'paid' included — shows as completed (green) same day
          in: ['scheduled', 'in_progress', 'completed', 'paid'],
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

  const activeAssignment = assignments.find(a => a.clockedInAt && !a.clockedOutAt)

  return (
    <>
      <main className="flex-1 overflow-y-auto pb-20">
        <HomeClient
          assignments={assignments}
          cleanerName={session.name}
          activeAssignmentId={activeAssignment?.id ?? null}
          now={today.toISOString()}
        />
      </main>
      <BottomNav />
      <InstallPrompt />
    </>
  )
}
