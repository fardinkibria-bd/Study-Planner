/* ─── Service Worker ─────────────────────────────────────────────────────
 * Registered purely so the page can call `registration.showNotification()`,
 * which supports richer, more persistent notifications (actions, vibration,
 * requireInteraction) than the plain Notification() constructor, and which
 * some mobile browsers require for reliable delivery. This worker performs
 * no caching/offline logic — it only exists to back the Notifications API
 * and to focus the app when a notification is clicked.
 * ------------------------------------------------------------------------ */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow("./");
        return undefined;
      }),
  );
});
