import { describe, expect, it } from 'vitest'
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
})
