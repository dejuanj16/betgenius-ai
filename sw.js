// =====================================================
// BetGenius AI - Service Worker
// Enables offline support and caching for PWA
// =====================================================

const CACHE_NAME = 'betgenius-v3';
const CACHE_VERSION = 3;

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    // Demo data removed - using real ESPN API data only
    '/js/liveOdds.js',
    '/manifest.json'
];

// External assets to cache
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API endpoints to cache with network-first strategy
const API_CACHE_PATTERNS = [
    /\/api\/props\//,
    /\/api\/odds\//,
    /\/api\/scores\//
];

// =====================================================
// INSTALL EVENT
// =====================================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Try to cache external assets (don't fail if they can't be cached)
                return caches.open(CACHE_NAME).then((cache) => {
                    return Promise.allSettled(
                        EXTERNAL_ASSETS.map(url =>
                            cache.add(url).catch(err => {
                                console.warn(`[SW] Failed to cache ${url}:`, err);
                            })
                        )
                    );
                });
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
    );
});

// =====================================================
// ACTIVATE EVENT
// =====================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// =====================================================
// FETCH EVENT
// =====================================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Check if this is an API request
    const isApiRequest = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));

    if (isApiRequest) {
        // Network-first strategy for API requests
        event.respondWith(networkFirstStrategy(event.request));
    } else if (url.origin === location.origin) {
        // Cache-first strategy for static assets
        event.respondWith(cacheFirstStrategy(event.request));
    } else {
        // Stale-while-revalidate for external resources
        event.respondWith(staleWhileRevalidate(event.request));
    }
});

// =====================================================
// CACHING STRATEGIES
// =====================================================

// Cache-first: Try cache, fallback to network
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.warn('[SW] Network request failed:', request.url);

        // Return offline page if available
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('/offline.html');
            if (offlinePage) return offlinePage;
        }

        return new Response('Offline', { status: 503 });
    }
}

// Network-first: Try network, fallback to cache
async function networkFirstStrategy(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache the fresh response
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.warn('[SW] Network request failed, trying cache:', request.url);

        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        return new Response(JSON.stringify({
            error: 'Offline',
            cached: false,
            message: 'No cached data available'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Stale-while-revalidate: Return cache, update in background
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await caches.match(request);

    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => null);

    return cachedResponse || fetchPromise;
}

// =====================================================
// PUSH NOTIFICATIONS
// =====================================================
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let data = {};

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'BetGenius AI', body: event.data.text() };
        }
    }

    const options = {
        body: data.body || 'New update available',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: data.actions || [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        tag: data.tag || 'betgenius-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'BetGenius AI', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes('/index.html') && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Open new window
                if (clients.openWindow) {
                    const url = event.notification.data?.url || '/index.html';
                    return clients.openWindow(url);
                }
            })
    );
});

// =====================================================
// BACKGROUND SYNC
// =====================================================
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-bets') {
        event.waitUntil(syncBets());
    }

    if (event.tag === 'sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

async function syncBets() {
    // Sync pending bets when online
    console.log('[SW] Syncing bets...');

    // Get pending sync data from IndexedDB
    // This would be implemented with actual sync logic
}

async function syncFavorites() {
    // Sync favorites when online
    console.log('[SW] Syncing favorites...');
}

// =====================================================
// MESSAGE HANDLING
// =====================================================
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }

    if (event.data.type === 'GET_CACHE_STATUS') {
        getCacheStatus().then((status) => {
            event.ports[0].postMessage(status);
        });
    }
});

async function getCacheStatus() {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    return {
        name: CACHE_NAME,
        version: CACHE_VERSION,
        itemCount: keys.length,
        items: keys.map(req => req.url)
    };
}

console.log('[SW] Service worker loaded');
