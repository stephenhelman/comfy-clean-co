import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json([], { status: 401 })

  const { clientId } = await params

  const addresses = await db.job.findMany({
    where: { clientId },
    select: { serviceAddress: true, serviceCity: true, serviceZip: true },
    distinct: ['serviceAddress'],
    orderBy: { scheduledAt: 'desc' },
    take: 5,
  })

  return NextResponse.json(addresses)
}
