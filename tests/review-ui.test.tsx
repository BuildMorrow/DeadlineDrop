// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/app/App'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('event review interaction', () => {
  it('moves focus to confirmation after resolving a time range', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
    render(<App />)
    fireEvent.change(screen.getByLabelText('YOUR MESSAGE'), { target: { value: 'Workshop 2027-05-20 10:00-11:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    const confirm = screen.getByRole('button', { name: 'Confirm event 1' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    const resolution = screen.getByRole('group', { name: 'Resolve time ambiguity' })
    fireEvent.click(within(resolution).getByRole('button', { name: 'Use as a time range' }))
    await waitFor(() => expect(document.activeElement).toBe(confirm))
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.change(screen.getByLabelText('EVENT TITLE'), { target: { value: 'Updated workshop' } })
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
