import { STATUS_DOT_COLOR, type AssignmentStatus } from './calendarUtils'

export default function CalendarDot({ status }: { status: AssignmentStatus }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLOR[status]}`} />
  )
}
