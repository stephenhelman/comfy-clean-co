import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'

interface Props {
  params: Promise<{ invoiceId: string }>
}

export default async function PayRedirectPage({ params }: Props) {
  const { invoiceId } = await params

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { job: { include: { client: true } } },
  })

  if (!invoice) notFound()

  // Stamp click timestamp and update status
  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentLinkClickedAt: new Date(),
      // Only update to pending if currently sent — don't overwrite paid/voided
      ...(invoice.status === 'sent' ? { status: 'pending' } : {}),
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.PAYMENT_CONFIRMED,
    description: `${invoice.job.client.name} clicked payment link for ${invoice.invoiceNumber}`,
    linkPath: `/jobs/${invoice.jobId}`,
  })

  // Get Zelle link from BusinessSettings
  const settings = await db.businessSettings.findFirst()
  const zelleLink = settings?.zellePaymentLink

  if (!zelleLink) {
    // Fallback page if Zelle link not configured
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
          <p className="text-gray-600 mb-4">
            Invoice <strong>{invoice.invoiceNumber}</strong> — <strong>${invoice.amount.toFixed(2)}</strong>
          </p>
          <p className="text-gray-600">
            Please send payment via Zelle to the number or email on your invoice. Contact us if you have questions.
          </p>
        </div>
      </div>
    )
  }

  redirect(zelleLink)
}
