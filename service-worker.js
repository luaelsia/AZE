/*
  AZE 넌센스 퀴즈 서비스 워커

  전략: 네트워크 우선, 실패하면 캐시.
  - 온라인일 때는 늘 최신 파일을 받아오므로 문제를 추가해도 바로 반영된다.
  - 오프라인일 때는 마지막으로 받아둔 파일로 실행된다.
  캐시 이름의 버전을 올리면 이전 캐시는 activate 단계에서 삭제된다.
*/

const CACHE = "aze-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // GET 이 아니거나 다른 도메인 요청은 그냥 통과시킨다.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then(res => {
        // 정상 응답만 캐시에 갱신해 둔다.
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => {
          if (hit) return hit;
          // 페이지 이동인데 캐시에 없으면 시작 페이지로 보낸다.
          if (req.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        })
      )
  );
});
