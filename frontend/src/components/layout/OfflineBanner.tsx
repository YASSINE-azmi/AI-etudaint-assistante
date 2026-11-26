import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** Offline state (Week 11): requests would fail, so say so before the student tries. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine)
  if (online) return null

  return (
    <p
      role="status"
      data-testid="offline-banner"
      className="border-b border-warm/25 bg-warm-soft px-5 py-2 text-sm font-semibold text-warm lg:px-10"
    >
      Hors ligne : vérifie ta connexion. Les questions ne peuvent pas être envoyées pour
      l’instant.
    </p>
  )
}
