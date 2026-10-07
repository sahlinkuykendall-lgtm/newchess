// Service worker: network-first, so the app is always fresh when online and
// still works offline. Requests skip the browser's HTTP cache ('no-cache'
// revalidates with the server) so a new deploy shows up on the next launch.
const CACHE = 'gambit-arena';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'version.json',
  'src/main.js', 'src/version.js', 'src/audio.js',
  'src/game/data.js', 'src/game/rules.js', 'src/game/ai.js', 'src/game/levels.js',
  'src/game/characters.js', 'src/game/progress.js', 'src/game/items.js',
  'src/render/board.js', 'src/render/sprites.js',
  'src/ui/battle.js', 'src/ui/profile.js', 'src/ui/campaign.js', 'src/ui/armory.js', 'src/ui/hub.js',
  'fonts/lilita-one.woff2', 'fonts/nunito.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
