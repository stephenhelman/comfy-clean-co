'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

const STORAGE_KEY = 'comfyclean-install-dismissed'

// PC-04: no cleanerName prop — component is self-contained
export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem(STORAGE_KEY) === 'true') return

    const installHandler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', installHandler)

    // iOS — no beforeinstallprompt, show manual instructions
    const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    if (isIos && !window.matchMedia('(display-mode: standalone)').matches) {
      setShow(true)
    }

    // InstallTrigger fires this event to force re-show regardless of localStorage
    const forceShowHandler = () => setShow(true)
    window.addEventListener('comfyclean-show-install', forceShowHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', installHandler)
      window.removeEventListener('comfyclean-show-install', forceShowHandler)
    }
  }, [])

  function handleDismiss() {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    setShow(false)
  }

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem(STORAGE_KEY, 'true')
      }
    }
    setShow(false)
  }

  if (!show) return null

  const isIos = typeof window !== 'undefined' &&
    /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleDismiss} />

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-2xl z-50 p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
              <Download size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Add to Home Screen</p>
              <p className="text-sm text-gray-500">Comfy Clean</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Add Comfy Clean to your home screen for the best experience — works like a real app, no app store needed.
        </p>

        {isIos ? (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-600">
              Tap the <strong>Share</strong> button at the bottom of Safari, then select <strong>"Add to Home Screen"</strong>
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full bg-teal-600 text-white rounded-xl py-3 font-semibold mb-4 active:bg-teal-700 transition-colors"
          >
            Add to Home Screen
          </button>
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={e => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded accent-teal-600"
          />
          <span className="text-sm text-gray-500">Don't show this again</span>
        </label>

        <p className="text-xs text-gray-400 mt-3 text-center">
          You can always add it from the install icon in your browser's address bar
        </p>
      </div>
    </>
  )
}
