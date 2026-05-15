import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { sendSms } from '@/lib/communications/sendSms'
import { sendEmail } from '@/lib/communications/sendEmail'
import { COMM_EVENT_TYPES, SMS_TEMPLATES } from '@/lib/communications/templates'
import { isAutomationEnabled } from '@/lib/automations/checkAutomation'
import { startOfTomorrow, endOfTomorrow } from 'date-fns'
import { format } from 'date-fns'

// GET /api/cron/appointment-reminders — triggered daily at appointmentReminderHour (default 6 PM)
// C-34: Vercel schedule is static "0 18 * * *" — matches default appointmentReminderHour of 18
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const enabled = await isAutomationEnabled('clientCommunications', 'appointmentReminder')
  if (!enabled) {
    return NextResponse.json({ skipped: 'automation_disabled' })
  }

  const tomorrowStart = startOfTomorrow()
  const tomorrowEnd = endOfTomorrow()

  const jobs = await db.job.findMany({
    where: {
      scheduledAt: { gte: tomorrowStart, lte: tomorrowEnd },
      status: { in: ['stand_by', 'confirmed'] },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          smsOptedIn: true,
          smsOptedOut: true,
        },
      },
    },
  })

  let sent = 0
  let skipped = 0

  for (const job of jobs) {
    const client = job.client
    if (!client) { skipped++; continue }

    const date = format(job.scheduledAt, 'EEEE, MMM d')
    const time = format(job.scheduledAt, 'h:mm a')

    try {
      // SMS reminder
      if (client.phone && client.smsOptedIn && !client.smsOptedOut) {
        await sendSms({
          to: client.phone,
          body: SMS_TEMPLATES.APPOINTMENT_REMINDER({
            firstName: client.name.split(' ')[0],
            date,
            time,
          }),
          eventType: COMM_EVENT_TYPES.APPOINTMENT_REMINDER,
          recipientName: client.name,
          clientId: client.id,
        })
      }

      // Email reminder
      if (client.email) {
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.comfycleanco.com'
        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="background:#F9FAFB;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <tr><td style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:32px;">
      <h2 style="color:#2B5C78;margin-top:0;">Appointment Reminder</h2>
      <p style="color:#374151;line-height:1.6;">Hi ${client.name.split(' ')[0]},</p>
      <p style="color:#374151;line-height:1.6;">Just a reminder that your Comfy Clean appointment is tomorrow:</p>
      <div style="background:#F3F4F6;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#0f172a;font-size:16px;font-weight:bold;">${date} at ${time}</p>
      </div>
      <p style="color:#374151;line-height:1.6;">Questions? Reply to this email or contact us anytime.</p>
      <p style="color:#9CA3AF;font-size:11px;border-top:1px solid #E5E7EB;padding-top:16px;margin-top:24px;">Comfy Clean Co. · Far East El Paso, TX</p>
    </td></tr>
  </table>
</body></html>`

        await sendEmail({
          to: client.email,
          subject: `Reminder: Your Comfy Clean appointment is tomorrow`,
          html,
          eventType: COMM_EVENT_TYPES.APPOINTMENT_REMINDER,
          recipientName: client.name,
          clientId: client.id,
        })
      }

      sent++
    } catch (err) {
      console.error(`Reminder failed for job ${job.id}:`, err)
      skipped++
    }
  }

  if (sent > 0) {
    await logActivity({
      eventType: ACTIVITY_EVENTS.REMINDERS_SENT,
      description: `Cron: ${sent} appointment reminder${sent !== 1 ? 's' : ''} sent (${skipped} skipped)`,
      linkPath: `/calendar`,
    })
  }

  return NextResponse.json({ sent, skipped })
}
