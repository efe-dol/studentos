self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();

  const title = payload.title || 'StudentOS';
  const options = {
    body: payload.body || 'Neue Benachrichtigung',
    icon: '/next.svg',
    badge: '/next.svg',
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const relativeUrl = event.notification?.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(relativeUrl) && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(relativeUrl);
      }

      return undefined;
    })
  );
});
