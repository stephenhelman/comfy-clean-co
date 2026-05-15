// C-33: Replaces the Phase 1 stub — reads live from BusinessSettings
import { db } from '@/lib/db'

type AutomationGroup = 'clientCommunications' | 'adminAlerts' | 'financialAutomations'
type AutomationKey = string

interface AutomationSettings {
  globalPause?: boolean
  clientCommunications?: { enabled?: boolean; [key: string]: boolean | undefined }
  adminAlerts?: { enabled?: boolean; [key: string]: boolean | undefined }
  financialAutomations?: { enabled?: boolean; [key: string]: boolean | undefined }
}

let cached: { settings: AutomationSettings; ts: number } | null = null
const TTL_MS = 30_000

async function getSettings(): Promise<AutomationSettings> {
  const now = Date.now()
  if (cached && now - cached.ts < TTL_MS) return cached.settings

  const row = await db.businessSettings.findFirst({ select: { automationSettings: true } })
  const settings = (row?.automationSettings ?? {}) as AutomationSettings
  cached = { settings, ts: now }
  return settings
}

export async function isAutomationEnabled(
  group: AutomationGroup,
  key: AutomationKey,
): Promise<boolean> {
  const s = await getSettings()

  // Global pause only blocks clientCommunications — admin alerts and financial always run
  if (s.globalPause && group === 'clientCommunications') return false

  const groupSettings = s[group] as { enabled?: boolean; [k: string]: boolean | undefined } | undefined
  if (!groupSettings) return true
  if (groupSettings.enabled === false) return false
  if (groupSettings[key] === false) return false
  return true
}
