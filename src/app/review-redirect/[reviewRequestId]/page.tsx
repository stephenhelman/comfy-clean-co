// C-24: review.comfycleanco.com/[reviewRequestId] → /review-redirect/[reviewRequestId]
// Stamps clickedAt, sets status → 'clicked', redirects to Google My Business
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'

interface Props {
  params: Promise<{ reviewRequestId: string }>
}

export default async function ReviewRedirectPage({ params }: Props) {
  const { reviewRequestId } = await params

  const request = await db.reviewRequest.findUnique({
    where: { id: reviewRequestId },
  })

  if (!request) notFound()

  const settings = await db.businessSettings.findFirst({
    select: { googlePlaceId: true },
  })

  // Stamp the click — only if not already clicked
  if (!request.clickedAt) {
    await db.reviewRequest.update({
      where: { id: reviewRequestId },
      data: { clickedAt: new Date(), status: 'clicked' },
    })
  }

  const placeId = settings?.googlePlaceId
  const googleUrl = placeId
    ? `https://search.google.com/local/writereview?placeid=${placeId}`
    : 'https://www.google.com/maps'

  redirect(googleUrl)
}
