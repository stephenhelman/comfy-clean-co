import { verifyCleanerSession } from '@/lib/cleanerAuth'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/time/BottomNav'
import InstallPrompt from '@/components/time/InstallPrompt'

export default async function CalendarPage() {
  const session = await verifyCleanerSession()
  if (!session) redirect('/pin')

  return (
    <>
      <main className="flex-1 overflow-y-auto pb-20 p-4">
        <h1 className="text-xl font-semibold text-gray-900">Schedule</h1>
        <p className="text-gray-500 mt-2">Portal Phase 3 — coming soon</p>
      </main>
      <BottomNav />
      <InstallPrompt />
    </>
  )
}
