// C-09: Stub — replaced with real implementation in Phase 13
// Always returns true until Phase 13 is built

type AutomationGroup = 'clientCommunications' | 'adminAlerts' | 'financialAutomations'
type AutomationKey = string

export async function isAutomationEnabled(
  _group: AutomationGroup,
  _key: AutomationKey
): Promise<boolean> {
  // TODO Phase 13: replace this stub with real BusinessSettings query
  return true
}
