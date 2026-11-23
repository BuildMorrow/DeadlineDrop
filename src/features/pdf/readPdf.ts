import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

import { MAX_PDF_PAGES, MAX_PDF_CHARACTERS } from './limits'
import { joinPdfText } from './text'

export async function readPdf(file: File, signal: AbortSignal): Promise<{ text: string; pages: string[] }> {
  if (signal.aborted) throw new Error('PDF reading cancelled.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (signal.aborted) throw new Error('PDF reading cancelled.')
  GlobalWorkerOptions.workerSrc = workerUrl
  const task = getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true, useWorkerFetch: false, stopAtErrors: true, enableXfa: false })
  const abort = () => { void task.destroy().catch(() => {}) }
  signal.addEventListener('abort', abort, { once: true })
  try {
    const doc = await task.promise
    if (doc.numPages > MAX_PDF_PAGES) throw new Error('PDF exceeds the 20-page limit.')
    const pages: string[] = []
    let total = 0
    for (let number = 1; number <= doc.numPages; number++) {
      if (signal.aborted) throw new Error('PDF reading cancelled.')
      const page = await doc.getPage(number)
      try {
        const content = await page.getTextContent()
        const items: { str: string; hasEOL: boolean }[] = []
        for (const item of content.items) {
          if (!('str' in item)) continue
          items.push(item)
          total += item.str.length + (item.hasEOL ? 1 : 0)
          if (total > MAX_PDF_CHARACTERS) throw new Error('PDF text exceeds the 100,000-character limit.')
        }
        pages.push(joinPdfText(items).trim())
      } finally { page.cleanup() }
    }
    return { text: pages.join('\n\n').trim(), pages }
  } finally {
    signal.removeEventListener('abort', abort)
    await task.destroy().catch(() => {})
  }
}
