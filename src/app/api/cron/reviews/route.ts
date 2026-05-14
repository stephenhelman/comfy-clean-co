// C-25: This cron route is a Phase 9 stub. Phase 13 defines the final complete vercel.json
// with all four crons. When Phase 13 is built, replace vercel.json entirely — do NOT merge manually.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'

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
<html><head><meta charset="UTF-8"></head>
<body style="background:#F9FAFB;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <tr><td style="text-align:center;padding-bottom:24px;">
      <h2 style="color:#2B5C78;margin:0;">Comfy Clean Co.</h2>
    </td></tr>
    <tr><td style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:32px;">
      <h1 style="font-size:20px;margin-top:0;">How did we do, ${params.clientName}?</h1>
      <p style="color:#374151;line-height:1.6;">Thank you for choosing Comfy Clean Co.! Your feedback helps other families in Far East El Paso find reliable cleaners.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${params.reviewUrl}" style="background:#2B5C78;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">⭐ Leave a Google Review</a>
      </p>
      <p style="color:#9CA3AF;font-size:11px;border-top:1px solid #E5E7EB;padding-top:16px;">Comfy Clean Co. · Far East El Paso, TX</p>
    </td></tr>
  </table>
</body></html>`

  await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: 'How was your Comfy Clean experience?',
    html,
  })
}

// GET /api/cron/reviews — triggered daily at reviewRequestHour
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await db.businessSettings.findFirst({
    select: { reviewRequestHour: true, reviewRequestSkipWeekends: true, reviewCooldownDays: true },
  })

  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 6=Sat
  if (settings?.reviewRequestSkipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return NextResponse.json({ skipped: 'weekend', count: 0 })
  }

  // Find all queued requests with a client email
  const queued = await db.reviewRequest.findMany({
    where: { status: 'queued' },
    include: { client: { select: { id: true, name: true, email: true } } },
  })

  let sent = 0
  let skipped = 0

  for (const request of queued) {
    if (!request.client?.email) { skipped++; continue }

    // C-24: SINGULAR review. subdomain
    const reviewUrl = `https://review.comfycleanco.com/${request.id}`

    try {
      await sendReviewEmail({
        to: request.client.email,
        clientName: request.client.name,
        reviewUrl,
      })

      await db.$transaction([
        db.reviewRequest.update({
          where: { id: request.id },
          data: { status: 'sent', sentAt: now, sentViaEmail: true },
        }),
        db.client.update({
          where: { id: request.client.id },
          data: { lastReviewRequestedAt: now },
        }),
      ])
      sent++
    } catch {
      skipped++
    }
  }

  if (sent > 0) {
    await logActivity({
      eventType: ACTIVITY_EVENTS.REVIEW_REQUEST_SENT,
      description: `Cron: ${sent} review request${sent !== 1 ? 's' : ''} sent (${skipped} skipped)`,
      linkPath: `/reviews`,
    })
  }

  return NextResponse.json({ sent, skipped })
}
