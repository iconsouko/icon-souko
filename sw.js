// アイコン倉庫さん Service Worker
// 目的:アプリの「枠組み」(HTML/アイコン)だけを端末にキャッシュし、
// 電波が不安定な時でもアプリ自体は開けるようにする。
// データ通信(Firebase)は一切キャッシュせず、常に最新の状態を取りに行く。

const CACHE_NAME = "icon-souko-shell-v1";
const APP_SHELL = [
  "./index.html",
  "./gallery.html",
  "./manage.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 同じサイト内の、アプリの枠組みファイルだけをキャッシュ優先で返す
  const isAppShellRequest = url.origin === self.location.origin;
  if (!isAppShellRequest || event.request.method !== "GET") {
    return; // Firebase・Google Fontsなどはキャッシュせず、通常通り通信する
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
