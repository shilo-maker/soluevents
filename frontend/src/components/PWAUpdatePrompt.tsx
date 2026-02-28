import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const SW_CHECK_INTERVAL = 60 * 60 * 1000 // 60 minutes

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // Periodically check for SW updates so users don't stay on stale versions
  useEffect(() => {
    const interval = setInterval(async () => {
      const reg = await navigator.serviceWorker?.getRegistration()
      await reg?.update()
    }, SW_CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg bg-teal-700 p-4 text-white shadow-lg sm:left-auto sm:right-4">
      <p className="text-sm font-medium">גרסה חדשה זמינה</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => updateServiceWorker(true)}
          className="rounded bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          עדכן עכשיו
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="rounded px-4 py-2 text-sm font-medium text-teal-200 hover:text-white"
        >
          אחר כך
        </button>
      </div>
    </div>
  )
}
