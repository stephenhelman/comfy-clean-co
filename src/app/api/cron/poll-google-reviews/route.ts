import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { sendSms } from '@/lib/communications/sendSms'
import { COMM_EVENT_TYPES, SMS_TEMPLATES } from '@/lib/communications/templates'
import { isAutomationEnabled } from '@/lib/automations/checkAutomation'

interface GooglePlaceReview {
  author_name: string
  rating: number
  text: string
  time: number
  profile_photo_url?: string
}

interface GooglePlaceResult {
  rating?: number
  user_ratings_total?: number
  reviews?: GooglePlaceReview[]
}

interface GooglePlaceResponse {
  result?: GooglePlaceResult
  status: string
}

// GET /api/cron/poll-google-reviews — triggered daily at 8 AM
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await db.businessSettings.findFirst({
    select: {
      googlePlaceId: true,
      adminNotificationPhone: true,
    },
  })

  if (!settings?.googlePlaceId) {
    return NextResponse.json({ skipped: 'no_place_id' })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ skipped: 'no_api_key' })
  }

  let placeData: GooglePlaceResult | null = null

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', settings.googlePlaceId)
    url.searchParams.set('fields', 'rating,user_ratings_total,reviews')
    url.searchParams.set('key', apiKey)

    const resp = await fetch(url.toString())
    const json = await resp.json() as GooglePlaceResponse
    if (json.status !== 'OK') {
      return NextResponse.json({ error: 'Places API error', status: json.status })
    }
    placeData = json.result ?? null
  } catch (err) {
    console.error('Google Places API fetch failed:', err)
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  if (!placeData) return NextResponse.json({ skipped: 'no_result' })

  // Update aggregate rating on BusinessSettings
  if (placeData.rating !== undefined || placeData.user_ratings_total !== undefined) {
    await db.businessSettings.updateMany({
      data: {
        googleOverallRating: placeData.rating ?? null,
        googleTotalRatings: placeData.user_ratings_total ?? null,
      },
    })
  }

  let newCount = 0
  let negativeAlertSent = false

  for (const review of placeData.reviews ?? []) {
    // Google doesn't return stable IDs — use author + time as composite key
    const googleReviewId = `${settings.googlePlaceId}:${review.author_name}:${review.time}`

    const existing = await db.googleReview.findUnique({ where: { googleReviewId } })
    if (existing) continue

    const publishedAt = new Date(review.time * 1000)
    const isNegative = review.rating <= 3

    await db.googleReview.create({
      data: {
        googleReviewId,
        authorName: review.author_name,
        rating: review.rating,
        text: review.text,
        publishedAt,
        pulledAt: new Date(),
        flagged: isNegative,
      },
    })

    await logActivity({
      eventType: isNegative ? ACTIVITY_EVENTS.NEGATIVE_REVIEW_RECEIVED : ACTIVITY_EVENTS.REVIEW_RECEIVED,
      description: `${review.rating}-star Google review from ${review.author_name}`,
      linkPath: `/reviews`,
    })

    // Alert admin for new negative reviews
    if (isNegative && !negativeAlertSent && settings.adminNotificationPhone) {
      const alertEnabled = await isAutomationEnabled('adminAlerts', 'negativeReview')
      if (alertEnabled) {
        void sendSms({
          to: settings.adminNotificationPhone,
          body: SMS_TEMPLATES.ADMIN_NEGATIVE_REVIEW({
            rating: review.rating,
            author: review.author_name,
          }),
          eventType: COMM_EVENT_TYPES.ADMIN_NEGATIVE_REVIEW,
          recipientName: 'Admin',
          skipOptInCheck: true,
        }).catch((err: unknown) => console.error('Negative review alert SMS failed:', err))
        negativeAlertSent = true
      }
    }

    newCount++
  }

  return NextResponse.json({ newReviews: newCount })
}
