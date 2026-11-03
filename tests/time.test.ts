import { describe, expect, it } from 'vitest'
import { extractCandidates } from '../src/features/extraction/extract'
import { createCalendar, isValidEvent } from '../src/features/calendar/ics'
import { convertOffset, fields, localOptions } from '../src/features/calendar/time'

describe('time zone and range safety', () => {
  it('converts explicit UTC to Bangkok and preserves the instant', () => {
    const z = convertOffset('2027-05-20', '14:30', '+00:00', 'Asia/Bangkok')
    expect(fields(z)).toMatchObject({ date: '2027-05-20', time: '21:30' })
    expect(z.offset).toBe('+07:00')
    expect(z.toInstant().toString()).toBe('2027-05-20T14:30:00Z')
    expect(fields(convertOffset('2027-05-20', '23:30', '+00:00', 'Asia/Bangkok')).date).toBe('2027-05-21')
  })
  it('parses explicit offsets into the same instant and ICS', () => {
    for (const input of ['2027-05-20 14:30 UTC', '2027-05-20 14:30 GMT', '2027-05-20 21:30 +07:00', '2027-05-20 09:30 UTC-05:00']) {
      const [event] = extractCandidates(input)
      expect(event.sourceZone).not.toBe(''); expect(isValidEvent(event)).toBe(true)
      expect(createCalendar([{ ...event, confirmed: true }])).toContain('DTSTART:20270520T143000Z')
    }
  })
  it('blocks unsupported zones until explicitly corrected', () => {
    const [event] = extractCandidates('2027-05-20 14:30 EST')
    expect(event.needsResolution).toBe(true)
    expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
    expect(isValidEvent({ ...event, needsResolution: false })).toBe(true)
  })
  it('preserves a time range and requires correction for overnight ranges', () => {
    const [event] = extractCandidates('2027-05-20 10:00-11:00')
    expect(event.endTime).toBe('11:00'); expect(event.endDate).toBe('2027-05-20')
    expect(isValidEvent(event)).toBe(false)
    expect(createCalendar([{ ...event, needsResolution: false, confirmed: true }])).toContain('DTEND:')
    const [overnight] = extractCandidates('2027-05-20 23:00-01:00')
    expect(isValidEvent(overnight)).toBe(false)
    expect(isValidEvent({ ...overnight, needsResolution: false, endDate: '2027-05-21' })).toBe(true)
  })
  it('distinguishes repeated and nonexistent New York times', () => {
    const repeated = localOptions('2027-11-07', '01:30', 'America/New_York')
    expect(repeated.map(x => x.offset)).toEqual(['-04:00', '-05:00'])
    expect(localOptions('2027-03-14', '02:30', 'America/New_York')).toHaveLength(0)
    expect(localOptions('2027-11-07', '01:30', 'UTC')).toHaveLength(1)
    expect(localOptions('2027-11-07', '01:30', 'Asia/Bangkok')).toHaveLength(1)
  })
})

if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York') {
  it('blocks repeated local time until an occurrence is chosen and exports the chosen instant', () => {
    const [event] = extractCandidates('Meeting 2027-11-07 01:30')
    expect(isValidEvent(event)).toBe(false)
    expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
    expect(createCalendar([{ ...event, choice: 'earlier', confirmed: true }])).toContain('DTSTART:20271107T053000Z')
    expect(createCalendar([{ ...event, choice: 'later', confirmed: true }])).toContain('DTSTART:20271107T063000Z')
    const [missing] = extractCandidates('Meeting 2027-03-14 02:30')
    expect(isValidEvent(missing)).toBe(false)
  })
}
