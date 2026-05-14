import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import ClientForm from '@/components/admin/clients/ClientForm'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const client = await db.client.findUnique({ where: { id }, select: { name: true } })
  return { title: client ? `Edit ${client.name}` : 'Edit Client' }
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params

  const [client, cleaners] = await Promise.all([
    db.client.findUnique({ where: { id } }),
    db.cleaner.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!client) notFound()

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <Link href={`/clients/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to {client.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          Edit {client.name}
        </h1>
      </div>
      <ClientForm client={client} cleaners={cleaners} />
    </div>
  )
}
