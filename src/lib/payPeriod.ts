import {
  startOfWeek,
  endOfMonth,
  addWeeks,
  addMonths,
  addDays,
  format,
} from 'date-fns'

export type PayPeriodFrequency = 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly'

export interface PayPeriodSettings {
  payPeriodFrequency: PayPeriodFrequency
  payPeriodStartDay: number
}

export interface PayPeriod {
  start: Date
  end: Date
  label: string  // e.g. "May 1 — May 14"
  offset: number // 0 = current, -1 = previous, etc.
}

export function getPayPeriod(
  settings: PayPeriodSettings,
  offset: number = 0,
  referenceDate: Date = new Date(),
): PayPeriod {
  switch (settings.payPeriodFrequency) {
    case 'weekly':
      return getWeeklyPeriod(settings.payPeriodStartDay, offset, referenceDate)
    case 'biweekly':
      return getBiweeklyPeriod(settings.payPeriodStartDay, offset, referenceDate)
    case 'semi_monthly':
      return getSemiMonthlyPeriod(offset, referenceDate)
    case 'monthly':
      return getMonthlyPeriod(offset, referenceDate)
    default:
      return getBiweeklyPeriod(1, offset, referenceDate)
  }
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function formatLabel(start: Date, end: Date): string {
  return `${format(start, 'MMM d')} — ${format(end, 'MMM d')}`
}

function getWeeklyPeriod(startDay: number, offset: number, ref: Date): PayPeriod {
  const currentStart = startOfWeek(ref, { weekStartsOn: startDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
  const start = addWeeks(currentStart, offset)
  const end = endOfDay(addDays(start, 6))
  return { start, end, label: formatLabel(start, end), offset }
}

function getBiweeklyPeriod(startDay: number, offset: number, ref: Date): PayPeriod {
  // Anchor to Jan 1 2024 — find the nearest week start on or before it
  const epoch = new Date('2024-01-01')
  const epochStart = startOfWeek(epoch, { weekStartsOn: startDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 })

  const daysSinceEpoch = Math.floor(
    (ref.getTime() - epochStart.getTime()) / (1000 * 60 * 60 * 24),
  )
  const currentPeriodIndex = Math.floor(daysSinceEpoch / 14)
  const targetPeriodIndex = currentPeriodIndex + offset

  const start = addDays(epochStart, targetPeriodIndex * 14)
  const end = endOfDay(addDays(start, 13))
  return { start, end, label: formatLabel(start, end), offset }
}

// PC-15: Direct calculation without iteration — no off-by-one errors
function getSemiMonthlyPeriod(offset: number, ref: Date): PayPeriod {
  const day = ref.getDate()
  const isFirstHalf = day <= 15

  // Index each half-month from epoch (2024-01-01 = period index 0)
  const monthsFromEpoch = (ref.getFullYear() - 2024) * 12 + ref.getMonth()
  const currentPeriodIndex = monthsFromEpoch * 2 + (isFirstHalf ? 0 : 1)
  const targetPeriodIndex = currentPeriodIndex + offset

  // floor division for month index (handles negatives correctly via Math.floor)
  const targetMonthIndex = Math.floor(targetPeriodIndex / 2)
  // even index = first half; JS % returns -1 for -3%2 so compare !== 0 for second half
  const isTargetFirstHalf = targetPeriodIndex % 2 === 0

  // Convert month index back to year+month (epoch = Jan 2024 = month index 0)
  const targetYear = 2024 + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12 // positive modulo

  let start: Date
  let end: Date

  if (isTargetFirstHalf) {
    start = new Date(targetYear, targetMonth, 1)
    end = endOfDay(new Date(targetYear, targetMonth, 15))
  } else {
    start = new Date(targetYear, targetMonth, 16)
    end = endOfDay(endOfMonth(new Date(targetYear, targetMonth, 1)))
  }

  return { start, end, label: formatLabel(start, end), offset }
}

function getMonthlyPeriod(offset: number, ref: Date): PayPeriod {
  const targetMonth = addMonths(ref, offset)
  const start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
  const end = endOfDay(endOfMonth(targetMonth))
  return { start, end, label: formatLabel(start, end), offset }
}

export function getNavigablePeriods(
  settings: PayPeriodSettings,
  referenceDate: Date = new Date(),
): PayPeriod[] {
  return [0, -1, -2, -3].map(offset => getPayPeriod(settings, offset, referenceDate))
}
