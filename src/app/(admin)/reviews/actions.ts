'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'

async function getSession() {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  return session
}

async function sendReviewEmail(params: {
  to: string
  clientName: string
  reviewUrl: string
}) {
  if (!process.env.RESEND_API_KEY) return
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.EMAIL_NOREPLY ?? 'noreply@comfycleanco.com'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#F9FAFB;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <tr><td style="text-align:center;padding-bottom:24px;">
      <h2 style="color:#2B5C78;font-size:22px;margin:0;">Comfy Clean Co.</h2>
    </td></tr>
    <tr><td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;padding:32px;">
      <h1 style="color:#111827;font-size:20px;margin-top:0;">How did we do, ${params.clientName}?</h1>
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        Thank you for choosing Comfy Clean Co.! We hope your home is sparkling clean.
        Your feedback means the world to us and helps other families find trustworthy cleaners in Far East El Paso.
      </p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${params.reviewUrl}" style="background:#2B5C78;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          ⭐ Leave a Google Review
        </a>
      </p>
      <p style="color:#6B7280;font-size:12px;">
        Takes less than a minute. We truly appreciate your time!
      </p>
      <p style="color:#9CA3AF;font-size:11px;border-top:1px solid #E5E7EB;padding-top:16px;margin-bottom:0;">
        Comfy Clean Co. · Far East El Paso, TX · comfycleanco.com
      </p>
    </td></tr>
  </table>
</body>
</html>`

  await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: 'How was your Comfy Clean experience?',
    html,
  })
}

export async function sendReviewRequest(reviewRequestId: string) {
  const session = await getSession()

  const request = await db.reviewRequest.findUniqueOrThrow({
    where: { id: reviewRequestId },
    include: { client: true },
  })

  if (!request.client?.email) throw new Error('Client has no email address on file')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comfycleanco.com'
  // C-24: SINGULAR review. subdomain
  const reviewUrl = `https://review.comfycleanco.com/${reviewRequestId}`

  await sendReviewEmail({
    to: request.client.email,
    clientName: request.client.name,
    reviewUrl,
  })

  await db.$transaction([
    db.reviewRequest.update({
      where: { id: reviewRequestId },
      data: { status: 'sent', sentAt: new Date(), sentViaEmail: true },
    }),
    db.client.update({
      where: { id: request.clientId! },
      data: { lastReviewRequestedAt: new Date() },
    }),
  ])

  await logActivity({
    eventType: ACTIVITY_EVENTS.REVIEW_REQUEST_SENT,
    description: `Review request sent to ${request.client.name}`,
    linkPath: `/reviews`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/reviews')
}

export async function skipReviewRequest(reviewRequestId: string) {
  const session = await getSession()

  const request = await db.reviewRequest.findUniqueOrThrow({
    where: { id: reviewRequestId },
    include: { client: true },
  })

  await db.reviewRequest.update({
    where: { id: reviewRequestId },
    data: { status: 'skipped' },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.REVIEW_REQUEST_SKIPPED,
    description: `Review request skipped for ${request.client?.name ?? 'unknown client'}`,
    linkPath: `/reviews`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/reviews')
}

export async function acknowledgeNegativeReview(googleReviewId: string) {
  const session = await getSession()

  await db.googleReview.update({
    where: { id: googleReviewId },
    data: {
      flagAcknowledgedAt: new Date(),
      flagAcknowledgedBy: session.user.name ?? 'Admin',
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.NEGATIVE_REVIEW_ACK,
    description: `Negative review acknowledged by ${session.user.name}`,
    linkPath: `/reviews`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/reviews')
}

export async function matchReviewToRequest(googleReviewId: string, reviewRequestId: string) {
  const session = await getSession()

  await db.$transaction([
    db.reviewRequest.update({
      where: { id: reviewRequestId },
      data: { googleReviewId, matchedAt: new Date(), matchedBy: session.user.name ?? 'Admin', status: 'matched' },
    }),
    db.googleReview.update({
      where: { id: googleReviewId },
      data: { reviewRequestId },
    }),
  ])

  await logActivity({
    eventType: ACTIVITY_EVENTS.REVIEW_MANUAL_MATCHED,
    description: `Google review manually matched to review request`,
    linkPath: `/reviews`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/reviews')
}

export async function addGoogleReview(data: {
  googleReviewId: string
  authorName: string
  rating: number
  text: string
  publishedAt: string
}) {
  const session = await getSession()

  const review = await db.googleReview.create({
    data: {
      googleReviewId: data.googleReviewId,
      authorName: data.authorName,
      rating: data.rating,
      text: data.text || null,
      publishedAt: new Date(data.publishedAt),
      flagged: data.rating < 4,
    },
  })

  const eventType = data.rating < 4 ? ACTIVITY_EVENTS.NEGATIVE_REVIEW_RECEIVED : ACTIVITY_EVENTS.REVIEW_RECEIVED

  await logActivity({
    eventType,
    description: `${data.rating}★ review from ${data.authorName} added manually`,
    linkPath: `/reviews`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/reviews')
  return review
}
