// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import { extractCandidates } from '../src/features/extraction/extract'
import { groupOverview } from '../src/features/review/overview'

afterEach(cleanup)
describe('event overview grouping', () => {
  it('sorts valid local dates and keeps ambiguous or invalid dates separate', () => {
    const events = extractCandidates('Later 2027-05-23\nEarlier 2027-05-20\nAmbiguous 03/04/2027')
    const groups = groupOverview(events, 'all', '')
    expect(groups.map(group => group.date)).toEqual(['2027-05-20', '2027-05-23', null])
    expect(groups[0].items[0].index).toBe(1)
    expect(groups[2].items[0].status).toBe('action')
  })
  it('does not place unresolved source time zones on the local date timeline', () => {
    const [event] = extractCandidates('Meeting 2027-05-20 14:30 PST')
    const groups = groupOverview([event], 'all', '')
    expect(event.needsResolution).toBe(true)
    expect(groups[0].date).toBeNull()
    expect(groups[0].items[0].status).toBe('action')
  })
  it('filters review states without treating invalid confirmed data as exportable', () => {
    const [base] = extractCandidates('Deadline 2027-05-20')
    const ready = { ...base, allDay: true }
    const confirmed = { ...ready, id: '1', confirmed: true }
    const invalid = { ...confirmed, id: '2', date: '2027-02-29' }
    expect(groupOverview([ready, confirmed, invalid], 'ready', '')[0].items).toHaveLength(1)
    expect(groupOverview([ready, confirmed, invalid], 'confirmed', '')[0].items).toHaveLength(1)
    expect(groupOverview([ready, confirmed, invalid], 'action', '')[0].items[0].event.id).toBe('2')
    expect(groupOverview([ready], 'all', 'not found')).toEqual([])
  })
})

describe('event overview interaction', () => {
  it('filters and jumps to the existing event without changing confirmation or export', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'First 2027-05-20 10:00\nSecond 2027-05-21 11:00\nAmbiguous 03/04/2027' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    fireEvent.click(screen.getByText('Event overview'))
    const overview = screen.getByText('Event overview').closest('details')!
    fireEvent.change(within(overview).getByLabelText('REVIEW STATUS'), { target: { value: 'action' } })
    expect(within(overview).getByText('1 of 3 shown')).toBeTruthy()
    expect(within(overview).getByRole('button', { name: 'Review event 3' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirmed event 1' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.change(within(overview).getByLabelText('REVIEW STATUS'), { target: { value: 'all' } })
    fireEvent.change(within(overview).getByLabelText('SEARCH TITLES'), { target: { value: 'second' } })
    expect(within(overview).getByText('1 of 3 shown')).toBeTruthy()
    fireEvent.click(within(overview).getByRole('button', { name: 'Review event 2' }))
    expect(document.activeElement?.id).toBe('event-heading-1')
  })
})
