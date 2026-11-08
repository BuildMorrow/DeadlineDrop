import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWorker, type WorkerOptions } from 'tesseract.js'
import { startWorker } from '../src/features/ocr/startWorker'

vi.mock('tesseract.js', () => ({ createWorker: vi.fn() }))
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers() })

describe('OCR worker startup', () => {
  it('reports a worker startup error even if the upstream promise never settles', async () => {
    let report!: WorkerOptions['errorHandler']
    vi.mocked(createWorker).mockImplementationOnce((_lang, _mode, options) => {
      report = options!.errorHandler!
      return new Promise(() => {})
    })
    const startup = startWorker('eng', {})
    report('model could not load')
    await expect(startup).rejects.toThrow('model could not load')
  })

  it('cleans up a worker that resolves after a reported startup error', async () => {
    let report!: WorkerOptions['errorHandler']
    let complete!: (value: Awaited<ReturnType<typeof createWorker>>) => void
    vi.mocked(createWorker).mockImplementationOnce((_lang, _mode, options) => {
      report = options!.errorHandler!
      return new Promise(resolve => { complete = resolve })
    })
    const startup = startWorker('eng', {})
    report('model failed')
    await expect(startup).rejects.toThrow('model failed')
    const terminate = vi.fn().mockResolvedValue(undefined)
    complete({ terminate } as Awaited<ReturnType<typeof createWorker>>)
    await Promise.resolve()
    expect(terminate).toHaveBeenCalledOnce()
  })

  it('times out and terminates a worker that resolves too late', async () => {
    vi.useFakeTimers()
    let complete!: (value: Awaited<ReturnType<typeof createWorker>>) => void
    vi.mocked(createWorker).mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const startup = startWorker('eng', {}, 50)
    const result = expect(startup).rejects.toThrow('OCR startup timed out.')
    await vi.advanceTimersByTimeAsync(50)
    await result
    const terminate = vi.fn().mockResolvedValue(undefined)
    complete({ terminate } as Awaited<ReturnType<typeof createWorker>>)
    await Promise.resolve()
    expect(terminate).toHaveBeenCalledOnce()
  })

  it('cancels startup immediately and disposes of a later worker', async () => {
    let complete!: (value: Awaited<ReturnType<typeof createWorker>>) => void
    vi.mocked(createWorker).mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const controller = new AbortController()
    const startup = startWorker('eng', {}, 1000, controller.signal)
    controller.abort()
    await expect(startup).rejects.toThrow('OCR startup cancelled.')
    const terminate = vi.fn().mockResolvedValue(undefined)
    complete({ terminate } as Awaited<ReturnType<typeof createWorker>>)
    await Promise.resolve()
    expect(terminate).toHaveBeenCalledOnce()
  })
})
