// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import axe from 'axe-core'
import App from '../src/app/App'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('event review interaction', () => {
  it('has no automated accessibility violations in the initial and ambiguous review states', async () => {
    const { container } = render(<App />)
    const options = { rules: { 'color-contrast': { enabled: false } } }
    expect((await axe.run(container, options)).violations).toEqual([])
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'Workshop 2027-05-20 10:00-11:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    expect((await axe.run(container, options)).violations).toEqual([])
  })

  it('requires a reference date and clears confirmed events if it changes', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'Submit tomorrow at 5 pm' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    expect(screen.getByRole('alert').textContent).toContain('Choose a reference date')
    fireEvent.change(screen.getByLabelText('REFERENCE DATE FOR RELATIVE DATES'), { target: { value: '2027-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    expect((screen.getByLabelText('DATE') as HTMLInputElement).value).toBe('2028-01-01')
    expect(screen.getByText(/Relative date based on 2027-12-31/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.change(screen.getByLabelText('REFERENCE DATE FOR RELATIVE DATES'), { target: { value: '2028-01-01' } })
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByLabelText('DATE')).toBeNull()
  })

  it('clears a confirmed relative event when the reference timezone changes', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'Submit tomorrow at 5 pm' } })
    fireEvent.change(screen.getByLabelText('REFERENCE DATE FOR RELATIVE DATES'), { target: { value: '2027-05-20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
    const zone = screen.getByLabelText('REFERENCE TIME ZONE') as HTMLInputElement
    fireEvent.change(zone, { target: { value: zone.value === 'UTC' ? 'Asia/Bangkok' : 'UTC' } })
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByLabelText('DATE')).toBeNull()
  })

  it('rejects an invalid reference timezone and blocks an ambiguous weekday', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'Meet next Monday at 09:00' } })
    fireEvent.change(screen.getByLabelText('REFERENCE DATE FOR RELATIVE DATES'), { target: { value: '2027-11-07' } })
    fireEvent.change(screen.getByLabelText('REFERENCE TIME ZONE'), { target: { value: 'Not/A_Zone' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    expect(screen.getByRole('alert').textContent).toContain('valid IANA')
    fireEvent.change(screen.getByLabelText('REFERENCE TIME ZONE'), { target: { value: 'UTC' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    expect((screen.getByLabelText('DATE') as HTMLInputElement).value).toBe('')
    expect((screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it.runIf(Intl.DateTimeFormat().resolvedOptions().timeZone !== 'America/New_York')('requires selecting a source-zone DST occurrence before confirmation', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'Tomorrow at 01:30' } })
    fireEvent.change(screen.getByLabelText('REFERENCE DATE FOR RELATIVE DATES'), { target: { value: '2027-11-06' } })
    fireEvent.change(screen.getByLabelText('REFERENCE TIME ZONE'), { target: { value: 'America/New_York' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    expect((screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('SOURCE TIME') as HTMLInputElement).disabled).toBe(true)
    expect(screen.queryByText(/^Start:/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Second occurrence (UTC-05:00)' }))
    expect((screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('allows correcting an ambiguous weekday as an all-day event', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'Submit next Monday' } })
    fireEvent.change(screen.getByLabelText('REFERENCE DATE FOR RELATIVE DATES'), { target: { value: '2027-05-20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.change(screen.getByLabelText('DATE'), { target: { value: '2027-05-24' } })
    fireEvent.click(screen.getByLabelText('All-day event'))
    fireEvent.click(screen.getByRole('button', { name: 'Apply corrected all-day date' }))
    expect((screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('moves focus to confirmation after resolving a time range', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
    render(<App />)
    expect(screen.getByText(/Calendar apps may add a duration when no end time is provided/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'Workshop 2027-05-20 10:00-11:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    const confirm = screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    const resolution = screen.getByRole('group', { name: 'Resolve time ambiguity' })
    fireEvent.click(within(resolution).getByRole('button', { name: 'Use as a time range' }))
    await waitFor(() => expect(document.activeElement).toBe(confirm))
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    expect(document.activeElement).toBe(confirm)
    expect(confirm.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(confirm)
    expect(screen.getByText('1 confirmed event')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.change(screen.getByLabelText('EVENT TITLE'), { target: { value: 'Updated workshop' } })
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
