// v4 - notifikasi push
self.addEventListener('install', e=>self.skipWaiting());
self.addEventListener('activate', e=>self.clients.claim());
self.addEventListener('fetch', e=>{ if(e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return; /* API & CDN langsung ke jaringan */ e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))); });

// ---- Notifikasi push (FCM, pesan data-only) ----
self.addEventListener('push', e => {
  let j = {}; try{ j = e.data ? e.data.json() : {}; }catch(x){ try{ j = {data: {judul: 'Koperasi Intisel', isi: e.data.text()}}; }catch(y){} }
  const d = j.data || j.notification || j || {};
  const judul = d.judul || d.title || 'Koperasi Intisel', isi = d.isi || d.body || '';
  e.waitUntil(self.registration.showNotification(judul, {body: isi, icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || undefined, data: {url: d.url || './'}}));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(l => { for(const c of l){ if('focus' in c) return c.focus(); } return self.clients.openWindow(url); }));
});
