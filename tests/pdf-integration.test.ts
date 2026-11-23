import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { extractCandidates } from '../src/features/extraction/extract'
import { createCalendar } from '../src/features/calendar/ics'

describe('real PDF.js integration', () => {
  it('extracts two pages and passes the text through reviewed ICS export', async () => {
    const data = new Uint8Array(await readFile('tests/fixtures/two-page.pdf'))
    const task = getDocument({ data, isEvalSupported: false, disableFontFace: true, useWorkerFetch: false, stopAtErrors: true, enableXfa: false })
    try {
      const document = await task.promise
      expect(document.numPages).toBe(2)
      const pages: string[] = []
      for (let index = 1; index <= document.numPages; index++) {
        const page = await document.getPage(index)
        try { pages.push((await page.getTextContent()).items.map(item => 'str' in item ? item.str : '').join(' ')) }
        finally { page.cleanup() }
      }
      const events = extractCandidates(pages.join('\n'))
      expect(events.map(event => [event.date, event.time])).toEqual([['2027-05-20', '10:00'], ['2027-05-21', '14:30']])
      expect(() => createCalendar(events)).toThrow()
      expect(createCalendar(events.map(event => ({ ...event, confirmed: true })))).toContain('BEGIN:VEVENT')
    } finally { await task.destroy() }
  })
})
