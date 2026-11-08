import type { WorkerOptions } from 'tesseract.js'

// This adapter speaks the pinned Tesseract.js 7 worker protocol directly so the
// native worker is owned from creation, including while initialization hangs.
export interface OcrWorker {
  recognize(file: File): Promise<{ data: { text: string } }>
  terminate(): Promise<void>
}

export async function startWorker(language: string, options: Partial<WorkerOptions>, timeoutMs = 120_000, signal?: AbortSignal): Promise<OcrWorker> {
  if (signal?.aborted) throw new Error('OCR startup cancelled.')
  if (!options.workerPath) throw new Error('Missing OCR worker path.')
  const native = new globalThis.Worker(options.workerPath)
  let active = true
  let counter = 0
  let pending: { resolve: (data: unknown) => void; reject: (error: Error) => void; jobId: string } | undefined
  const terminate = async () => {
    if (!active) return
    active = false
    native.terminate()
    pending?.reject(new Error('OCR worker terminated.'))
    pending = undefined
  }
  native.onmessage = ({ data }: MessageEvent<{ status: string; jobId: string; data: unknown }>) => {
    if (!pending || data.jobId !== pending.jobId || data.status === 'progress') return
    const job = pending
    pending = undefined
    if (data.status === 'resolve') job.resolve(data.data)
    else job.reject(new Error(String(data.data)))
  }
  native.onerror = event => {
    pending?.reject(new Error(event.message || 'OCR worker failed.'))
    pending = undefined
    void terminate()
  }
  const job = (action: string, payload: object): Promise<unknown> => new Promise((resolve, reject) => {
    if (!active) { reject(new Error('OCR worker terminated.')); return }
    const jobId = String(++counter)
    pending = { resolve, reject, jobId }
    try { native.postMessage({ workerId: 'deadlinedrop', jobId, action, payload }) }
    catch (error) { pending = undefined; reject(error) }
  })
  const onAbort = () => { void terminate() }
  signal?.addEventListener('abort', onAbort, { once: true })
  const timer = setTimeout(() => { void terminate() }, timeoutMs)
  try {
    await job('load', { options: { lstmOnly: true, corePath: options.corePath, logging: false } })
    await job('loadLanguage', { langs: language, options: { langPath: options.langPath, cacheMethod: 'none', gzip: true, lstmOnly: true } })
    await job('initialize', { langs: language, oem: 1, config: {} })
    return {
      async recognize(file) {
        const image = new Uint8Array(await file.arrayBuffer())
        const data = await job('recognize', { image, options: {}, output: { text: true } }) as { text: string }
        return { data }
      },
      terminate,
    }
  } catch (error) {
    await terminate()
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
