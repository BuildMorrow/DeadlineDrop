import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Only build-owned application files are added. OCR and user content are never cached.
export function pwaPlugin() {
  return {
    name: 'deadlinedrop-offline-shell',
    enforce: 'post',
    generateBundle(_options, bundle) {
      // Cache entry chunks and their static imports only; lazy PDF/OCR code stays on demand.
      const entryFiles = new Set()
      const visit = file => {
        if (entryFiles.has(file)) return
        const item = bundle[file]
        if (!item || item.type !== 'chunk') return
        entryFiles.add(file)
        for (const dependency of item.imports) visit(dependency)
      }
      for (const item of Object.values(bundle)) if (item.type === 'chunk' && item.isEntry) visit(item.fileName)
      const appFiles = Object.values(bundle).filter(item => entryFiles.has(item.fileName) || /\.css$/.test(item.fileName) || item.fileName === 'index.html')
      const digest = createHash('sha256')
      for (const item of appFiles.sort((a, b) => a.fileName.localeCompare(b.fileName))) {
        digest.update(item.fileName)
        digest.update(item.type === 'chunk' ? item.code : item.source)
      }
      const files = [...appFiles.map(item => item.fileName), 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']
      for (const file of ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']) digest.update(readFileSync(`public/${file}`))
      // Changing worker logic must create a separate cache, even if assets do not change.
      digest.update(serviceWorkerSource(files, 'worker-version'))
      const version = digest.digest('hex').slice(0, 16)
      this.emitFile({ type: 'asset', fileName: 'service-worker.js', source: serviceWorkerSource(files, version) })
    },
  }
}

export function serviceWorkerSource(files, version) {
  return `/* DeadlineDrop static shell. Do not cache user content or OCR assets. */
const BASE = new URL(self.registration.scope);
const CACHE_PREFIX = 'deadlinedrop-shell:' + BASE.pathname + ':';
const CACHE = CACHE_PREFIX + '${version}';
const FILES = ${JSON.stringify(files)};
const URLS = FILES.map(file => new URL(file, BASE).href);
const ALLOWED = new Set(URLS);
const HOME = new URL('index.html', BASE).href;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all(URLS.map(async url => {
        const response = await fetch(url, { cache: 'reload' });
        if (!response.ok) throw new Error('Offline asset unavailable');
        await cache.put(url, response);
      }));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE) await caches.delete(name);
    }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== BASE.origin || url.search || url.hash) return;
  const isHome = request.mode === 'navigate' && (url.href === BASE.href || url.href === HOME);
  const key = isHome ? HOME : url.href;
  if (!isHome && !ALLOWED.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(key) || fetch(request);
  })());
});
`
}
