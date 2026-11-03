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
    expect(event.date).toBe('2027-05-25'); expect(event.allDay).toBe(false); expect(event.warnings.join()).toContain('No time')
  })
})
describe('calendar export', () => {
  it('exports confirmed all-day and timed events with escaped text and CRLF', () => {
    const events = extractCandidates('Deadline, final 2027-05-25\nMeeting 2027-05-26 14:30').map((e, i) => ({ ...e, allDay: i === 0, confirmed: true }))
    const ics = createCalendar(events, new Date('2027-01-01T00:00:00Z'))
    expect(ics).toContain('DTSTART;VALUE=DATE:20270525\r\nDTEND;VALUE=DATE:20270526')
    expect(ics).toContain(`DTSTART:${new Date(2027, 4, 26, 14, 30).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`)
    expect(ics).toContain('Deadline\\, final'); expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
  it('rejects unconfirmed events', () => { expect(() => createCalendar(extractCandidates('2027-05-25'))).toThrow() })
})


describe('readiness edge cases', () => {
  it('validates leap days and rejects invalid dates', () => {
    const events = extractCandidates('Leap 2028-02-29\nInvalid 2027-02-29\nInvalid 31/04/2027')
    expect(events.map(e => e.date)).toEqual(['2028-02-29', '', ''])
  })
  it('never assigns a time across multiple dates on the same line', () => {
    const events = extractCandidates('2027-05-20 10:00 and 2027-05-21 11:00')
    expect(events).toHaveLength(2)
    expect(events.every(e => !e.time && e.warnings.some(w => w.includes('Multiple dates')))).toBe(true)
  })
  it('requires a year and leaves ambiguous dates unresolved', () => {
    const [missing, ambiguous] = extractCandidates('Nộp bài 25 tháng 5\nDue 03/04/2027')
    expect(missing.date).toBe(''); expect(missing.warnings.join()).toContain('Year missing')
    expect(ambiguous.date).toBe(''); expect(ambiguous.warnings.join()).toContain('Ambiguous')
  })
  it('escapes text and folds UTF-8 lines without exceeding 75 octets', () => {
    const [event] = extractCandidates('Event 2027-05-25')
    const ics = createCalendar([{ ...event, title: 'Đ'.repeat(50) + ',;\\\nline', allDay: true, confirmed: true }])
    expect(ics.replace(/\r\n /g, '')).toContain('\\,\\;\\\\\\nline')
    expect(ics.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
  })
  it('converts local times to UTC without adding duration', () => {
    const [event] = extractCandidates('Meeting 2027-05-26 14:30')
    const ics = createCalendar([{ ...event, confirmed: true }])
    const expected = new Date(2027, 4, 26, 14, 30).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    expect(ics).toContain(`DTSTART:${expected}`); expect(ics).not.toContain('DTEND')
  })
})
