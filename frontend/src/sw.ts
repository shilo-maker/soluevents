import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope

// Precache (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Navigation fallback
const navHandler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(navHandler, {
  denylist: [/^\/api\//, /^\/socket\.io\//],
}))

// Runtime caching — Google Fonts stylesheets
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

// Runtime caching — Google Fonts files
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

// Runtime caching — API calls
registerRoute(
  /\/api\/.*/i,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 5 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

// Runtime caching — lazy-loaded JS routes
registerRoute(
  /\/assets\/.+\.js$/i,
  new StaleWhileRevalidate({
    cacheName: 'lazy-routes-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

// Runtime caching — CSS
registerRoute(
  /\/assets\/.+\.css$/i,
  new StaleWhileRevalidate({
    cacheName: 'css-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

// Skip waiting on message from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// === PUSH NOTIFICATION HANDLERS ===
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'SoluPlan', body: 'התראה חדשה' }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const focused = clients.some((c) => c.focused)
      if (focused) return // App is open and focused — Socket.IO handles it

      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/logo-192.png',
        badge: '/favicon-32x32.png',
        data: { url: data.url || '/' },
        dir: 'rtl',
        lang: 'he',
      })
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if one exists
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow(url)
    })
  )
})
