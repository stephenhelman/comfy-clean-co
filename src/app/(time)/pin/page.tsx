import { db } from '@/lib/db'
import PinEntry from '@/components/time/PinEntry'

export default async function PinPage() {
  const cleaners = await db.cleaner.findMany({
    where: { active: true },
    select: { id: true, name: true, colorIndex: true },
    orderBy: { name: 'asc' },
  })

  return <PinEntry cleaners={cleaners} />
}
