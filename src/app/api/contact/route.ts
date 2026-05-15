import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { leadSchema } from '@/lib/schemas/leadSchema'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { sendSms } from '@/lib/communications/sendSms'
import { COMM_EVENT_TYPES, SMS_TEMPLATES } from '@/lib/communications/templates'
import { isAutomationEnabled } from '@/lib/automations/checkAutomation'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Honeypot — silent 200 for bots
  if ((body as Record<string, unknown>).website) {
    return NextResponse.json({ success: true }, { status: 200 })
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anonymous'
  const { success: ratePassed } = await ratelimit.limit(ip)
  if (!ratePassed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    )
  }

  // Zod validation
  const result = leadSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, email, phone, type, frequency, preferredDay, preferredTime, source, notes } = result.data

  // Duplicate detection — check existing lead with same email or phone (not converted/lost)
  const existingLead = await db.leadInquiry.findFirst({
    where: {
      OR: [{ email }, { phone }],
      status: { notIn: ['converted', 'lost'] },
    },
  })

  if (existingLead) {
    const dupNote = `Duplicate submission received on ${new Date().toLocaleDateString('en-US')}.`
    await db.leadInquiry.update({
      where: { id: existingLead.id },
      data: {
        adminNotes: existingLead.adminNotes
          ? `${existingLead.adminNotes}\n${dupNote}`
          : dupNote,
      },
    })

    await logActivity({
      eventType: ACTIVITY_EVENTS.LEAD_DUPLICATE,
      description: `Duplicate submission from ${name} — existing lead updated`,
      linkPath: `/leads/${existingLead.id}`,
    })

    await sendAdminNotification({ name, email, phone, type, frequency, preferredDay, preferredTime, source, notes, isDuplicate: true, leadId: existingLead.id })

    return NextResponse.json({ ok: true })
  }

  // Check if they match an existing client
  const existingClient = await db.client.findFirst({
    where: { OR: [{ email }, { phone }], active: true },
    select: { id: true, name: true },
  })

  // Create LeadInquiry record
  const lead = await db.leadInquiry.create({
    data: {
      name,
      email,
      phone,
      type,
      frequency,
      preferredDay: preferredDay ?? null,
      preferredTime: preferredTime ?? null,
      source: source ?? null,
      notes: notes ?? null,
      status: 'new',
      // If existing client match, flag in adminNotes
      adminNotes: existingClient
        ? `⚠️ This contact matches existing client: ${existingClient.name} (/clients/${existingClient.id})`
        : null,
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.LEAD_SUBMITTED,
    description: `New ${type} lead from ${name}`,
    linkPath: `/leads/${lead.id}`,
  })

  await sendAdminNotification({ name, email, phone, type, frequency, preferredDay, preferredTime, source, notes, isDuplicate: false, leadId: lead.id })

  // Phase 11: Send SMS opt-in when phone is present
  if (phone) {
    void sendSms({
      to: phone,
      body: SMS_TEMPLATES.OPT_IN(),
      eventType: COMM_EVENT_TYPES.SMS_OPT_IN,
      recipientName: name,
      leadId: lead.id,
      skipOptInCheck: true,
    }).then(() =>
      db.leadInquiry.update({
        where: { id: lead.id },
        data: { smsOptInSent: true, smsOptInSentAt: new Date() },
      })
    ).catch((err: unknown) => console.error('Opt-in SMS failed:', err))
  }

  // Admin new lead SMS alert — respects adminAlerts.newLead toggle
  const [newLeadEnabled, settings] = await Promise.all([
    isAutomationEnabled('adminAlerts', 'newLead'),
    db.businessSettings.findFirst({ select: { adminNotificationPhone: true } }),
  ])
  if (newLeadEnabled && settings?.adminNotificationPhone) {
    void sendSms({
      to: settings.adminNotificationPhone,
      body: SMS_TEMPLATES.ADMIN_NEW_LEAD({ name, phone, type }),
      eventType: COMM_EVENT_TYPES.ADMIN_NEW_LEAD,
      recipientName: 'Admin',
      skipOptInCheck: true,
    }).catch((err: unknown) => console.error('Admin new lead SMS failed:', err))
  }

  return NextResponse.json({ ok: true })
}

async function sendAdminNotification(data: {
  name: string; email: string; phone: string; type: string; frequency: string
  preferredDay?: string; preferredTime?: string; source?: string; notes?: string
  isDuplicate: boolean; leadId: string
}) {
  if (!process.env.RESEND_API_KEY) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const adminEmail = process.env.EMAIL_INFO ?? 'info@comfycleanco.com'
  const fromEmail = process.env.EMAIL_NOREPLY ?? 'noreply@comfycleanco.com'
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.comfycleanco.com'

  const typeLabel = data.type === 'residential' ? 'Residential' : 'Commercial'
  const subject = data.isDuplicate
    ? `Duplicate Lead Submission — ${data.name}`
    : `New ${typeLabel} Lead — ${data.name}`

  const rows = [
    ['Name', data.name],
    ['Phone', data.phone],
    ['Email', data.email],
    ['Type', typeLabel],
    ['Frequency', data.frequency === 'one-time' ? 'One-Time' : 'Recurring'],
    data.preferredDay ? ['Preferred Day', data.preferredDay] : null,
    data.preferredTime ? ['Preferred Time', data.preferredTime] : null,
    data.source ? ['Source', data.source] : null,
    data.notes ? ['Notes', data.notes] : null,
  ].filter(Boolean) as [string, string][]

  const tableRows = rows.map(([label, value]) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:120px;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#0f172a;font-size:14px;">${value}</td></tr>`
  ).join('')

  try {
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject,
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="background:#f9fafb;font-family:Arial,sans-serif;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
<tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:40px;">
${data.isDuplicate ? '<p style="color:#d97706;background:#fffbeb;border:1px solid #fcd34d;padding:12px;border-radius:6px;margin:0 0 20px;font-size:13px;">⚠️ Duplicate submission — existing lead was updated</p>' : ''}
<h1 style="color:#0f172a;font-size:20px;margin-top:0;">${data.isDuplicate ? 'Duplicate Lead' : 'New Lead'}: ${data.name}</h1>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${tableRows}</table>
<div style="margin-top:24px;">
<a href="${adminUrl}/leads/${data.leadId}" style="display:inline-block;background:#2B5C78;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">View Lead in Admin</a>
</div>
</td></tr></table></body></html>`,
    })
  } catch (err) {
    console.error('Lead notification email failed:', err)
  }
}
