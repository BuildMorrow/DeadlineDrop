import { createWorker, type Worker, type WorkerOptions } from 'tesseract.js'

// Tesseract.js 7 can report a language/initialization error via errorHandler while
// leaving createWorker's promise pending. Surface that error and bound the wait.
export function startWorker(language: string, options: Partial<WorkerOptions>, timeoutMs = 120_000, signal?: AbortSignal): Promise<Worker> {
  return new Promise((resolve, reject) => {
    let pending = true
    const timer = setTimeout(() => fail(new Error('OCR startup timed out.')), timeoutMs)
    const onAbort = () => fail(new Error('OCR startup cancelled.'))
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort) }
    const fail = (error: unknown) => {
      if (!pending) return
      pending = false
      cleanup()
      reject(error instanceof Error ? error : new Error(String(error)))
    }
    if (signal?.aborted) { onAbort(); return }
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      void createWorker(language, 1, { ...options, errorHandler: fail }).then(created => {
        if (!pending) { void created.terminate().catch(() => {}); return }
        pending = false
        cleanup()
        resolve(created)
      }, fail)
    } catch (error) { fail(error) }
  })
}
