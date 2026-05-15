import { Suspense } from 'react'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CommunicationsClient from '@/components/admin/communications/CommunicationsClient'
import { subDays, startOfDay } from 'date-fns'

export const metadata = { title: 'Communications' }

interface Props {
  searchParams: Promise<{
    channel?: string
    status?: string
    direction?: string
    eventType?: string
    clientId?: string
    from?: string
    to?: string
    page?: string
  }>
}

const PAGE_SIZE = 50

export default async function CommunicationsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const defaultFrom = subDays(new Date(), 30)
  const fromDate = sp.from ? new Date(sp.from) : startOfDay(defaultFrom)
  const toDate = sp.to ? new Date(sp.to) : new Date()

  const baseWhere = {
    createdAt: { gte: fromDate, lte: toDate },
    ...(sp.channel ? { channel: sp.channel } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.direction ? { direction: sp.direction } : {}),
    ...(sp.eventType ? { eventType: sp.eventType } : {}),
    ...(sp.clientId ? { clientId: sp.clientId } : {}),
  }

  const [comms, total, emailStats, smsStats, clients] = await Promise.all([
    db.communication.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        client: { select: { id: true, name: true } },
      },
    }),
    db.communication.count({ where: baseWhere }),
    db.communication.groupBy({
      by: ['status'],
      where: { channel: 'email', createdAt: { gte: fromDate, lte: toDate } },
      _count: true,
    }),
    db.communication.groupBy({
      by: ['status'],
      where: { channel: 'sms', createdAt: { gte: fromDate, lte: toDate } },
      _count: true,
    }),
    db.client.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  function countStatus(stats: { status: string; _count: number }[], statuses: string[]) {
    return stats.filter(s => statuses.includes(s.status)).reduce((sum, s) => sum + s._count, 0)
  }

  const summary = {
    emailSent: countStatus(emailStats, ['sent', 'delivered', 'failed', 'bounced']),
    emailDelivered: countStatus(emailStats, ['delivered']),
    emailFailed: countStatus(emailStats, ['failed', 'bounced']),
    smsSent: countStatus(smsStats, ['sent', 'delivered', 'failed']),
    smsDelivered: countStatus(smsStats, ['delivered']),
    smsOptedOut: countStatus(smsStats, ['opted_out']),
  }

  const serialized = comms.map(c => ({
    id: c.id,
    channel: c.channel,
    eventType: c.eventType,
    subject: c.subject,
    body: c.body ?? '',
    direction: c.direction,
    status: c.status,
    recipientName: c.recipientName ?? '',
    recipientEmail: c.recipientEmail,
    recipientPhone: c.recipientPhone,
    clientId: c.clientId,
    leadId: c.leadId,
    clientName: c.client?.name ?? null,
    leadName: null as string | null,
    externalId: c.externalId,
    sentAt: c.sentAt?.toISOString() ?? null,
    deliveredAt: c.deliveredAt?.toISOString() ?? null,
    errorMessage: c.errorMessage,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <Suspense>
      <CommunicationsClient
        comms={serialized}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        summary={summary}
        clients={clients}
        filters={{
          channel: sp.channel ?? '',
          status: sp.status ?? '',
          direction: sp.direction ?? '',
          eventType: sp.eventType ?? '',
          clientId: sp.clientId ?? '',
          from: sp.from ?? '',
          to: sp.to ?? '',
        }}
      />
    </Suspense>
  )
}
