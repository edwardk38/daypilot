/* Service worker: makes the app installable, loads it offline, and shows reminders. */
const CACHE = "planner-v2";
const SHELL = ["/", "/index.html", "/css/app.css", "/js/config.js", "/js/platform.js", "/js/app.js", "/js/itinerary.js", "/js/focus-and-events.js", "/manifest.webmanifest", "/icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k!==CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(e.request.method!=="GET" || url.pathname.startsWith("/api/") || url.origin!==location.origin) return;
  // network first, so updates show up; fall back to the cache when offline
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("/index.html"))));
});
self.addEventListener("push", e => {
  let d = {}; try{ d = e.data.json(); }catch(_){ d = {title:"Daypilot", body: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.title || "Daypilot", {body: d.body || "", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: d.tag, data: {url: d.url || "/"}}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:"window"}).then(ws => { for(const w of ws){ if("focus" in w) return w.focus(); } return clients.openWindow(e.notification.data.url || "/"); }));
});
