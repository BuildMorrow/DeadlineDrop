import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createWorker } from 'tesseract.js'
import { describe, expect, it } from 'vitest'
import { extractCandidates } from '../src/features/extraction/extract'
import { createCalendar } from '../src/features/calendar/ics'

const require = createRequire(import.meta.url)
let canvas: typeof import('@napi-rs/canvas') | undefined
try { canvas = require('@napi-rs/canvas') as typeof import('@napi-rs/canvas') } catch { /* Optional native PDF.js dependency. */ }

describe('scanned PDF to calendar integration', () => {
  it.skipIf(!canvas)('renders synthetic English and Vietnamese image-only pages and recognizes them locally', async () => {
    const data = new Uint8Array(await readFile('tests/fixtures/scanned-two-page.pdf'))
    const task = getDocument({ data, isEvalSupported: false, disableFontFace: true, useWorkerFetch: false, stopAtErrors: true, enableXfa: false })
    try {
      const document = await task.promise
      expect(document.numPages).toBe(2)
      for (const [index, language, date] of [[1, 'eng', '2027-05-20'], [2, 'vie', '2027-05-25']] as const) {
        const page = await document.getPage(index)
        const worker = await createWorker(language, 1, { langPath: resolve(`node_modules/@tesseract.js-data/${language}/4.0.0_best_int`), cacheMethod: 'none' })
        try {
          expect((await page.getTextContent()).items).toHaveLength(0)
          const viewport = page.getViewport({ scale: 2 })
          const surface = canvas!.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
          await page.render({ canvas: surface as unknown as HTMLCanvasElement, canvasContext: surface.getContext('2d') as unknown as CanvasRenderingContext2D, viewport }).promise
          const recognized = await worker.recognize(surface.toBuffer('image/png'))
          const [event] = extractCandidates(recognized.data.text)
          expect(event.date).toBe(date)
          expect(event.time).toBe('14:30')
          expect(() => createCalendar([event])).toThrow()
          expect(createCalendar([{ ...event, confirmed: true }])).toContain('BEGIN:VEVENT')
        } finally { page.cleanup(); await worker.terminate() }
      }
    } finally { await task.destroy() }
  }, 60_000)
})
