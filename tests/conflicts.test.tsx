// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import { extractCandidates, type Candidate } from '../src/features/extraction/extract'
import { findConflicts } from '../src/features/review/conflicts'

afterEach(cleanup)
function timed(title: string, date: string, start: string, endDate = '', end = ''): Candidate {
  const [base] = extractCandidates(`${title} ${date} ${start}`)
  return { ...base, title, date, time: start, needsResolution: false, resolutionKind: '', rangeRequired: Boolean(end), endDate, endTime: end }
}
describe('possible event conflicts', () => {
  it('finds duplicates by normalized title and start without inventing an end', () => {
    const first = timed('  Team  Meeting ', '2027-05-20', '10:00')
    const second = { ...first, id: '1', title: 'team meeting' }
    const report = findConflicts([first, second])
    expect(report.withoutEnd).toBe(2)
    expect(report.pairs).toEqual([{ first: 0, second: 1, duplicate: true, overlap: false }])
  })
  it('compares actual ranges and excludes adjacent and unspecified durations', () => {
    const events = [
      timed('A', '2027-05-20', '10:00', '2027-05-20', '11:00'),
      timed('B', '2027-05-20', '10:30', '2027-05-20', '11:30'),
      timed('C', '2027-05-20', '11:30', '2027-05-20', '12:30'),
      timed('D', '2027-05-20', '10:45'),
    ]
    const report = findConflicts(events)
    expect(report.pairs).toEqual([{ first: 0, second: 1, duplicate: false, overlap: true }])
    expect(report.withoutEnd).toBe(1)
  })
  it('handles cross-midnight ranges, all-day duplicates and unresolved events', () => {
    const allDay = { ...timed('Deadline', '2027-05-20', '10:00'), allDay: true, time: '', id: 'a' }
    const invalid = { ...timed('Unclear', '2027-05-20', '10:00'), needsResolution: true, id: 'bad' }
    const report = findConflicts([
      timed('Overnight', '2027-05-20', '23:00', '2027-05-21', '01:00'),
      timed('Later', '2027-05-21', '00:30', '2027-05-21', '02:00'),
      allDay, { ...allDay, id: 'b' }, invalid,
    ])
    expect(report.pairs).toEqual([{ first: 0, second: 1, duplicate: false, overlap: true }, { first: 2, second: 3, duplicate: true, overlap: false }])
    expect(report.unresolved).toBe(1)
  })
  it('limits results explicitly for large inputs', () => {
    const base = { ...timed('Same', '2027-05-20', '10:00'), allDay: true, time: '' }
    const report = findConflicts(Array.from({ length: 21 }, (_, index) => ({ ...base, id: String(index) })))
    expect(report.pairs).toHaveLength(100)
    expect(report.limited).toBe(true)
  })
  it('reports that candidates beyond the processing limit were not compared', () => {
    const base = { ...timed('Deadline', '2027-05-20', '10:00'), allDay: true, time: '' }
    const report = findConflicts(Array.from({ length: 501 }, (_, index) => ({ ...base, title: `Item ${index}`, id: String(index) })))
    expect(report.pairs).toHaveLength(0)
    expect(report.limited).toBe(true)
  })
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York') {
    it('distinguishes the two DST occurrences by actual instant', () => {
      const first = { ...timed('Meeting', '2027-11-07', '01:30'), choice: 'earlier' as const }
      const second = { ...first, id: '1', choice: 'later' as const }
      expect(findConflicts([first, second]).pairs).toEqual([])
      expect(findConflicts([first, { ...second, choice: 'earlier' }]).pairs[0].duplicate).toBe(true)
      const gap = timed('Spring', '2027-03-14', '02:30')
      expect(findConflicts([gap]).unresolved).toBe(1)
    })
  }
})
describe('conflict review interaction', () => {
  it('navigates to a duplicate without changing confirmation or export', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'Meeting 2027-05-20 10:00\nMeeting 2027-05-20 10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    fireEvent.click(screen.getByText('Possible duplicates or overlaps (1)'))
    const panel = screen.getByText('Possible duplicates or overlaps (1)').closest('details')!
    expect(within(panel).getByText('Possible duplicate')).toBeTruthy()
    expect(within(panel).getByText(/2 timed events have no end time/)).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Review event 2' }))
    expect(document.activeElement?.id).toBe('event-heading-1')
    expect(screen.getByRole('button', { name: 'Confirmed event 1' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
