import { db } from '@/lib/db'
import ClientForm from '@/components/admin/clients/ClientForm'

export const metadata = { title: 'New Client' }

export default async function NewClientPage() {
  const cleaners = await db.cleaner.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          New Client
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Add a new client to the system.</p>
      </div>
      <ClientForm cleaners={cleaners} />
    </div>
  )
}
