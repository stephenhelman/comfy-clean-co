import { format, isToday, isBefore, startOfDay } from 'date-fns'

interface CalendarDayHeaderProps {
  date: Date
  now: Date
  id?: string
}

export default function CalendarDayHeader({ date, now, id }: CalendarDayHeaderProps) {
  const today = isToday(date)
  const past = !today && isBefore(date, startOfDay(now))

  if (today) {
    return (
      <div id={id} className="pt-5 pb-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-teal-600">Today</span>
          <span className="w-2 h-2 rounded-full bg-teal-500" />
        </div>
        <p className="text-sm font-semibold text-teal-600">{format(date, 'MMM d')}</p>
      </div>
    )
  }

  if (past) {
    return (
      <div id={id} className="pt-5 pb-1 px-1">
        <p className="text-xs text-gray-400">{format(date, 'EEE')}</p>
        <p className="text-sm text-gray-400">{format(date, 'MMM d')}</p>
      </div>
    )
  }

  return (
    <div id={id} className="pt-5 pb-1 px-1">
      <p className="text-xs font-medium text-gray-700">{format(date, 'EEE')}</p>
      <p className="text-sm font-semibold text-gray-900">{format(date, 'MMM d')}</p>
    </div>
  )
}
