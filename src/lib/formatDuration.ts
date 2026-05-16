export function formatDuration(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null || totalMinutes <= 0) return '0 mins'
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  if (hours === 0) return `${mins} min${mins === 1 ? '' : 's'}`
  if (mins === 0) return `${hours} hr${hours === 1 ? '' : 's'}`
  return `${hours} hr${hours === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`
}
