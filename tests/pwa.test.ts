import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { pwaPlugin, serviceWorkerSource } from '../scripts/pwa.mjs'

function workerHarness(failUrl = '') {
  const listeners: Record<string, (event: { waitUntil?: (p: Promise<unknown>) => void; respondWith?: (p: Promise<unknown>) => void; request?: object }) => void> = {}
  const stores = new Map<string, Map<string, unknown>>()
  const caches = {
    open: vi.fn(async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)!
      return { put: async (key: string, value: unknown) => { store.set(key, value) }, match: async (key: string) => store.get(key) }
    }),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
  }
  const fetcher = vi.fn(async (input: string | { url: string }) => ({ ok: (typeof input === 'string' ? input : input.url) !== failUrl, url: input }))
  const self = { registration: { scope: 'https://example.com/DeadlineDrop/' }, addEventListener: (type: string, callback: typeof listeners[string]) => { listeners[type] = callback } }
  runInNewContext(serviceWorkerSource(['index.html', 'assets/app.js'], 'test'), { self, caches, fetch: fetcher, URL, Set, Promise, Error })
  async function lifecycle(type: string) {
    let promise: Promise<unknown> | undefined
    listeners[type]({ waitUntil: value => { promise = value } })
    return promise
  }
  async function request(url: string, mode = 'cors', method = 'GET') {
    let response: Promise<unknown> | undefined
    listeners.fetch({ request: { url, method, mode }, respondWith: value => { response = value } })
    return response ? await response : undefined
  }
  return { stores, caches, fetcher, lifecycle, request }
}

describe('offline shell service worker', () => {
  it('precaches only declared files and serves the scoped home and assets offline', async () => {
    const sw = workerHarness()
    await sw.lifecycle('install')
    expect([...sw.stores.get('deadlinedrop-shell:/DeadlineDrop/:test')!.keys()]).toEqual(expect.arrayContaining(['https://example.com/DeadlineDrop/index.html', 'https://example.com/DeadlineDrop/assets/app.js']))
    sw.fetcher.mockClear()
    expect(await sw.request('https://example.com/DeadlineDrop/', 'navigate')).toBeTruthy()
    expect(await sw.request('https://example.com/DeadlineDrop/assets/app.js')).toBeTruthy()
    expect(sw.fetcher).not.toHaveBeenCalled()
  })
  it('never handles user data, queries, OCR, external origins or non-GET requests', async () => {
    const sw = workerHarness()
    await sw.lifecycle('install')
    for (const [url, method] of [
      ['https://example.com/DeadlineDrop/?text=private', 'GET'],
      ['https://example.com/DeadlineDrop/ocr/models/eng.traineddata.gz', 'GET'],
      ['https://example.com/DeadlineDrop/user-file.ics', 'GET'],
      ['https://another.example/assets/app.js', 'GET'],
      ['https://example.com/DeadlineDrop/assets/app.js', 'POST'],
    ]) expect(await sw.request(url, 'cors', method)).toBeUndefined()
  })
  it('cleans a failed install and does not remove another application cache', async () => {
    const sw = workerHarness('https://example.com/DeadlineDrop/assets/app.js')
    await expect(sw.lifecycle('install')).rejects.toThrow('Offline asset unavailable')
    expect(sw.stores.has('deadlinedrop-shell:/DeadlineDrop/:test')).toBe(false)
    sw.stores.set('deadlinedrop-shell:/DeadlineDrop/:old', new Map())
    sw.stores.set('unrelated-app', new Map())
    sw.stores.set('deadlinedrop-shell:/Another/:old', new Map())
    await sw.lifecycle('activate')
    expect(sw.stores.has('deadlinedrop-shell:/DeadlineDrop/:old')).toBe(false)
    expect(sw.stores.has('unrelated-app')).toBe(true)
    expect(sw.stores.has('deadlinedrop-shell:/Another/:old')).toBe(true)
  })
})


describe('production offline bundle', () => {
  it('uses a version derived from assets and excludes OCR files', () => {
    const build = (code: string) => {
      let output = ''
      pwaPlugin().generateBundle.call({ emitFile: (file: { source: string }) => { output = file.source } }, {}, {
        'index.html': { type: 'asset', fileName: 'index.html', source: '<html></html>' },
        'assets/app.js': { type: 'chunk', fileName: 'assets/app.js', code },
        'assets/app.css': { type: 'asset', fileName: 'assets/app.css', source: 'body{}' },
        'ocr/model.gz': { type: 'asset', fileName: 'ocr/model.gz', source: 'model' },
      })
      return output
    }
    const first = build('one')
    expect(first).toContain('assets/app.js')
    expect(first).not.toContain('ocr/model.gz')
    expect(first).toContain('manifest.webmanifest')
    expect(first).not.toBe(build('two'))
    expect(first).not.toContain('skipWaiting')
  })
})
