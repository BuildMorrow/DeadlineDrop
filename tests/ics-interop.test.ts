import { describe, expect, it } from 'vitest'
import ICAL from 'ical.js'
import { extractCandidates } from '../src/features/extraction/extract'
import { createCalendar, isValidEvent } from '../src/features/calendar/ics'
import { resolveRange } from '../src/features/calendar/resolution'

describe('calendar interoperability', () => {
  it('parses exported timed, ranged and all-day events with an independent ICS parser', () => {
    const [timed, range, allDay] = extractCandidates('Meeting 2027-05-20T14:30Z\nWorkshop 2027-05-21 10:00-11:00\nDeadline 2027-05-25')
    const events = [
      { ...timed, title: 'Họp, kế hoạch; \\ follow-up', confirmed: true },
      { ...resolveRange(range), confirmed: true },
      { ...allDay, allDay: true, confirmed: true },
    ]
    const calendar = new ICAL.Component(ICAL.parse(createCalendar(events, new Date('2027-01-01T00:00:00Z'))))
    expect(calendar.name).toBe('vcalendar')
    expect(calendar.getFirstPropertyValue('version')).toBe('2.0')
    const parsed = calendar.getAllSubcomponents('vevent')
    expect(parsed).toHaveLength(3)
    expect(parsed[0].getFirstPropertyValue('summary')).toBe('Họp, kế hoạch; \\ follow-up')
    expect(parsed[0].getFirstPropertyValue('dtstart')?.toString()).toBe('2027-05-20T14:30:00Z')
    expect(parsed[0].getFirstProperty('dtend')).toBeNull()
    expect(parsed[1].getFirstProperty('dtend')).not.toBeNull()
    expect(parsed[2].getFirstPropertyValue('dtstart')?.toString()).toBe('2027-05-25')
    expect(parsed[2].getFirstPropertyValue('dtend')?.toString()).toBe('2027-05-26')
    expect(new Set(parsed.map(event => event.getFirstPropertyValue('uid'))).size).toBe(3)
    expect(parsed.every(event => event.getFirstProperty('dtstamp'))).toBe(true)
  })
})


describe('calendar date boundaries', () => {
  it('preserves a valid date even when the local timezone skipped that day', () => {
    const [event] = extractCandidates('Deadline 2011-12-30')
    expect(event.date).toBe('2011-12-30')
    const calendar = createCalendar([{ ...event, allDay: true, confirmed: true }])
    expect(calendar).toContain('DTSTART;VALUE=DATE:20111230\r\nDTEND;VALUE=DATE:20111231')
  })
  it('blocks an all-day end date beyond the four-digit ICS year', () => {
    const [event] = extractCandidates('Deadline 9999-12-31')
    expect(isValidEvent({ ...event, allDay: true })).toBe(false)
    expect(() => createCalendar([{ ...event, allDay: true, confirmed: true }])).toThrow()
  })
})
if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York') {
  it('rejects a timed event when UTC conversion crosses into year 10000', () => {
    const [event] = extractCandidates('Meeting 9999-12-31 23:00')
    expect(isValidEvent(event)).toBe(false)
    expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
  })
}


describe('calendar text and timestamp validation', () => {
  it.each(['Hidden\u0000control', 'Bad\u001bescape', 'Delete\u007f', 'Unpaired\ud800'])('rejects a title that cannot be represented safely: %s', title => {
    const [event] = extractCandidates('Meeting 2027-05-20 10:00')
    expect(isValidEvent({ ...event, title })).toBe(false)
    expect(() => createCalendar([{ ...event, title, confirmed: true }])).toThrow()
  })
  it('preserves valid Unicode, tabs, and escaped newlines across folded lines', () => {
    const [event] = extractCandidates('Meeting 2027-05-20 10:00')
    const title = 'Họp 📅;\t' + 'Đ'.repeat(80) + '\nChi tiết, \\ notes'
    const output = createCalendar([{ ...event, title, confirmed: true }])
    expect(output.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true)
    const component = new ICAL.Component(ICAL.parse(output)).getFirstSubcomponent('vevent')
    expect(component.getFirstPropertyValue('summary')).toBe(title)
  })
  it('rejects an invalid timestamp and an ignored all-day end date', () => {
    const [event] = extractCandidates('Deadline 2027-05-20')
    expect(() => createCalendar([{ ...event, allDay: true, confirmed: true }], new Date(NaN))).toThrow('timestamp')
    expect(isValidEvent({ ...event, allDay: true, endDate: '2027-05-22' })).toBe(false)
  })
})
