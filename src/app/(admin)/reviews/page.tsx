import { Suspense } from 'react'
import { db } from '@/lib/db'
import ReviewsClient from '@/components/admin/reviews/ReviewsClient'

export const metadata = { title: 'Reviews' }

export default async function ReviewsPage() {
  const [requests, reviews, settings] = await Promise.all([
    db.reviewRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true } },
        job: { select: { scheduledAt: true } },
      },
    }),
    db.googleReview.findMany({
      orderBy: { publishedAt: 'desc' },
    }),
    db.businessSettings.findFirst({
      select: { googleOverallRating: true, googleTotalRatings: true },
    }),
  ])

  const serializedRequests = requests.map(r => ({
    id: r.id,
    clientId: r.client?.id ?? null,
    clientName: r.client?.name ?? null,
    clientEmail: r.client?.email ?? null,
    jobId: r.jobId,
    jobDate: r.job?.scheduledAt.toISOString() ?? null,
    status: r.status,
    sentAt: r.sentAt?.toISOString() ?? null,
    clickedAt: r.clickedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }))

  const serializedReviews = reviews.map(r => ({
    id: r.id,
    googleReviewId: r.googleReviewId,
    authorName: r.authorName,
    rating: r.rating,
    text: r.text,
    publishedAt: r.publishedAt.toISOString(),
    flagged: r.flagged,
    flagAcknowledgedAt: r.flagAcknowledgedAt?.toISOString() ?? null,
    flagAcknowledgedBy: r.flagAcknowledgedBy,
    reviewRequestId: r.reviewRequestId,
  }))

  // Aggregate rating from stored reviews if not set in BusinessSettings
  const avgRating = settings?.googleOverallRating
    ?? (reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null)
  const totalReviews = settings?.googleTotalRatings ?? reviews.length
  const queuedCount = requests.filter(r => r.status === 'queued').length
  const flaggedUnacknowledgedCount = reviews.filter(r => r.flagged && !r.flagAcknowledgedAt).length

  return (
    <Suspense>
      <ReviewsClient
        requests={serializedRequests}
        reviews={serializedReviews}
        avgRating={avgRating}
        totalReviews={totalReviews}
        queuedCount={queuedCount}
        flaggedUnacknowledgedCount={flaggedUnacknowledgedCount}
      />
    </Suspense>
  )
}
