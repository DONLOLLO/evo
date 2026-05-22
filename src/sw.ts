/// <reference lib="webworker" />
// Service Worker custom di EVO.
// • Precache via workbox (manifest iniettato in build).
// • Handler push: mostra notifica al ricevere un messaggio dal server.
// • Handler notificationclick: apre/focus la finestra dell'app.

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// Precaching iniettato in build.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push event ─────────────────────────────────────────────────────────
type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

self.addEventListener("push", (event) => {
  let payload: PushPayload = { title: "EVO" };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    // ignora payload malformato
  }

  const title = payload.title ?? "EVO";
  const options: NotificationOptions = {
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag,
    data: { url: payload.url ?? "/", ...payload.data },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ─────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data as { url?: string } | null)?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Se l'app è già aperta in una finestra, focus + naviga.
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({ type: "navigate", url: targetUrl });
            return (client as WindowClient).focus();
          }
        }
        // Altrimenti apri una nuova finestra.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});

export {}; // forza il file a essere un modulo
