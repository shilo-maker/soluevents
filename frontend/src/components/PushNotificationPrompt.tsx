import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const DISMISS_KEY = 'soluplan-push-prompt-dismissed'

export default function PushNotificationPrompt() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(true) // Start hidden

  useEffect(() => {
    // Only show if push is supported, permission is default (not yet asked), and not already subscribed
    const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true'
    setDismissed(!isPushSupported || wasDismissed)
  }, [])

  // Don't show if already granted/denied, already subscribed, or dismissed
  if (permission !== 'default' || isSubscribed || dismissed) return null

  const handleEnable = async () => {
    await subscribe()
    setDismissed(true)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg bg-teal-700 p-4 text-white shadow-lg sm:left-auto sm:right-4" dir="rtl">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">הפעל התראות כדי לקבל עדכונים בזמן אמת</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="rounded bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              {isLoading ? '...' : 'הפעל'}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded px-4 py-2 text-sm font-medium text-teal-200 hover:text-white"
            >
              לא עכשיו
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
