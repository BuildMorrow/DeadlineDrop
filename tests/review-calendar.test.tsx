// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import { monthGrid, stepDay, stepMonth } from '../src/features/review/monthGrid'
import { ReviewCalendar } from '../src/features/review/ReviewCalendar'
import { groupOverview } from '../src/features/review/overview'
import { extractCandidates } from '../src/features/extraction/extract'

afterEach(cleanup)
describe('month calendar', () => {
  it('constructs a Monday-first grid and handles leap years', () => {
    const leap = monthGrid('2028-02')
    expect(leap.length % 7).toBe(0)
    expect(leap).toContain('2028-02-29')
    expect(monthGrid('2027-02')).not.toContain('2027-02-29')
    expect(monthGrid('2027-02')[0]).toBe('2027-02-01')
    expect(stepMonth('2027-12', 1)).toBe('2028-01')
    expect(stepMonth('1000-01', -1)).toBeNull()
    expect(stepMonth('9999-12', 1)).toBeNull()
    expect(stepDay('2028-02-28', 1)).toBe('2028-02-29')
    expect(stepDay('1000-01-01', -1)).toBeNull()
  })
  it('does not assign unresolved dates to a calendar day', async () => {
    const events = extractCandidates('Unknown 03/04/2027')
    render(<ReviewCalendar groups={groupOverview(events, 'all', '')} language="en" onJump={vi.fn()} />)
    fireEvent.click(screen.getByText('Calendar view'))
    expect(await screen.findByText('1 matching event has an unresolved date and is not placed on the calendar.')).toBeTruthy()
    expect(screen.getByText('No resolved dates to show.')).toBeTruthy()
  })
  it('browses months and focuses the selected event without altering confirmation', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'First 2027-05-20 10:00\nSecond 2027-06-03 11:00\nUnknown 03/04/2027' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    fireEvent.click(screen.getByText('Event overview'))
    fireEvent.click(screen.getByText('Calendar view'))
    const date = await screen.findByRole('button', { name: '2027-05-20: 1 event' })
    expect(date.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('1 matching event has an unresolved date and is not placed on the calendar.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('button', { name: '2027-06-03: 1 event' })).toBeTruthy()
    const selection = screen.getByRole('region', { name: 'Events on 2027-06-03' })
    fireEvent.click(within(selection).getByRole('button', { name: 'Review event 2' }))
    expect(document.activeElement?.id).toBe('event-heading-1')
    expect(screen.getByRole('button', { name: 'Confirmed event 1' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('reflects the existing review filter rather than hiding confirmed exports', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'First 2027-05-20 10:00\nSecond 2027-05-21 11:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    fireEvent.click(screen.getByText('Event overview'))
    fireEvent.change(screen.getByLabelText('REVIEW STATUS'), { target: { value: 'ready' } })
    fireEvent.click(screen.getByText('Calendar view'))
    await screen.findByRole('button', { name: '2027-05-21: 1 event' })
    expect(screen.getByRole('button', { name: '2027-05-20: 0 events' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('moves keyboard focus across month boundaries with one calendar tab stop', async () => {
    const events = extractCandidates('Deadline 2028-02-29 10:00')
    render(<ReviewCalendar groups={groupOverview(events, 'all', '')} language="en" onJump={vi.fn()} />)
    fireEvent.click(screen.getByText('Calendar view'))
    const leapDay = await screen.findByRole('button', { name: '2028-02-29: 1 event' })
    expect(leapDay.tabIndex).toBe(0)
    expect(screen.getByRole('button', { name: '2028-02-28: 0 events' }).tabIndex).toBe(-1)
    leapDay.focus()
    fireEvent.keyDown(leapDay, { key: 'ArrowRight' })
    const next = screen.getByRole('button', { name: '2028-03-01: 0 events' })
    expect(document.activeElement).toBe(next)
    expect(next.tabIndex).toBe(0)
    expect(screen.getByText('No matching events on this day.')).toBeTruthy()
    fireEvent.keyDown(next, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '2028-02-29: 1 event' }))
  })
})
