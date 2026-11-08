import { describe, expect, it, vi } from 'vitest'
import { extractCandidates } from '../src/features/extraction/extract'
import { createCalendar } from '../src/features/calendar/ics'

describe('explicit date extraction regression corpus', () => {
  it.each([
    ['Nộp bài 25 tháng 5 năm 2027 lúc 14 giờ 30', '2027-05-25', '14:30'],
    ['Thi 31/12/2027 08:00', '2027-12-31', '08:00'],
    ['Interview May 25, 2027 at 2:15 pm', '2027-05-25', '14:15'],
    ['Deadline 2028-02-29', '2028-02-29', ''],
    ['Meeting 05/25/2027 09:00', '2027-05-25', '09:00'],
  ])('recognizes supported explicit dates: %s', (input, date, time) => {
    const [event] = extractCandidates(input)
    expect(event.date).toBe(date)
    expect(event.time).toBe(time)
    expect(event.source).toBe(input)
    expect(event.confirmed).toBe(false)
  })

  it.each([
    ['Due 03/04/2027', 'Ambiguous'],
    ['Deadline 25/05', 'Year missing'],
    ['Nộp bài 25 tháng 5', 'Year missing'],
    ['Exam 2027-02-29', 'Invalid date'],
    ['Meeting May 32, 2027', 'Invalid date'],
  ])('does not invent an unresolved date: %s', (input, warning) => {
    const [event] = extractCandidates(input)
    expect(event.date).toBe('')
    expect(event.warnings.join(' ')).toContain(warning)
    expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
  })

  it('keeps distinct source lines and never confirms candidates automatically', () => {
    const events = extractCandidates('Submit 2027-05-20 10:00\nNộp bài 25 tháng 5 năm 2027')
    expect(events).toHaveLength(2)
    expect(events.map(event => event.date)).toEqual(['2027-05-20', '2027-05-25'])
    expect(events.every(event => !event.confirmed)).toBe(true)
    expect(() => createCalendar(events)).toThrow()
  })

  it.each(['Submit the report by Friday at 5 PM.', 'Thi cuối kỳ lúc 8h sáng thứ Hai tuần sau.'])(
    'does not invent a date for unsupported relative input: %s', input => {
      expect(extractCandidates(input)).toEqual([])
    },
  )

  it.each([
    ['Please submit the report on 2027-05-20 at 10:00 and attend the interview on 2027-05-21 at 14:00.', ['2027-05-20', '2027-05-21']],
    ['Nộp bài ngày 25 tháng 5 năm 2027 lúc 14:30 và thi ngày 26 tháng 5 năm 2027 lúc 08:00.', ['2027-05-25', '2027-05-26']],
  ])('requires manual resolution for multiple dates in one paragraph: %s', (input, dates) => {
    const events = extractCandidates(input)
    expect(events.map(event => event.date)).toEqual(dates)
    for (const event of events) {
      expect(event.needsResolution).toBe(true)
      expect(event.time).toBe('')
      expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
    }
  })

  it.each([
    ['Submit the report tomorrow at 5 pm.', '2027-12-31T12:00:00Z'],
    ['Nộp bài ngày mai lúc 14:30.', '2028-02-28T12:00:00Z'],
    ['Meet next Monday at 09:00.', '2027-11-07T05:30:00Z'],
    ['Họp thứ Hai tuần sau lúc 9 giờ.', '2027-11-07T06:30:00Z'],
  ])('does not infer a relative date from the system clock: %s', (input, reference) => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(reference))
      expect(extractCandidates(input)).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })
})


describe('relative dates with an explicit reference', () => {
  it.each([
    ['Submit tomorrow at 5 pm', '2027-12-31', '2028-01-01', '17:00'],
    ['Nộp bài ngày mai lúc 14:30', '2028-02-28', '2028-02-29', '14:30'],
    ['Họp hôm nay lúc 9 giờ', '2027-01-01', '2027-01-01', '09:00'],
    ['Meeting today 10:30', '2027-05-20', '2027-05-20', '10:30'],
    ['Submit in 3 days at 5 pm', '2027-12-30', '2028-01-02', '17:00'],
    ['Nộp bài sau 2 ngày lúc 14:30', '2028-02-27', '2028-02-29', '14:30'],
  ])('uses the chosen date for %s', (input, reference, date, time) => {
    const [event] = extractCandidates(input, reference)
    expect(event.date).toBe(date); expect(event.time).toBe(time)
    expect(event.source).toBe(input); expect(event.warnings.join()).toContain(reference)
    expect(() => createCalendar([event])).toThrow()
  })
  it.each(['not tomorrow at 10:00', 'tomorrow and today at 10:00', 'day after tomorrow at 10:00', 'tomorrow 2027-05-20 10:00', 'tomorrow at 10:00 UTC', 'tomorrow at 5 pm or 6 pm', 'tomorrow at 5 pm, 6 pm', 'Meet next Monday at 09:00', 'Họp thứ Hai tuần sau lúc 9 giờ', 'Meet next week 10:00', 'Họp tuần sau lúc 10:00', 'Meet in 3 weeks at 10:00', 'in 999999999999999999999 days at 10:00'])('blocks unclear relative input: %s', input => {
    const events = extractCandidates(input, '2027-05-01')
    expect(events.length).toBeGreaterThan(0)
    expect(events.every(e => e.needsResolution && !e.date)).toBe(true)
    expect(() => createCalendar(events.map(e => ({ ...e, confirmed: true })))).toThrow()
  })
  it('blocks a relative date outside the supported calendar range', () => {
    const [event] = extractCandidates('Tomorrow at 10:00', '9999-12-31')
    expect(event.date).toBe('')
    expect(event.needsResolution).toBe(true)
    expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
  })
  it('rejects invalid and missing reference dates', () => {
    expect(extractCandidates('Tomorrow at 10:00', '2027-02-30')).toEqual([])
    expect(extractCandidates('Tomorrow at 10:00')).toEqual([])
  })
})


describe('relative dates at daylight-saving transitions', () => {
  it.runIf(Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York')('requires resolution for a repeated time and rejects a missing time', () => {
    const [overlap] = extractCandidates('Tomorrow at 01:30', '2027-11-06')
    expect(overlap.date).toBe('2027-11-07')
    expect(() => createCalendar([{ ...overlap, confirmed: true }])).toThrow()
    const [gap] = extractCandidates('Tomorrow at 02:30', '2027-03-13')
    expect(gap.date).toBe('2027-03-14')
    expect(() => createCalendar([{ ...gap, confirmed: true }])).toThrow()
  })
})


describe('multiple dated sentences', () => {
  it('extracts independently dated English and Vietnamese sentences with a warning', () => {
    const events = extractCandidates('Submit 2027-05-20 at 10:00. Thi 25 tháng 5 năm 2027 lúc 14:30.')
    expect(events.map(e => [e.date, e.time])).toEqual([['2027-05-20', '10:00'], ['2027-05-25', '14:30']])
    expect(events.every(e => e.warnings.some(w => w.includes('paragraph')) && !e.confirmed)).toBe(true)
  })
  it.each(['From 2027-05-20. Until 2027-05-21.', 'Meeting 2027-05-20. Rescheduled to 2027-05-21.'])('does not split a potentially related pair: %s', input => {
    const events = extractCandidates(input)
    expect(events).toHaveLength(2)
    expect(events.every(e => e.needsResolution)).toBe(true)
    expect(() => createCalendar(events.map(e => ({ ...e, confirmed: true })))).toThrow()
  })
})


describe('reference timezone', () => {
  it('converts a UTC relative time to the browser zone and exports the same instant', () => {
    const [event] = extractCandidates('Meeting tomorrow at 23:30', '2027-12-31', 'UTC')
    const calendar = createCalendar([{ ...event, confirmed: true }])
    expect(calendar).toContain('DTSTART:20280101T233000Z')
    expect(event.warnings.join()).toContain('UTC')
  })
  it.each([['2027-11-06', '01:30'], ['2027-03-13', '02:30']])('blocks New York DST ambiguity for %s %s', (reference, time) => {
    const [event] = extractCandidates(`Tomorrow at ${time}`, reference, 'America/New_York')
    expect(() => createCalendar([{ ...event, confirmed: true }])).toThrow()
  })
  it('rejects an invalid reference timezone', () => {
    expect(extractCandidates('Tomorrow at 10:00', '2027-05-01', 'Not/A_Zone')).toEqual([])
  })
})
