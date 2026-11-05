import { describe, expect, it } from 'vitest'
import { extractCandidates } from '../src/features/extraction/extract'
import { createCalendar, isValidEvent } from '../src/features/calendar/ics'
import { convertOffset, fields, localOptions } from '../src/features/calendar/time'
import { resolveManual, resolveOffset, resolveRange } from '../src/features/calendar/resolution'

describe('time zone and range safety', () => {
  it('converts explicit UTC to Bangkok and preserves the instant', () => {
    const z = convertOffset('2027-05-20', '14:30', '+00:00', 'Asia/Bangkok')
    expect(fields(z)).toMatchObject({ date: '2027-05-20', time: '21:30' })
    expect(z.offset).toBe('+07:00')
    expect(z.toInstant().toString()).toBe('2027-05-20T14:30:00Z')
    expect(fields(convertOffset('2027-05-20', '23:30', '+00:00', 'Asia/Bangkok')).date).toBe('2027-05-21')
  })
  it('parses ISO UTC timestamps with and without seconds', () => {
    for (const input of ['2027-05-20T14:30Z', '2027-05-20T14:30:00Z']) {
      const [event] = extractCandidates(input)
      expect(isValidEvent(event)).toBe(true)
      expect(createCalendar([{ ...event, confirmed: true }])).toContain('DTSTART:20270520T143000Z')
    }
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
    expect(resolveManual(event).needsResolution).toBe(true)
    expect(resolveManual({ ...event, editedDate: true }).needsResolution).toBe(true)
    expect(resolveManual({ ...event, editedDate: true, editedTime: true }).needsResolution).toBe(false)
  })
  it('preserves a time range and requires correction for overnight ranges', () => {
    const [event] = extractCandidates('2027-05-20 10:00-11:00')
    expect(event.endTime).toBe('11:00'); expect(event.endDate).toBe('2027-05-20')
    expect(isValidEvent(event)).toBe(false)
    expect(createCalendar([{ ...resolveRange(event), confirmed: true }])).toContain('DTEND:')
    const [overnight] = extractCandidates('2027-05-20 23:00-01:00')
    expect(isValidEvent(overnight)).toBe(false)
    expect(resolveRange(overnight).needsResolution).toBe(true)
    expect(isValidEvent(resolveRange({ ...overnight, endDate: '2027-05-21' }))).toBe(true)
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


describe('source timezone resolution', () => {
  it('resolves ISO offset and prefixed offset to the same instant', () => {
    for (const text of ['2027-05-20T14:30:00-05:00', '2027-05-20T14:30-05:00', '2027-05-20 14:30 UTC-05:00']) {
      const [event] = extractCandidates(text)
      expect(event.sourceZone).toContain('-05:00')
      expect(createCalendar([{ ...event, confirmed: true }])).toContain('DTSTART:20270520T193000Z')
    }
  })
  it('blocks a bare negative offset until the user selects an interpretation', () => {
    const [event] = extractCandidates('2027-05-20 14:30-05:00')
    expect(event.resolutionKind).toBe('offset-or-range')
    expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
    const resolved = resolveOffset(event)
    expect(createCalendar([{ ...resolved, confirmed: true }])).toContain('DTSTART:20270520T193000Z')
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Bangkok') expect([resolved.date, resolved.time]).toEqual(['2027-05-21', '02:30'])
    expect(resolveRange(event).needsResolution).toBe(true)
  })
  it('recognizes zones before the time and flags unsupported zones', () => {
    const [event] = extractCandidates('Meeting at 14:30 on 2027-05-20 (GMT+7)')
    expect(createCalendar([{ ...event, confirmed: true }])).toContain('DTSTART:20270520T073000Z')
    for (const text of ['PST meeting 2027-05-20 14:30', '2027-05-20 14:30 America/New_York', '2027-05-20 14:30 XYZ']) {
      const [unknown] = extractCandidates(text)
      expect(unknown.needsResolution).toBe(true)
      expect(resolveManual(unknown).needsResolution).toBe(true)
      expect(() => createCalendar([{ ...unknown, confirmed: true }])).toThrow()
    }
  })
})

it('blocks multiple unrelated times and unsupported seconds', () => {
  for (const text of ['Meeting 2027-05-20 10:00 and 11:00', 'Meeting 2027-05-20 10:00:45']) {
    const [event] = extractCandidates(text)
    expect(event.needsResolution).toBe(true)
    expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
  }
})


it('blocks malformed timezone offsets rather than interpreting a prefix', () => {
  for (const input of ['2027-05-20 14:30 UTC+7:3', '2027-05-20 14:30 GMT+', '2027-05-20T14:30-0500']) {
    const [event] = extractCandidates(input)
    expect(event.needsResolution, input).toBe(true)
    expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
  }
})
