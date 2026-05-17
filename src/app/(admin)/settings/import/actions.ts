'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ACTIVITY_EVENTS } from '@/lib/activityLog'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireOwner() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'owner') throw new Error('Owner access required')
  return session
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim()
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseDate(val: string): Date | null {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

// Parse ZenMaid "MM/DD/YYYY" + "H:MM AM/PM" as a wall-clock time in the given
// IANA timezone, returning the correct UTC instant. Uses the Intl API to resolve
// DST — no external library needed.
function parseDateTimeInTimezone(dateStr: string, timeStr: string, timezone: string): Date | null {
  const dp = dateStr.trim().split('/')
  if (dp.length !== 3) return null
  const month = parseInt(dp[0], 10) - 1
  const day   = parseInt(dp[1], 10)
  const year  = parseInt(dp[2], 10)

  const tm = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!tm) return null
  let hour     = parseInt(tm[1], 10)
  const minute = parseInt(tm[2], 10)
  const ampm   = tm[3].toUpperCase()
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0

  if ([month, day, year, hour, minute].some(isNaN)) return null

  // Build a UTC candidate at the same wall-clock numbers, then compute the offset
  // the target timezone actually has on that date, and adjust.
  const candidate = new Date(Date.UTC(year, month, day, hour, minute))

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(candidate)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10)
  let tzHour = get('hour')
  if (tzHour === 24) tzHour = 0  // midnight edge case in some Intl implementations
  const tzMinute = get('minute')
  const tzYear   = get('year')
  const tzMonth  = get('month') - 1
  const tzDay    = get('day')

  // offsetMs = how far the candidate UTC is from what the timezone shows
  // adding it shifts the candidate so the timezone reads our target wall-clock time
  const tzAsUTC     = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute)
  const targetAsUTC = Date.UTC(year, month, day, hour, minute)
  const offsetMs    = targetAsUTC - tzAsUTC

  return new Date(candidate.getTime() + offsetMs)
}

function parseFloat_(val: string): number {
  if (!val) return 0
  const n = parseFloat(val.replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

// ─── STEP 1: Import Cleaners ──────────────────────────────────────────────────

export interface CleanerPreviewRow {
  externalId: string
  name: string
  email: string
  phone: string
  rate: number
  status: string
  pin: string
  action: 'CREATE' | 'SKIP'
  skipReason?: string
}

export interface ImportResult<T> {
  preview: T[]
  willCreate: number
  willSkip: number
  warnings: string[]
}

export async function importCleaners(
  csvText: string,
  dryRun: boolean
): Promise<ImportResult<CleanerPreviewRow>> {
  await requireOwner()

  const rows = parseCSV(csvText)
  const warnings: string[] = []
  const preview: CleanerPreviewRow[] = []

  // Load existing externalIds for dedup
  const existing = await db.cleaner.findMany({ select: { externalId: true } })
  const existingIds = new Set(existing.map(c => c.externalId).filter(Boolean) as string[])

  // Current cleaner count for sequential colorIndex
  const existingCount = await db.cleaner.count()

  const toCreate: Array<{
    externalId: string
    name: string
    email: string | null
    phone: string | null
    hourlyRate: number
    active: boolean
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    dateHired: Date | null
    internalNotes: string | null
    colorIndex: number
    pinHash: string
    pin: string
  }> = []

  let colorOffset = existingCount

  for (const row of rows) {
    const email = row['Email'] ?? ''
    const externalId = row['Cleaner ID'] ?? ''

    // Skip owner/demo
    if (email === 'comfycleanco@gmail.com') continue

    const firstName = (row['First Name'] ?? '').trim()
    const lastName = (row['Last Name'] ?? '').trim()
    const name = [firstName, lastName].filter(Boolean).join(' ')

    if (!name) continue

    if (existingIds.has(externalId)) {
      preview.push({
        externalId, name, email, phone: row['Phone Number'] ?? '',
        rate: parseFloat_(row['Pay Rate'] ?? ''),
        status: row['Cleaner Status'] ?? '',
        pin: '',
        action: 'SKIP',
        skipReason: 'Already imported',
      })
      continue
    }

    const pin = generatePin()
    const pinHash = await bcrypt.hash(pin, 10)

    let internalNotes: string | null = null
    if (name.toLowerCase().includes('maria araujo')) {
      internalNotes = 'Revenue share arrangement — pay per job. Enter flat pay amount on each assignment after clock-out. Hourly rate not applicable.'
    }

    const hireDateStr = row['Custom Field: Hire Date'] ?? ''
    const dateHired = parseDate(hireDateStr)
    const hourlyRate = parseFloat_(row['Pay Rate'] ?? '')
    const active = (row['Cleaner Status'] ?? '').toLowerCase() === 'active'

    const entry = {
      externalId,
      name,
      email: email || null,
      phone: (row['Phone Number'] ?? '') || null,
      hourlyRate,
      active,
      emergencyContactName: (row['Custom Field: Emergency Contact Name'] ?? '') || null,
      emergencyContactPhone: (row['Custom Field: Emergency Contact Phone'] ?? '') || null,
      dateHired,
      internalNotes,
      colorIndex: colorOffset,
      pinHash,
      pin,
    }

    toCreate.push(entry)
    existingIds.add(externalId)
    colorOffset++

    preview.push({
      externalId,
      name,
      email,
      phone: row['Phone Number'] ?? '',
      rate: hourlyRate,
      status: active ? 'Active' : 'Inactive',
      pin: dryRun ? pin : '****',
      action: 'CREATE',
    })
  }

  if (!dryRun) {
    for (const c of toCreate) {
      const found = await db.cleaner.findFirst({ where: { externalId: c.externalId } })
      if (!found) {
        await db.cleaner.create({
          data: {
            externalId: c.externalId,
            name: c.name,
            email: c.email,
            phone: c.phone,
            hourlyRate: c.hourlyRate,
            active: c.active,
            emergencyContactName: c.emergencyContactName,
            emergencyContactPhone: c.emergencyContactPhone,
            dateHired: c.dateHired ?? undefined,
            internalNotes: c.internalNotes,
            colorIndex: c.colorIndex,
            pinHash: c.pinHash,
            availableDays: [],
          },
        })
      }
    }

    const session = await auth()
    await logActivity({
      eventType: ACTIVITY_EVENTS.ZENMAID_CLEANERS_IMPORTED,
      description: `[Admin] imported ${toCreate.length} cleaners from ZenMaid`,
      linkPath: '/settings/import',
      actorName: session?.user?.name ?? undefined,
      actorId: session?.user?.id,
    })
  }

  return {
    preview,
    willCreate: toCreate.length,
    willSkip: preview.filter(r => r.action === 'SKIP').length,
    warnings,
  }
}

// ─── STEP 2: Import Clients ───────────────────────────────────────────────────

export interface ClientPreviewRow {
  externalId: string
  name: string
  phone: string
  address: string
  frequency: string | null
  action: 'CREATE' | 'SKIP'
  skipReason?: string
  warning?: string
}

export async function importClients(
  csvText: string,
  dryRun: boolean
): Promise<ImportResult<ClientPreviewRow>> {
  await requireOwner()

  const rows = parseCSV(csvText)
  const warnings: string[] = []
  const preview: ClientPreviewRow[] = []

  const existing = await db.client.findMany({ select: { externalId: true } })
  const existingIds = new Set(existing.map(c => c.externalId).filter(Boolean) as string[])

  // Load all cleaner names for preferred cleaner resolution
  const cleaners = await db.cleaner.findMany({ select: { id: true, name: true } })

  const toCreate: Array<{
    externalId: string
    name: string
    email: string | null
    phone: string | null
    defaultAddress: string | null
    defaultCity: string | null
    defaultZip: string | null
    companyName: string | null
    preferredPaymentMethod: string | null
    defaultFrequency: string | null
    preferredDay: string | null
    accessNotes: string | null
    petNotes: string | null
    internalNotes: string | null
    acquisitionSource: string
    active: boolean
    type: string
    clientSince: Date | null
    preferredCleanerId: string | null
  }> = []

  for (const row of rows) {
    const email = (row['Primary Email'] ?? '').trim()
    const externalId = (row['Contact ID'] ?? '').trim()

    if (email === 'comfycleanco@gmail.com') continue
    if (!externalId) continue

    const name = (row['Full Name'] ?? '').trim()
    if (!name) continue

    if (existingIds.has(externalId)) {
      preview.push({
        externalId, name,
        phone: row['Phone Number 1'] ?? '',
        address: row['Svc. Address 1 Line 1'] ?? '',
        frequency: null,
        action: 'SKIP',
        skipReason: 'Already imported',
      })
      continue
    }

    const rowWarning: string[] = []

    if (!email && !(row['Phone Number 1'] ?? '').trim()) {
      rowWarning.push(`${name}: no phone AND no email — cannot deduplicate reliably`)
      warnings.push(`${name}: no phone AND no email — cannot deduplicate reliably`)
    }

    // Payment method mapping
    const rawPayment = (row['Preferred Payment Method'] ?? '').trim()
    let preferredPaymentMethod: string | null = null
    if (rawPayment === 'Cash App' || rawPayment === 'Cash') preferredPaymentMethod = 'cash'
    else if (rawPayment === 'Zelle') preferredPaymentMethod = 'zelle'

    // Frequency mapping
    const rawType = (row['Type'] ?? '').trim()
    let defaultFrequency: string | null = null
    if (rawType === 'Recurring Customer - Weekly') defaultFrequency = 'weekly'
    else if (rawType === 'Recurring Customer - Every 2 weeks') defaultFrequency = 'biweekly'
    else if (rawType === 'Recurring Customer - Every 4 weeks') defaultFrequency = 'monthly'
    else if (rawType === 'One-time Customer') defaultFrequency = 'one-time'

    // Preferred day
    const rawDay = (row['Cleaning Weekday'] ?? '').trim()
    const preferredDay = rawDay ? rawDay.toLowerCase() : null

    // Preferred cleaner resolution
    const rawPreferredCleaner = (row['Custom Field: Preferred Cleaners'] ?? '').trim()
    let preferredCleanerId: string | null = null
    if (rawPreferredCleaner) {
      const match = cleaners.find(c =>
        c.name.toLowerCase() === rawPreferredCleaner.toLowerCase()
      )
      if (match) {
        preferredCleanerId = match.id
      } else {
        const w = `${name}: preferred cleaner "${rawPreferredCleaner}" not found — skipping assignment`
        warnings.push(w)
        rowWarning.push(w)
      }
    }

    const clientSince = parseDate(row['Created On'] ?? '')

    const entry = {
      externalId,
      name,
      email: email || null,
      phone: (row['Phone Number 1'] ?? '').trim() || null,
      defaultAddress: (row['Svc. Address 1 Line 1'] ?? '').trim() || null,
      defaultCity: (row['Svc. Address 1 City'] ?? '').trim() || null,
      defaultZip: (row['Svc. Address 1 Postal Code'] ?? '').trim() || null,
      companyName: (row['Company Name'] ?? '').trim() || null,
      preferredPaymentMethod,
      defaultFrequency,
      preferredDay,
      accessNotes: (row['Custom Field: Alarm/Gate Code'] ?? '').trim() || null,
      petNotes: (row['Custom Field: Pets'] ?? '').trim() || null,
      internalNotes: (row['Contact Notes'] ?? '').trim() || null,
      acquisitionSource: 'direct',
      active: true,
      type: 'residential',
      clientSince,
      preferredCleanerId,
    }

    toCreate.push(entry)
    existingIds.add(externalId)

    preview.push({
      externalId,
      name,
      phone: entry.phone ?? '',
      address: entry.defaultAddress ?? '',
      frequency: defaultFrequency,
      action: 'CREATE',
      warning: rowWarning.length > 0 ? rowWarning.join('; ') : undefined,
    })
  }

  if (!dryRun) {
    for (const c of toCreate) {
      const found = await db.client.findFirst({ where: { externalId: c.externalId } })
      if (!found) {
        await db.client.create({
          data: {
            externalId: c.externalId,
            name: c.name,
            email: c.email,
            phone: c.phone,
            defaultAddress: c.defaultAddress,
            defaultCity: c.defaultCity,
            defaultZip: c.defaultZip,
            companyName: c.companyName,
            preferredPaymentMethod: c.preferredPaymentMethod,
            defaultFrequency: c.defaultFrequency,
            preferredDay: c.preferredDay,
            accessNotes: c.accessNotes,
            petNotes: c.petNotes,
            internalNotes: c.internalNotes,
            acquisitionSource: c.acquisitionSource,
            active: c.active,
            type: c.type,
            clientSince: c.clientSince ?? undefined,
            preferredCleanerId: c.preferredCleanerId,
          },
        })
      }
    }

    const session = await auth()
    await logActivity({
      eventType: ACTIVITY_EVENTS.ZENMAID_CLIENTS_IMPORTED,
      description: `[Admin] imported ${toCreate.length} clients from ZenMaid`,
      linkPath: '/settings/import',
      actorName: session?.user?.name ?? undefined,
      actorId: session?.user?.id,
    })
  }

  return {
    preview,
    willCreate: toCreate.length,
    willSkip: preview.filter(r => r.action === 'SKIP').length,
    warnings,
  }
}

// ─── STEP 3: Import Jobs ──────────────────────────────────────────────────────

export interface JobPreviewRow {
  externalId: string
  date: string
  client: string
  price: number
  status: string
  paymentInferred: string
  action: 'CREATE' | 'SKIP'
  skipReason?: string
  warning?: string
}

export async function importJobs(
  appointmentCsvText: string,
  contactCsvText: string,
  dryRun: boolean
): Promise<ImportResult<JobPreviewRow>> {
  await requireOwner()

  const settings = await db.businessSettings.findFirst()
  const timezone = settings?.timezone ?? 'America/Denver'

  const apptRows = parseCSV(appointmentCsvText)
  const contactRows = parseCSV(contactCsvText)
  const warnings: string[] = []
  const preview: JobPreviewRow[] = []
  const now = new Date()

  // Build revenue map from contact CSV keyed by Contact ID
  const revenueMap = new Map<string, number>()
  for (const row of contactRows) {
    const contactId = (row['Contact ID'] ?? '').trim()
    const revenue = parseFloat_(row['Revenue'] ?? '')
    if (contactId) revenueMap.set(contactId, revenue)
  }

  // Dedup existing jobs
  const existingJobs = await db.job.findMany({ select: { externalId: true } })
  const existingJobIds = new Set(existingJobs.map(j => j.externalId).filter(Boolean) as string[])

  // Load clients indexed by externalId
  const clients = await db.client.findMany({ select: { id: true, externalId: true, name: true } })
  const clientByExtId = new Map(clients.map(c => [c.externalId, c]))

  // Group appointments by Customer ID for payment inference
  const byCustomer = new Map<string, typeof apptRows>()
  for (const row of apptRows) {
    const custId = (row['Customer ID'] ?? '').trim()
    if (!custId) continue
    if (!byCustomer.has(custId)) byCustomer.set(custId, [])
    byCustomer.get(custId)!.push(row)
  }

  // Payment inference: oldest-first per customer
  const paymentStatus = new Map<string, 'PAID' | 'UNPAID'>()
  const partialNotes = new Map<string, string>()

  for (const [custId, rows] of byCustomer) {
    const revenue = revenueMap.get(custId) ?? 0
    // Sort ascending by date
    const sorted = [...rows].sort((a, b) => {
      const da = new Date(`${a['Appointment Date']} ${a['Start Time']}`)
      const db_ = new Date(`${b['Appointment Date']} ${b['Start Time']}`)
      return da.getTime() - db_.getTime()
    })

    let running = revenue
    let stopPaying = false

    for (const row of sorted) {
      const apptId = (row['Appointment ID'] ?? '').trim()
      const price = parseFloat_(row['Price'] ?? '')

      if (stopPaying) {
        paymentStatus.set(apptId, 'UNPAID')
        continue
      }

      const after = running - price
      if (after >= 0) {
        paymentStatus.set(apptId, 'PAID')
        running = after
      } else if (running > 0 && running < price) {
        // Partial payment on this appointment
        paymentStatus.set(apptId, 'UNPAID')
        const w = `Customer ${custId}: partial payment of $${running.toFixed(2)} recorded in ZenMaid — appointment ${apptId} marked unpaid`
        warnings.push(w)
        partialNotes.set(apptId, `Partial payment of $${running.toFixed(2)} recorded in ZenMaid`)
        stopPaying = true
        running = 0
      } else {
        paymentStatus.set(apptId, 'UNPAID')
        stopPaying = true
      }
    }
  }

  const toCreate: Array<{
    externalId: string
    clientId: string
    clientName: string
    scheduledAt: Date
    estimatedValue: number
    serviceAddress: string
    serviceCity: string
    serviceZip: string
    jobType: string
    recurringRule: string | null
    notes: string | null
    paymentMethod: string | null
    status: string
    actualRevenue: number | null
    internalNotes: string | null
    paymentInferred: string
  }> = []

  for (const row of apptRows) {
    const apptId = (row['Appointment ID'] ?? '').trim()
    if (!apptId) continue

    if (existingJobIds.has(apptId)) {
      preview.push({
        externalId: apptId,
        date: row['Appointment Date'] ?? '',
        client: row['Customer Name'] ?? '',
        price: parseFloat_(row['Price'] ?? ''),
        status: 'SKIP',
        paymentInferred: '',
        action: 'SKIP',
        skipReason: 'Already imported',
      })
      continue
    }

    const custId = (row['Customer ID'] ?? '').trim()
    const client = clientByExtId.get(custId)
    const rowWarnings: string[] = []

    if (!client) {
      const w = `Appointment ${apptId}: client (Customer ID ${custId}) not found — skipping`
      warnings.push(w)
      rowWarnings.push(w)
      preview.push({
        externalId: apptId,
        date: row['Appointment Date'] ?? '',
        client: row['Customer Name'] ?? `Customer ${custId}`,
        price: parseFloat_(row['Price'] ?? ''),
        status: 'SKIP',
        paymentInferred: '',
        action: 'SKIP',
        skipReason: 'Client not found in imported data',
        warning: w,
      })
      continue
    }

    const scheduledAt = parseDateTimeInTimezone(
      row['Appointment Date'] ?? '',
      (row['Start Time'] ?? '').trim(),
      timezone,
    )
    if (!scheduledAt) {
      warnings.push(`Appointment ${apptId}: invalid date "${row['Appointment Date']} ${row['Start Time']}" — skipping`)
      continue
    }

    const price = parseFloat_(row['Price'] ?? '')
    const isPast = scheduledAt < now
    const inferredPayment = paymentStatus.get(apptId) ?? 'UNPAID'

    let status: string
    let actualRevenue: number | null = null

    if (inferredPayment === 'PAID' && isPast) {
      status = 'paid'
      actualRevenue = price
    } else if (inferredPayment === 'UNPAID' && isPast) {
      status = 'completed'
    } else {
      status = 'scheduled'
    }

    // Job type
    const rawServiceType = (row['Service Type'] ?? '').toLowerCase()
    let jobType = 'standard'
    if (rawServiceType.includes('deep')) jobType = 'deep'
    else if (rawServiceType.includes('move')) jobType = 'standard'

    // Recurring rule
    const rawFreq = (row['Service Frequency'] ?? '').toLowerCase()
    let recurringRule: string | null = null
    if (rawFreq.includes('weekly') && !rawFreq.includes('2') && !rawFreq.includes('4')) recurringRule = 'weekly'
    else if (rawFreq.includes('2 week')) recurringRule = 'biweekly'
    else if (rawFreq.includes('4 week')) recurringRule = 'monthly'

    // Payment method
    const rawPay = (row['Custom Field: Pay Method'] ?? '').trim()
    let paymentMethod: string | null = null
    if (rawPay === 'Cash') paymentMethod = 'cash'
    else if (rawPay === 'Zelle') paymentMethod = 'zelle'
    else if (rawPay === 'Cash App') paymentMethod = 'cash'

    const internalNotes = partialNotes.get(apptId) ?? null

    const entry = {
      externalId: apptId,
      clientId: client.id,
      clientName: client.name,
      scheduledAt,
      estimatedValue: price,
      serviceAddress: (row['Address Line1'] ?? '').trim() || client.id,
      serviceCity: (row['Address City'] ?? '').trim() || '',
      serviceZip: (row['Address Postal Code'] ?? '').trim() || '',
      jobType,
      recurringRule,
      notes: (row['Notes'] ?? '').trim() || null,
      paymentMethod,
      status,
      actualRevenue,
      internalNotes,
      paymentInferred: inferredPayment,
    }

    toCreate.push(entry)
    existingJobIds.add(apptId)

    preview.push({
      externalId: apptId,
      date: scheduledAt.toLocaleDateString(),
      client: client.name,
      price,
      status,
      paymentInferred: inferredPayment,
      action: 'CREATE',
      warning: rowWarnings.length > 0 ? rowWarnings.join('; ') : undefined,
    })
  }

  if (!dryRun) {
    for (const j of toCreate) {
      const found = await db.job.findFirst({ where: { externalId: j.externalId } })
      if (found) {
        // Update scheduledAt so re-running after a timezone fix corrects existing records
        await db.job.update({
          where: { id: found.id },
          data: { scheduledAt: j.scheduledAt },
        })
      } else {
        await db.job.create({
          data: {
            externalId: j.externalId,
            clientId: j.clientId,
            scheduledAt: j.scheduledAt,
            estimatedValue: j.estimatedValue,
            serviceAddress: j.serviceAddress || '(unknown)',
            serviceCity: j.serviceCity || '(unknown)',
            serviceZip: j.serviceZip || '00000',
            jobType: j.jobType,
            recurringRule: j.recurringRule,
            notes: j.notes,
            paymentMethod: j.paymentMethod,
            status: j.status,
            actualRevenue: j.actualRevenue,
            paymentNotes: j.internalNotes,
          },
        })
      }
    }

    const session = await auth()
    await logActivity({
      eventType: ACTIVITY_EVENTS.ZENMAID_JOBS_IMPORTED,
      description: `[Admin] imported ${toCreate.length} jobs from ZenMaid`,
      linkPath: '/settings/import',
      actorName: session?.user?.name ?? undefined,
      actorId: session?.user?.id,
    })
  }

  return {
    preview,
    willCreate: toCreate.length,
    willSkip: preview.filter(r => r.action === 'SKIP').length,
    warnings,
  }
}

// ─── STEP 4: Import Assignments ───────────────────────────────────────────────

export interface AssignmentPreviewRow {
  cleanerName: string
  clientName: string
  date: string
  duration: string
  clockIn: string
  clockOut: string
  action: 'CREATE' | 'SKIP'
  skipReason?: string
  warning?: string
}

export async function importAssignments(
  csvText: string,
  dryRun: boolean
): Promise<ImportResult<AssignmentPreviewRow>> {
  await requireOwner()

  const settings = await db.businessSettings.findFirst()
  const timezone = settings?.timezone ?? 'America/Denver'

  const rows = parseCSV(csvText)
  const warnings: string[] = []
  const preview: AssignmentPreviewRow[] = []

  // Load cleaners by externalId
  const cleaners = await db.cleaner.findMany({ select: { id: true, externalId: true, name: true, hourlyRate: true } })
  const cleanerByExtId = new Map(cleaners.map(c => [c.externalId, c]))

  // Load jobs by externalId, along with client name
  const jobs = await db.job.findMany({
    select: { id: true, externalId: true, scheduledAt: true, clientId: true, client: { select: { name: true } } },
  })
  const jobByExtId = new Map(jobs.map(j => [j.externalId, j]))

  // Build a minute-level lookup: clientId + minute-epoch → job
  const jobByMinuteKey = new Map<string, typeof jobs[number]>()
  for (const job of jobs) {
    const minuteEpoch = Math.floor(job.scheduledAt.getTime() / 60000)
    jobByMinuteKey.set(`${job.clientId}::${minuteEpoch}`, job)
  }

  // Load existing assignments for dedup check
  const existingAssignments = await db.jobAssignment.findMany({
    select: { jobId: true, cleanerId: true },
  })
  const existingPairs = new Set(existingAssignments.map(a => `${a.jobId}::${a.cleanerId}`))

  const toCreate: Array<{
    jobId: string
    cleanerId: string
    cleanerName: string
    clientName: string
    scheduledAt: Date
    clockedInAt: Date | null
    clockedOutAt: Date | null
    durationMins: number | null
    hourlyRateSnapshot: number
  }> = []

  for (const row of rows) {
    const cleanerExtId = (row['Cleaner ID'] ?? '').trim()
    const cleaner = cleanerByExtId.get(cleanerExtId)
    const rowWarnings: string[] = []

    if (!cleaner) {
      const w = `Assignment row: cleaner ID "${cleanerExtId}" not found — skipping`
      warnings.push(w)
      preview.push({
        cleanerName: `Unknown (${cleanerExtId})`,
        clientName: row['Customer Name'] ?? '',
        date: row['Appointment Date'] ?? '',
        duration: '',
        clockIn: '',
        clockOut: '',
        action: 'SKIP',
        skipReason: 'Cleaner not found',
        warning: w,
      })
      continue
    }

    // Match job: try Appointment ID / Subscription ID columns first for direct externalId hit,
    // then fall back to Customer ID + Appointment Date + Appointment Start Time (minute-level)
    const directId = (row['Appointment ID'] ?? row['Subscription ID'] ?? '').trim()
    let job = directId ? jobByExtId.get(directId) : undefined

    const apptDate = (row['Appointment Date'] ?? '').trim()
    // Assignment CSV uses "Appointment Start Time"; fall back to "Start Time"
    const startTime = (row['Appointment Start Time'] ?? row['Start Time'] ?? '').trim()

    if (!job) {
      const custId = (row['Customer ID'] ?? '').trim()
      const client = await db.client.findFirst({ where: { externalId: custId }, select: { id: true, name: true } })
      if (client) {
        const dt = parseDateTimeInTimezone(apptDate, startTime, timezone)
        if (dt) {
          const minuteEpoch = Math.floor(dt.getTime() / 60000)
          job = jobByMinuteKey.get(`${client.id}::${minuteEpoch}`)
        }
      }
    }

    if (!job) {
      const w = `Assignment for cleaner ${cleaner.name} on ${row['Appointment Date'] ?? ''}: matching job not found — skipping`
      warnings.push(w)
      rowWarnings.push(w)
      preview.push({
        cleanerName: cleaner.name,
        clientName: row['Customer Name'] ?? '',
        date: row['Appointment Date'] ?? '',
        duration: '',
        clockIn: '',
        clockOut: '',
        action: 'SKIP',
        skipReason: 'Job not found',
        warning: w,
      })
      continue
    }

    const pairKey = `${job.id}::${cleaner.id}`
    if (existingPairs.has(pairKey)) {
      preview.push({
        cleanerName: cleaner.name,
        clientName: job.client.name,
        date: job.scheduledAt.toLocaleDateString(),
        duration: '',
        clockIn: '',
        clockOut: '',
        action: 'SKIP',
        skipReason: 'Already imported',
      })
      continue
    }

    // Parse clock-in / clock-out in business timezone (apptDate already declared above)
    const timeIn = (row['Time In'] ?? '').trim()
    const timeOut = (row['Time Out'] ?? '').trim()
    const clockedInAt = timeIn ? parseDateTimeInTimezone(apptDate, timeIn, timezone) : null
    const clockedOutAt = timeOut ? parseDateTimeInTimezone(apptDate, timeOut, timezone) : null

    const totalSecs = parseFloat_(row['Total Time in Seconds'] ?? '')
    const durationMins = totalSecs > 0 ? Math.round(totalSecs / 60) : null

    toCreate.push({
      jobId: job.id,
      cleanerId: cleaner.id,
      cleanerName: cleaner.name,
      clientName: job.client.name,
      scheduledAt: job.scheduledAt,
      clockedInAt,
      clockedOutAt,
      durationMins,
      hourlyRateSnapshot: cleaner.hourlyRate,
    })
    existingPairs.add(pairKey)

    preview.push({
      cleanerName: cleaner.name,
      clientName: job.client.name,
      date: job.scheduledAt.toLocaleDateString(),
      duration: durationMins != null ? `${durationMins} min` : '—',
      clockIn: clockedInAt ? clockedInAt.toLocaleTimeString() : '—',
      clockOut: clockedOutAt ? clockedOutAt.toLocaleTimeString() : '—',
      action: 'CREATE',
      warning: rowWarnings.length > 0 ? rowWarnings.join('; ') : undefined,
    })
  }

  if (!dryRun) {
    for (const a of toCreate) {
      const exists = await db.jobAssignment.findUnique({
        where: { jobId_cleanerId: { jobId: a.jobId, cleanerId: a.cleanerId } },
      })
      if (!exists) {
        await db.jobAssignment.create({
          data: {
            jobId: a.jobId,
            cleanerId: a.cleanerId,
            clockedInAt: a.clockedInAt ?? undefined,
            clockedOutAt: a.clockedOutAt ?? undefined,
            durationMins: a.durationMins ?? undefined,
            hourlyRateSnapshot: a.hourlyRateSnapshot,
            laborCost: 0,
            flatRatePay: null,
            gpsBlocked: true,
            clockOutGpsBlocked: true,
          },
        })
      }
    }

    const session = await auth()
    await logActivity({
      eventType: ACTIVITY_EVENTS.ZENMAID_ASSIGNMENTS_IMPORTED,
      description: `[Admin] imported ${toCreate.length} assignments from ZenMaid`,
      linkPath: '/settings/import',
      actorName: session?.user?.name ?? undefined,
      actorId: session?.user?.id,
    })
  }

  return {
    preview,
    willCreate: toCreate.length,
    willSkip: preview.filter(r => r.action === 'SKIP').length,
    warnings,
  }
}

// ─── Progress summary query ───────────────────────────────────────────────────

export async function getImportSummary() {
  await requireOwner()

  const [cleaners, clients, jobs, assignments] = await Promise.all([
    db.cleaner.count({ where: { externalId: { not: null } } }),
    db.client.count({ where: { externalId: { not: null } } }),
    db.job.count({ where: { externalId: { not: null } } }),
    db.jobAssignment.count({
      where: {
        job: { externalId: { not: null } },
      },
    }),
  ])

  return { cleaners, clients, jobs, assignments }
}
