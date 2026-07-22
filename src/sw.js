import { precacheAndRoute } from "workbox-precaching";

// Same offline app-shell caching the auto-generated Workbox service worker
// used to provide (see injectManifest.globPatterns in vite.config.js) — this
// file just adds 'push'/'notificationclick' handling on top, which the
// generated service worker had no hook for.
precacheAndRoute(self.__WB_MANIFEST);

// Fires when the Cloudflare Worker's scheduled job sends a due reminder via
// the Web Push protocol — shows a real OS-level notification even if the app
// isn't open. Payload shape is set server-side in worker.js's sendDueReminders.
self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Taskup", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "🔔 תזכורת מ-Taskup";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      dir: "rtl",
      lang: "he",
      data: { url: data.url || "/" },
    })
  );
});

// Focus an already-open tab if one exists, otherwise open a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
