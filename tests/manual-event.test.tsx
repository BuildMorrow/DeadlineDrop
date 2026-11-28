// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ICAL from 'ical.js'
import App from '../src/app/App'
import { newManualEvent } from '../src/features/review/manualEvent'
import { createCalendar, isValidEvent } from '../src/features/calendar/ics'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('manual calendar events', () => {
  it('starts empty and cannot export without explicit details and confirmation', () => {
    const event = newManualEvent('manual-test')
    expect(event).toMatchObject({ title: '', date: '', time: '', allDay: false, confirmed: false, source: '', manual: true })
    expect(isValidEvent(event)).toBe(false)
    expect(() => createCalendar([event])).toThrow()
    expect(() => createCalendar([{ ...event, title: 'Deadline', date: '2027-05-20', allDay: true }])).toThrow()
    const ics = createCalendar([{ ...event, title: 'Deadline', date: '2027-05-20', allDay: true, confirmed: true }])
    const calendar = new ICAL.Component(ICAL.parse(ics)).getFirstSubcomponent('vevent')
    expect(calendar.getFirstPropertyValue('dtstart')?.toString()).toBe('2027-05-20')
  })
  it('lets a user create an all-day event without a source message', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add event' }))
    const title = screen.getByLabelText('EVENT TITLE') as HTMLInputElement
    expect(document.activeElement).toBe(title)
    expect(title.value).toBe('')
    expect(screen.getByText('Manually added: enter and check every detail.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(title, { target: { value: 'Submit application' } })
    fireEvent.change(screen.getByLabelText('DATE'), { target: { value: '2027-05-20' } })
    expect((screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'All-day event' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Add event' }))
    expect(screen.getByRole('button', { name: 'Confirmed event 1' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Confirm event 2' }) as HTMLButtonElement).disabled).toBe(true)
    expect(document.activeElement).toBe(within(screen.getByRole('article', { name: 'Event 2' })).getByLabelText('EVENT TITLE'))
  })
  it('validates an explicit timed range and protects its end time from accidental removal', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add event' }))
    fireEvent.change(screen.getByLabelText('EVENT TITLE'), { target: { value: 'Workshop' } })
    fireEvent.change(screen.getByLabelText('DATE'), { target: { value: '2027-05-20' } })
    fireEvent.change(screen.getByLabelText('TIME'), { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Add end date and time' }))
    expect((screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('END DATE'), { target: { value: '2027-05-20' } })
    fireEvent.change(screen.getByLabelText('END TIME'), { target: { value: '09:00' } })
    expect((screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('END TIME'), { target: { value: '11:00' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Add end date and time' }))
    expect(confirm).toHaveBeenCalledOnce()
    expect((screen.getByLabelText('END TIME') as HTMLInputElement).value).toBe('11:00')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('preserves a manual event when editing the message or finding dates is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    const source = screen.getByLabelText('YOUR MESSAGE') as HTMLTextAreaElement
    fireEvent.change(source, { target: { value: 'Meeting 2027-05-20 10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add event' }))
    const manual = screen.getByText('Manually added: enter and check every detail.').closest('article')!
    fireEvent.change(within(manual).getByLabelText('EVENT TITLE'), { target: { value: 'My event' } })
    fireEvent.change(source, { target: { value: 'Changed message' } })
    expect(source.value).toBe('Meeting 2027-05-20 10:00')
    expect((within(manual).getByLabelText('EVENT TITLE') as HTMLInputElement).value).toBe('My event')
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    expect((within(manual).getByLabelText('EVENT TITLE') as HTMLInputElement).value).toBe('My event')
    fireEvent.click(screen.getByText('Relative date settings'))
    fireEvent.change(screen.getByLabelText('REFERENCE DATE FOR RELATIVE DATES'), { target: { value: '2027-05-20' } })
    expect((screen.getByLabelText('REFERENCE DATE FOR RELATIVE DATES') as HTMLInputElement).value).toBe('')
    expect((within(manual).getByLabelText('EVENT TITLE') as HTMLInputElement).value).toBe('My event')
  })
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York') {
    it('requires a DST occurrence choice for a manual event', () => {
      const event = { ...newManualEvent('manual'), title: 'Meeting', date: '2027-11-07', time: '01:30' }
      expect(isValidEvent(event)).toBe(false)
      const first = createCalendar([{ ...event, choice: 'earlier', confirmed: true }])
      const second = createCalendar([{ ...event, choice: 'later', confirmed: true }])
      expect(first).toContain('DTSTART:20271107T053000Z')
      expect(second).toContain('DTSTART:20271107T063000Z')
      expect(isValidEvent({ ...event, date: '2027-03-14', time: '02:30' })).toBe(false)
    })
  }
})
