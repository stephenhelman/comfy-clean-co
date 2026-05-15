'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { addDays } from 'date-fns'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import { requirePermission } from '@/lib/requirePermission'
import { ROLE_LABELS } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'
import { sendEmail } from '@/lib/communications/sendEmail'

async function getSession() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

async function validateOwnerConstraint(excludeUserId?: string): Promise<void> {
  const ownerCount = await db.adminUser.count({
    where: {
      role: 'owner',
      active: true,
      id: excludeUserId ? { not: excludeUserId } : undefined,
    },
  })
  if (ownerCount >= 1) {
    throw new Error('Only one Owner is allowed. Deactivate the current Owner first.')
  }
}

function buildInviteHtml(name: string, inviterName: string, role: Role, inviteUrl: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="background:#F9FAFB;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <tr><td style="text-align:center;padding-bottom:24px;">
      <h2 style="color:#2B5C78;margin:0;">Comfy Clean Co.</h2>
    </td></tr>
    <tr><td style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:32px;">
      <h1 style="font-size:20px;margin-top:0;">You've been invited to Comfy Clean Co. Admin</h1>
      <p style="color:#374151;line-height:1.6;">Hi ${name},</p>
      <p style="color:#374151;line-height:1.6;">${inviterName} has invited you to join the Comfy Clean Co. admin portal as <strong>${ROLE_LABELS[role]}</strong>.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${inviteUrl}" style="background:#2B5C78;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Accept Invitation</a>
      </p>
      <p style="color:#9CA3AF;font-size:12px;">This link expires in 7 days. If you did not expect this invitation, you can safely ignore it.</p>
      <p style="color:#9CA3AF;font-size:11px;border-top:1px solid #E5E7EB;padding-top:16px;">Comfy Clean Co. · Far East El Paso, TX</p>
    </td></tr>
  </table>
</body></html>`
}

const inviteSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['owner', 'manager', 'bookkeeper', 'dispatcher', 'viewer']),
})

export async function inviteUser(formData: FormData) {
  await requirePermission('users.invite')
  const session = await getSession()

  const parsed = inviteSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
  })
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed')

  const { name, email, role } = parsed.data

  if (role === 'owner') await validateOwnerConstraint()

  const existing = await db.adminUser.findUnique({ where: { email } })
  if (existing?.active) throw new Error('A user with this email already exists and is active.')

  const inviteToken = crypto.randomUUID()
  const inviteTokenExpiry = addDays(new Date(), 7)
  const inviteUrl = `https://admin.comfycleanco.com/accept-invite?token=${inviteToken}`

  await db.adminUser.upsert({
    where: { email },
    create: {
      name, email, role, passwordHash: '', active: false,
      inviteToken, inviteTokenExpiry,
      invitedBy: session.user.name ?? 'Admin',
      invitedAt: new Date(),
    },
    update: {
      name, role, inviteToken, inviteTokenExpiry,
      invitedBy: session.user.name ?? 'Admin',
      invitedAt: new Date(),
      active: false, deactivatedAt: null, deactivatedBy: null,
    },
  })

  await sendEmail({
    to: email,
    subject: `You've been invited to Comfy Clean Co. Admin`,
    html: buildInviteHtml(name, session.user.name ?? 'Admin', role, inviteUrl),
    eventType: 'admin_invite',
    recipientName: name,
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.USER_INVITED,
    description: `${session.user.name} invited ${name} (${email}) as ${ROLE_LABELS[role]}`,
    linkPath: `/users`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  redirect('/users')
}

export async function resendInvite(userId: string) {
  await requirePermission('users.invite')
  const session = await getSession()

  const user = await db.adminUser.findUniqueOrThrow({ where: { id: userId } })
  if (user.active) throw new Error('User is already active.')

  const inviteToken = crypto.randomUUID()
  const inviteTokenExpiry = addDays(new Date(), 7)
  const inviteUrl = `https://admin.comfycleanco.com/accept-invite?token=${inviteToken}`

  await db.adminUser.update({
    where: { id: userId },
    data: {
      inviteToken, inviteTokenExpiry,
      invitedBy: session.user.name ?? 'Admin',
      invitedAt: new Date(),
    },
  })

  await sendEmail({
    to: user.email,
    subject: `Your Comfy Clean Co. Admin invitation`,
    html: buildInviteHtml(user.name, session.user.name ?? 'Admin', user.role as Role, inviteUrl),
    eventType: 'admin_invite',
    recipientName: user.name,
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.USER_INVITE_RESENT,
    description: `${session.user.name} resent invite to ${user.name} (${user.email})`,
    linkPath: `/users`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath('/users')
}

const roleSchema = z.object({
  role: z.enum(['owner', 'manager', 'bookkeeper', 'dispatcher', 'viewer']),
})

export async function updateRole(userId: string, formData: FormData) {
  await requirePermission('users.edit_role')
  const session = await getSession()

  if (session.user.id === userId) throw new Error('You cannot change your own role.')

  const parsed = roleSchema.safeParse({ role: formData.get('role') })
  if (!parsed.success) throw new Error('Invalid role')

  const newRole = parsed.data.role
  const user = await db.adminUser.findUniqueOrThrow({ where: { id: userId } })
  const oldRole = user.role

  if (newRole === 'owner') await validateOwnerConstraint(userId)

  await db.adminUser.update({ where: { id: userId }, data: { role: newRole } })

  await logActivity({
    eventType: ACTIVITY_EVENTS.USER_ROLE_CHANGED,
    description: `${session.user.name} changed ${user.name}'s role from ${ROLE_LABELS[oldRole as Role]} to ${ROLE_LABELS[newRole]} — effective on next login`,
    linkPath: `/users/${userId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/users/${userId}`)
  revalidatePath('/users')
}

export async function deactivateUser(userId: string) {
  await requirePermission('users.deactivate')
  const session = await getSession()

  if (session.user.id === userId) throw new Error('You cannot deactivate yourself.')

  const user = await db.adminUser.findUniqueOrThrow({ where: { id: userId } })

  await db.adminUser.update({
    where: { id: userId },
    data: {
      active: false,
      deactivatedAt: new Date(),
      deactivatedBy: session.user.name ?? 'Admin',
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.USER_DEACTIVATED,
    description: `${session.user.name} deactivated user ${user.name} — access revoked immediately`,
    linkPath: `/users/${userId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/users/${userId}`)
  revalidatePath('/users')
}

export async function reactivateUser(userId: string) {
  await requirePermission('users.invite')
  const session = await getSession()

  const user = await db.adminUser.findUniqueOrThrow({ where: { id: userId } })

  const inviteToken = crypto.randomUUID()
  const inviteTokenExpiry = addDays(new Date(), 7)
  const inviteUrl = `https://admin.comfycleanco.com/accept-invite?token=${inviteToken}`

  await db.adminUser.update({
    where: { id: userId },
    data: {
      active: false,
      deactivatedAt: null,
      deactivatedBy: null,
      inviteToken,
      inviteTokenExpiry,
      invitedBy: session.user.name ?? 'Admin',
      invitedAt: new Date(),
      acceptedAt: null,
      passwordHash: '',
    },
  })

  await sendEmail({
    to: user.email,
    subject: `Your Comfy Clean Co. Admin account has been reactivated`,
    html: buildInviteHtml(user.name, session.user.name ?? 'Admin', user.role as Role, inviteUrl),
    eventType: 'admin_invite',
    recipientName: user.name,
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.USER_REACTIVATED,
    description: `${session.user.name} reactivated user ${user.name} — new invite sent`,
    linkPath: `/users/${userId}`,
    actorName: session.user.name ?? undefined,
    actorId: session.user.id,
  })

  revalidatePath(`/users/${userId}`)
  revalidatePath('/users')
}

export async function acceptInvite(token: string, formData: FormData) {
  const name = ((formData.get('name') as string) ?? '').trim()
  const password = (formData.get('password') as string) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string) ?? ''

  if (name.length < 2) throw new Error('Name is required')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  if (!/[A-Z]/.test(password)) throw new Error('Password must include at least one uppercase letter')
  if (!/[0-9]/.test(password)) throw new Error('Password must include at least one number')
  if (password !== confirmPassword) throw new Error('Passwords do not match')

  const user = await db.adminUser.findFirst({ where: { inviteToken: token } })
  if (!user) throw new Error('Invalid or expired invite link')
  if (!user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
    throw new Error('This invite link has expired')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.adminUser.update({
    where: { id: user.id },
    data: {
      name,
      passwordHash,
      active: true,
      acceptedAt: new Date(),
      inviteToken: null,
      inviteTokenExpiry: null,
    },
  })

  await logActivity({
    eventType: ACTIVITY_EVENTS.USER_INVITE_ACCEPTED,
    description: `${name} accepted invite and activated account`,
    linkPath: `/users/${user.id}`,
  })

  redirect('/dashboard')
}
