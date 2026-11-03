import { describe, expect, it } from 'vitest'
import { extractCandidates } from '../src/features/extraction/extract'
import { createCalendar, isValidEvent } from '../src/features/calendar/ics'

describe('calendar boundary validation', () => {
  it('rejects impossible dates and missing times before export', () => {
    const [event] = extractCandidates('Meeting 2027-05-20 10:00')
    expect(isValidEvent({ ...event, date: '2027-02-29' })).toBe(false)
    expect(isValidEvent({ ...event, time: '' })).toBe(false)
    expect(() => createCalendar([{ ...event, date: '2027-02-29', confirmed: true }])).toThrow()
  })
  it('uses an exclusive end date for an all-day event across a year boundary', () => {
    const [event] = extractCandidates('Deadline 2027-12-31')
    const calendar = createCalendar([{ ...event, allDay: true, confirmed: true }])
    expect(calendar).toContain('DTSTART;VALUE=DATE:20271231\r\nDTEND;VALUE=DATE:20280101')
  })
  it('does not extract a time for a date without one', () => {
    const [event] = extractCandidates('Meeting May 20, 2027')
    expect(event.time).toBe('')
    expect(isValidEvent(event)).toBe(false)
  })
})
