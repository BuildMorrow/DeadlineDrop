import { resolve } from 'node:path'
import { createWorker } from 'tesseract.js'
import { describe, expect, it } from 'vitest'
import { extractCandidates } from '../src/features/extraction/extract'
import { createCalendar, isValidEvent } from '../src/features/calendar/ics'

describe('local OCR to calendar integration', () => {
  it.each([
    { language: 'eng', image: 'ocr-sample.png', date: '2027-05-20', time: '14:30' },
    { language: 'vie', image: 'ocr-vietnamese.png', date: '2027-05-25', time: '14:30' },
  ])('recognizes and reviews a synthetic $language image with local assets', async ({ language, image, date, time }) => {
    const worker = await createWorker(language, 1, {
      langPath: resolve(`node_modules/@tesseract.js-data/${language}/4.0.0_best_int`),
      cacheMethod: 'none',
    })
    try {
      const result = await worker.recognize(resolve('tests/fixtures', image))
      const [event] = extractCandidates(result.data.text)
      expect(event.date).toBe(date)
      expect(event.time).toBe(time)
      expect(event.confirmed).toBe(false)
      expect(isValidEvent(event)).toBe(true)
      expect(() => createCalendar([event])).toThrow()
      expect(createCalendar([{ ...event, confirmed: true }])).toContain('BEGIN:VEVENT\r\n')
    } finally {
      await worker.terminate()
    }
  }, 60_000)
})
