'use client'

import { Download } from 'lucide-react'

const STORAGE_KEY = 'comfyclean-install-dismissed'

// Tapping this icon re-shows the install prompt regardless of localStorage state
export default function InstallTrigger() {
  function handleClick() {
    localStorage.removeItem(STORAGE_KEY)
    // Dispatch a custom event — InstallPrompt listens for this to re-show
    window.dispatchEvent(new CustomEvent('comfyclean-show-install'))
  }

  return (
    <button
      onClick={handleClick}
      className="p-2 text-gray-400 hover:text-teal-600 transition-colors active:scale-95"
      aria-label="Add to Home Screen"
    >
      <Download size={22} />
    </button>
  )
}
