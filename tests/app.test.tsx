import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../src/app/App'
import { extractCandidates } from '../src/features/extraction/extract'
import { createCalendar } from '../src/features/calendar/ics'

describe('application', () => { it('shows the local workflow', () => { expect(renderToStaticMarkup(<App />)).toContain('Find dates') }) })
describe('extraction', () => {
  it('parses explicit Vietnamese and English dates and times', () => {
    const events = extractCandidates('Nộp bài 25 tháng 5 năm 2027 lúc 14 giờ 30\nMeeting May 20, 2027 at 2:15 pm')
    expect(events.map(e => [e.date, e.time])).toEqual([['2027-05-25', '14:30'], ['2027-05-20', '14:15']])
  })
  it('flags ambiguity, missing years and invalid dates', () => {
    const events = extractCandidates('Due 03/04/2027\nDeadline 25/05\nInvalid 2027-02-30')
    expect(events.every(e => !e.date && e.warnings.length > 0)).toBe(true)
  })
  it('recognizes unambiguous numeric dates and marks missing time', () => {
    const [event] = extractCandidates('Exam 25/05/2027')
    expect(event.date).toBe('2027-05-25'); expect(event.allDay).toBe(true); expect(event.warnings.join()).toContain('No time')
  })
})
describe('calendar export', () => {
  it('exports confirmed all-day and timed events with escaped text and CRLF', () => {
    const events = extractCandidates('Deadline, final 2027-05-25\nMeeting 2027-05-26 14:30').map(e => ({ ...e, confirmed: true }))
    const ics = createCalendar(events, new Date('2027-01-01T00:00:00Z'))
    expect(ics).toContain('DTSTART;VALUE=DATE:20270525\r\nDTEND;VALUE=DATE:20270526')
    expect(ics).toContain(`DTSTART:${new Date(2027, 4, 26, 14, 30).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`)
    expect(ics).toContain('Deadline\\, final'); expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
  it('rejects unconfirmed events', () => { expect(() => createCalendar(extractCandidates('2027-05-25'))).toThrow() })
})
