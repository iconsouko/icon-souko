// アイコン倉庫さん Service Worker
// 目的:アプリの「枠組み」(HTML/アイコン)を端末にも保存しておき、
// 電波が不安定な時でもアプリ自体は開けるようにする。
// ただし、更新が反映されないと困るため、HTMLは「まずネットから取りに行き、
// 取得できた場合は必ずそれを使う(ネットワーク優先)」方式にしている。
// データ通信(Firebase)は一切キャッシュせず、常に最新の状態を取りに行く。

const CACHE_NAME = "icon-souko-shell-v2"; // バージョンを上げて、古いキャッシュを破棄する

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
  const isAppShellRequest = url.origin === self.location.origin;

  if (!isAppShellRequest || event.request.method !== "GET") {
    return; // Firebase・Google Fontsなどはキャッシュせず、通常通り通信する
  }

  const isHTML = event.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");

  if (isHTML) {
    // HTMLは「ネットワーク優先」:取得できたら必ず最新を使い、キャッシュも更新する。
    // オフライン時など取得できなかった場合だけ、保存済みの内容を使う。
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 画像やmanifestなど、頻繁には変わらないファイルはキャッシュ優先でよい
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
