// Truckio Fleet OS - Service Worker Push & Background Notification Handler
// Handles push events, notification click navigation, and background alerts

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🔴 TRUCKIO • Alerta de Mantenimiento Crítico';
  const options = {
    body: data.body || 'Una unidad de tu flota tiene mantenimiento vencido o está varada en ruta.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [300, 100, 300, 100, 500],
    tag: data.tag || 'truckio-critical-maintenance',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      planId: data.planId,
      vehicleId: data.vehicleId,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open_app', title: 'Ver en Truckio' },
      { action: 'close', title: 'Cerrar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event handler: Brings existing window to focus or opens app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus already open window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Listen for messages from client windows to trigger Service Worker notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_CRITICAL_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || '🔴 TRUCKIO • Mantenimiento Crítico';
    const options = {
      body: payload.body || 'Atención: Tu unidad asignada tiene un mantenimiento vencido.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [300, 150, 300, 150, 600],
      tag: payload.tag || 'truckio-critical-service',
      renotify: true,
      requireInteraction: true,
      data: {
        url: '/',
        planId: payload.planId,
        vehicleId: payload.vehicleId,
      },
      actions: [
        { action: 'open_app', title: 'Revisar Unidad' },
      ],
    };

    self.registration.showNotification(title, options);
  }
});
