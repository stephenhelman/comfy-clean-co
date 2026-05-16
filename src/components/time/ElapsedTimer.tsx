'use client'

import { useState, useEffect } from 'react'

export default function ElapsedTimer({ clockedInAt }: { clockedInAt: Date }) {
  const [elapsed, setElapsed] = useState(
    Math.floor((Date.now() - new Date(clockedInAt).getTime()) / 1000),
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(clockedInAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [clockedInAt])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  return (
    <div className="text-center">
      <span className="font-mono text-5xl font-bold text-amber-600 tracking-wider">
        {String(hours).padStart(2, '0')}:
        {String(minutes).padStart(2, '0')}:
        {String(seconds).padStart(2, '0')}
      </span>
      <p className="text-sm text-gray-400 mt-1">time elapsed</p>
    </div>
  )
}
