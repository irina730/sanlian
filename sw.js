// 离线缓存：改了文件想让手机更新，把版本号 +1 即可
const VERSION = 'sanlian-v6';
const IMAGES = ['lat-pulldown','seated-row','db-row','straight-arm-pulldown','triceps-pushdown','overhead-extension','db-curl','hip-thrust','rdl','hip-abduction','cable-kickback','reverse-crunch','dead-bug','plank','assist-pullup','reverse-fly','knee-pushup','single-leg-bridge','leg-raise','side-plank','hip-adduction','face-pull','glute-bridge'];
const FILES = ['./', 'index.html', 'style.css', 'data.js', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', ...IMAGES.map(n => `img/${n}.webp`)];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 先用缓存（gym 信号差也能秒开），同时在后台更新
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    if (hit) { e.waitUntil(net); return hit; }
    return net;
  }));
});

// 休息结束的系统通知
self.addEventListener('push', e => {
  e.waitUntil(self.registration.showNotification('休息结束', { body: '该做下一组了', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'rest', renotify: true }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs[0];
    return c ? c.focus() : self.clients.openWindow('./');
  }));
});
