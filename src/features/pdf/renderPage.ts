import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { MAX_PDF_PAGES } from './limits'

const MAX_PIXELS = 16_000_000

/** Render one page locally; never allocate an unbounded canvas for untrusted PDFs. */
export async function renderPdfPage(file: File, pageNumber: number, signal: AbortSignal): Promise<File> {
  if (signal.aborted) throw new Error('Cancelled')
  const data = new Uint8Array(await file.arrayBuffer())
  if (signal.aborted) throw new Error('Cancelled')
  GlobalWorkerOptions.workerSrc = workerUrl
  const task = getDocument({ data, isEvalSupported: false, disableFontFace: true, useWorkerFetch: false, stopAtErrors: true, enableXfa: false })
  const abort = () => { void task.destroy().catch(() => {}) }
  signal.addEventListener('abort', abort, { once: true })
  let canvas: HTMLCanvasElement | undefined
  try {
    const doc = await task.promise
    if (doc.numPages > MAX_PDF_PAGES || !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > doc.numPages) throw new Error('Invalid PDF page')
    const page = await doc.getPage(pageNumber)
    try {
      const viewport = page.getViewport({ scale: 2 })
      const width = Math.ceil(viewport.width), height = Math.ceil(viewport.height)
      if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > MAX_PIXELS) throw new Error('PDF page too large')
      canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) throw new Error('Canvas unavailable')
      await page.render({ canvas, canvasContext: context, viewport }).promise
      if (signal.aborted) throw new Error('Cancelled')
      const blob = await new Promise<Blob | null>(resolve => canvas!.toBlob(resolve, 'image/png'))
      if (!blob || signal.aborted) throw new Error('Could not render page')
      return new File([blob], `page-${pageNumber}.png`, { type: 'image/png' })
    } finally { page.cleanup() }
  } finally {
    if (canvas) { canvas.width = 0; canvas.height = 0 }
    signal.removeEventListener('abort', abort)
    await task.destroy().catch(() => {})
  }
}
