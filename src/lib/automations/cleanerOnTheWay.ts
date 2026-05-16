// Stub — full implementation wired in Phase 13 automation build.
// The portal clock-in action imports this dynamically and swallows errors,
// so if this function is a no-op the clock-in flow is unaffected.
export async function handleClockIn(_assignmentId: string): Promise<void> {
  // no-op until Phase 13 wires the cleaner-on-the-way SMS
}
