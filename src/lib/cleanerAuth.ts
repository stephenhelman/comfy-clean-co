import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const COOKIE_NAME = 'cleaner-session'
const DEFAULT_EXPIRY_HOURS = 12
const REMEMBER_ME_DAYS = 7
const MAX_PIN_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

// ── Session token generation ───────────────────────────────

function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

// ── Issue session ──────────────────────────────────────────
// PC-01: cookie value is stored as cleanerId:token so verifyCleanerSession
// can look up the right record without a full table scan.

export async function issueCleanerSession(
  cleanerId: string,
  rememberMe: boolean,
  deviceHint?: string
): Promise<void> {
  const token = generateSessionToken()
  const tokenHash = await bcrypt.hash(token, 10) // hash only the raw token, not the prefixed value

  const expiresAt = rememberMe
    ? new Date(Date.now() + REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000)

  // Upsert — replaces any existing session for this cleaner (single-device enforcement)
  await db.cleanerSession.upsert({
    where: { cleanerId },
    create: { cleanerId, tokenHash, expiresAt, deviceHint: deviceHint ?? null },
    update: { tokenHash, expiresAt, deviceHint: deviceHint ?? null },
  })

  // Set cookie as cleanerId:token so verifyCleanerSession can split and look up
  const cookieValue = `${cleanerId}:${token}`
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? 'time.comfycleanco.com' : undefined,
  })
}

// ── Verify session ─────────────────────────────────────────

export interface CleanerSession {
  cleanerId: string
  name: string
  colorIndex: number
}

export async function verifyCleanerSession(): Promise<CleanerSession | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value

  if (!cookieValue) return null

  // Cookie value format: cleanerId:rawToken
  const colonIndex = cookieValue.indexOf(':')
  if (colonIndex === -1) return null
  const cleanerId = cookieValue.slice(0, colonIndex)
  const rawToken = cookieValue.slice(colonIndex + 1)
  if (!cleanerId || !rawToken) return null

  const session = await db.cleanerSession.findUnique({
    where: { cleanerId },
    include: {
      cleaner: {
        select: {
          id: true,
          name: true,
          colorIndex: true,
          active: true,
          pinLockedUntil: true,
        },
      },
    },
  })

  if (!session) return null

  // Expired — clean up
  if (session.expiresAt < new Date()) {
    await db.cleanerSession.delete({ where: { cleanerId } })
    return null
  }

  // Cleaner deactivated — invalidate
  if (!session.cleaner.active) {
    await db.cleanerSession.delete({ where: { cleanerId } })
    return null
  }

  // Verify token hash
  const tokenValid = await bcrypt.compare(rawToken, session.tokenHash)
  if (!tokenValid) return null

  return {
    cleanerId: session.cleaner.id,
    name: session.cleaner.name,
    colorIndex: session.cleaner.colorIndex,
  }
}

// ── Clear session ──────────────────────────────────────────

export async function clearCleanerSession(cleanerId: string): Promise<void> {
  await db.cleanerSession.deleteMany({ where: { cleanerId } })
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ── PIN verification ───────────────────────────────────────

export type PinVerifyResult =
  | { success: true; cleanerId: string }
  | { success: false; error: string; locked?: boolean }

export async function verifyCleanerPin(
  cleanerId: string,
  pin: string,
  rememberMe: boolean,
  deviceHint?: string
): Promise<PinVerifyResult> {
  const cleaner = await db.cleaner.findUnique({
    where: { id: cleanerId },
    select: {
      id: true,
      name: true,
      active: true,
      pinHash: true,
      pinAttempts: true,
      pinLockedUntil: true,
    },
  })

  if (!cleaner || !cleaner.active) {
    return { success: false, error: 'Account not found.' }
  }

  // Check lockout
  if (cleaner.pinLockedUntil && cleaner.pinLockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (cleaner.pinLockedUntil.getTime() - Date.now()) / 60000
    )
    return {
      success: false,
      locked: true,
      error: `Too many incorrect attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
    }
  }

  // Check for existing active session on another device (single-device enforcement)
  const existingSession = await db.cleanerSession.findUnique({
    where: { cleanerId },
  })

  if (existingSession && existingSession.expiresAt > new Date()) {
    await incrementPinAttempts(cleanerId)
    return {
      success: false,
      error: 'This account is already logged in on another device. Contact your manager to reset access.',
    }
  }

  // Expired session — clean it up before proceeding
  if (existingSession && existingSession.expiresAt <= new Date()) {
    await db.cleanerSession.delete({ where: { cleanerId } })
  }

  // Verify PIN
  const pinValid = await bcrypt.compare(pin, cleaner.pinHash)

  if (!pinValid) {
    await incrementPinAttempts(cleanerId)
    const attemptsAfter = (cleaner.pinAttempts ?? 0) + 1
    const remaining = MAX_PIN_ATTEMPTS - attemptsAfter

    if (remaining <= 0) {
      return {
        success: false,
        locked: true,
        error: `Too many incorrect attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
      }
    }

    return {
      success: false,
      error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    }
  }

  // PIN correct — reset attempts and issue session
  await db.cleaner.update({
    where: { id: cleanerId },
    data: { pinAttempts: 0, pinLockedUntil: null },
  })

  await issueCleanerSession(cleanerId, rememberMe, deviceHint)

  return { success: true, cleanerId }
}

// ── Increment PIN attempts ─────────────────────────────────

async function incrementPinAttempts(cleanerId: string): Promise<void> {
  const cleaner = await db.cleaner.findUnique({
    where: { id: cleanerId },
    select: { pinAttempts: true },
  })

  if (!cleaner) return

  const newAttempts = (cleaner.pinAttempts ?? 0) + 1
  const shouldLock = newAttempts >= MAX_PIN_ATTEMPTS

  await db.cleaner.update({
    where: { id: cleanerId },
    data: {
      pinAttempts: newAttempts,
      pinLockedUntil: shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : undefined,
    },
  })

  if (shouldLock) {
    const { logActivity } = await import('@/lib/activityLog')
    await logActivity({
      eventType: 'cleaner_pin_locked_portal',
      description: `Cleaner PIN locked after too many failed portal attempts`,
      linkPath: `/cleaners/${cleanerId}`,
    })
  }
}
