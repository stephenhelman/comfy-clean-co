'use client'

import { useState, useTransition, useCallback } from 'react'
import Image from 'next/image'
import { Delete } from 'lucide-react'
import { submitPin } from '@/app/(time)/pin/actions'

interface Cleaner {
  id: string
  name: string
  colorIndex: number
}

interface Props {
  cleaners: Cleaner[]
}

// Tailwind avatar colors indexed by cleaner.colorIndex
const AVATAR_COLORS = [
  'bg-teal-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
]

const KEYPAD_KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '*', '0', '⌫',
]

export default function PinEntry({ cleaners }: Props) {
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null)
  const [pin, setPin] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSelectCleaner(cleaner: Cleaner) {
    setSelectedCleaner(cleaner)
    setPin('')
    setError('')
  }

  function handleBack() {
    setSelectedCleaner(null)
    setPin('')
    setError('')
  }

  const handleKeyPress = useCallback((key: string) => {
    if (isPending) return
    setError('')

    if (key === '⌫') {
      setPin(prev => prev.slice(0, -1))
      return
    }
    if (key === '*') return // spacer key — no action

    if (pin.length >= 4) return

    const newPin = pin + key

    if (newPin.length === 4) {
      // Auto-submit on 4th digit
      setPin(newPin)
      startTransition(async () => {
        const result = await submitPin(selectedCleaner!.id, newPin, rememberMe)
        if (result?.error) {
          setError(result.error)
          setPin('')
        }
      })
    } else {
      setPin(newPin)
    }
  }, [pin, isPending, selectedCleaner, rememberMe])

  if (!selectedCleaner) {
    return <CleanerSelectScreen cleaners={cleaners} onSelect={handleSelectCleaner} />
  }

  const firstName = selectedCleaner.name.split(' ')[0]
  const avatarColor = AVATAR_COLORS[selectedCleaner.colorIndex % AVATAR_COLORS.length]

  return (
    <div className="min-h-screen bg-teal-600 flex flex-col items-center px-6 py-10">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/images/brand/logo-white.png"
          alt="Comfy Clean"
          width={140}
          height={48}
          className="object-contain"
        />
      </div>

      {/* Welcome */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-white">Welcome, {firstName}</h1>
      </div>

      {/* Not you? */}
      <button
        onClick={handleBack}
        className="text-teal-200 text-sm underline underline-offset-2 mb-8 active:text-white transition-colors"
      >
        Not you?
      </button>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-white transition-all duration-150 ${
              i < pin.length ? 'bg-white' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
        {KEYPAD_KEYS.map(key => {
          const isSpacer = key === '*'
          const isBackspace = key === '⌫'

          return (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              disabled={isPending || isSpacer}
              className={`
                h-20 rounded-2xl text-2xl font-semibold select-none
                transition-transform active:scale-95
                ${isSpacer
                  ? 'bg-transparent cursor-default'
                  : 'bg-white text-gray-800 shadow-sm active:bg-gray-100 disabled:opacity-60'}
              `}
            >
              {isBackspace ? <Delete className="mx-auto" size={22} /> : key}
            </button>
          )
        })}
      </div>

      {/* Remember me toggle */}
      <label className="flex items-center gap-3 cursor-pointer mb-4">
        <div
          role="checkbox"
          aria-checked={rememberMe}
          onClick={() => setRememberMe(r => !r)}
          className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 cursor-pointer ${
            rememberMe ? 'bg-white' : 'bg-teal-400'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full shadow transition-transform duration-200 ${
              rememberMe ? 'translate-x-5 bg-teal-600' : 'translate-x-0 bg-white'
            }`}
          />
        </div>
        <span className="text-teal-100 text-sm">Remember me for 7 days</span>
      </label>

      {/* Error message */}
      {error && (
        <div className="w-full max-w-xs text-center">
          <p className={`text-sm font-medium px-4 py-2 rounded-xl ${
            error.includes('locked') || error.includes('Too many')
              ? 'bg-red-500/20 text-red-100'
              : 'bg-amber-500/20 text-amber-100'
          }`}>
            {error}
          </p>
        </div>
      )}

      {isPending && (
        <p className="text-teal-200 text-sm mt-2 animate-pulse">Checking PIN…</p>
      )}
    </div>
  )
}

function CleanerSelectScreen({
  cleaners,
  onSelect,
}: {
  cleaners: Cleaner[]
  onSelect: (c: Cleaner) => void
}) {
  return (
    <div className="min-h-screen bg-teal-600 flex flex-col items-center px-6 py-10">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/images/brand/logo-white.png"
          alt="Comfy Clean"
          width={140}
          height={48}
          className="object-contain"
        />
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">Who are you?</h1>

      <div className="w-full max-w-sm space-y-3">
        {cleaners.map(cleaner => {
          const avatarColor = AVATAR_COLORS[cleaner.colorIndex % AVATAR_COLORS.length]
          const initial = cleaner.name.charAt(0).toUpperCase()

          return (
            <button
              key={cleaner.id}
              onClick={() => onSelect(cleaner)}
              className="w-full bg-white rounded-2xl px-5 py-4 flex items-center gap-4
                         text-left shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className={`w-11 h-11 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold text-lg">{initial}</span>
              </div>
              <span className="text-gray-900 font-semibold text-lg">{cleaner.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
