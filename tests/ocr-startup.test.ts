import { afterEach, describe, expect, it, vi } from 'vitest'
import { startWorker } from '../src/features/ocr/startWorker'

class FakeWorker {
  static latest: FakeWorker
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() { FakeWorker.latest = this }
  reply(status = 'resolve', data: unknown = {}) {
    const packet = this.postMessage.mock.lastCall![0]
    this.onmessage?.({ data: { jobId: packet.jobId, status, data } } as MessageEvent)
  }
}
const options = { workerPath: '/worker.js', corePath: '/core', langPath: '/models' }
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
describe('OCR worker lifecycle', () => {
  it('terminates a worker stuck during startup on cancellation', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const controller = new AbortController()
    const startup = startWorker('eng', options, 1000, controller.signal)
    const worker = FakeWorker.latest
    controller.abort()
    await expect(startup).rejects.toThrow('terminated')
    expect(worker.terminate).toHaveBeenCalledOnce()
  })
  it('terminates a worker stuck during startup on timeout', async () => {
    vi.useFakeTimers(); vi.stubGlobal('Worker', FakeWorker)
    const startup = startWorker('eng', options, 50)
    const result = expect(startup).rejects.toThrow('terminated')
    await vi.advanceTimersByTimeAsync(50)
    await result
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce()
  })
  it('terminates when a worker reports an initialization error', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const startup = startWorker('vie', options)
    FakeWorker.latest.reply('reject', 'model failed')
    await expect(startup).rejects.toThrow('model failed')
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce()
  })
  it('terminates when the native worker raises an error', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const startup = startWorker('eng', options)
    const worker = FakeWorker.latest
    worker.onerror?.({ message: 'worker script failed' } as ErrorEvent)
    await expect(startup).rejects.toThrow('worker script failed')
    expect(worker.terminate).toHaveBeenCalledOnce()
  })
  it('passes image bytes to the worker and returns recognized text', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const startup = startWorker('eng', options)
    const worker = FakeWorker.latest
    worker.reply(); await Promise.resolve()
    worker.reply(); await Promise.resolve()
    worker.reply()
    const ready = await startup
    const recognition = ready.recognize({ arrayBuffer: async () => new Uint8Array([1, 2]).buffer } as File)
    await Promise.resolve()
    expect(worker.postMessage.mock.lastCall![0].payload.image).toEqual(new Uint8Array([1, 2]))
    worker.reply('resolve', { text: 'Deadline 2027-05-20' })
    await expect(recognition).resolves.toEqual({ data: { text: 'Deadline 2027-05-20' } })
    await ready.terminate()
  })
  it('initializes with local resources and rejects a pending recognition on termination', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const startup = startWorker('vie', options)
    const worker = FakeWorker.latest
    expect(worker.postMessage.mock.lastCall![0].payload.options.corePath).toBe('/core')
    worker.reply(); await Promise.resolve()
    expect(worker.postMessage.mock.lastCall![0].payload.options).toMatchObject({ langPath: '/models', cacheMethod: 'none' })
    worker.reply(); await Promise.resolve()
    worker.reply()
    const ready = await startup
    const file = { arrayBuffer: async () => new Uint8Array([1]).buffer } as File
    const recognition = ready.recognize(file)
    await Promise.resolve()
    expect(worker.postMessage.mock.lastCall![0].action).toBe('recognize')
    await ready.terminate()
    await expect(recognition).rejects.toThrow('terminated')
    expect(worker.terminate).toHaveBeenCalledOnce()
  })
})
