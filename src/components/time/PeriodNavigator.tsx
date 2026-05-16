'use client'

import { useRouter } from 'next/navigation'

interface PeriodNavigatorProps {
  currentOffset: number
  periodLabel: string
}

// PC-16: uses router.push() to update ?period= query param, triggering server refetch
export default function PeriodNavigator({ currentOffset, periodLabel }: PeriodNavigatorProps) {
  const router = useRouter()

  function navigate(newOffset: number) {
    router.push(`/hours?period=${newOffset}`)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
      <button
        onClick={() => navigate(currentOffset - 1)}
        disabled={currentOffset <= -3}
        className="p-2 text-gray-500 disabled:opacity-30 active:text-teal-600"
        aria-label="Previous period"
      >
        ←
      </button>
      <span className="text-sm font-medium text-gray-700">{periodLabel}</span>
      <button
        onClick={() => navigate(currentOffset + 1)}
        disabled={currentOffset >= 0}
        className="p-2 text-gray-500 disabled:opacity-30 active:text-teal-600"
        aria-label="Next period"
      >
        →
      </button>
    </div>
  )
}
