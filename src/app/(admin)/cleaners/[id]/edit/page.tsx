import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import CleanerForm from '@/components/admin/cleaners/CleanerForm'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const cleaner = await db.cleaner.findUnique({ where: { id }, select: { name: true } })
  return { title: cleaner ? `Edit ${cleaner.name}` : 'Edit Cleaner' }
}

export default async function EditCleanerPage({ params }: Props) {
  const { id } = await params
  const cleaner = await db.cleaner.findUnique({ where: { id } })
  if (!cleaner) notFound()

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <Link href={`/cleaners/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to {cleaner.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          Edit {cleaner.name}
        </h1>
      </div>
      <CleanerForm cleaner={cleaner} />
    </div>
  )
}
